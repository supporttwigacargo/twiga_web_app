-- Audited shipment corrections: preserve tracking, items, payments and journal
-- history. Apply after 20260912090000 and before publishing the new client.
set lock_timeout = '5s';
set statement_timeout = '120s';

-- Keep the stored measurement as precise as the USD rate calculation.
alter table public.shipments alter column weight_kg type numeric(14,6),
  alter column volume_cbm type numeric(14,6);

create table if not exists public.shipment_invoice_corrections (
  request_id uuid primary key,
  shipment_id text references public.shipments(id) on delete set null,
  tracking_number text not null,
  revision integer not null,
  reason text not null check (btrim(reason) <> ''),
  actor_id uuid not null,
  actor_name text not null,
  request_payload jsonb not null,
  before_snapshot jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists shipment_invoice_corrections_shipment_idx
  on public.shipment_invoice_corrections(shipment_id, revision desc);
alter table public.shipment_invoice_corrections enable row level security;
revoke all on public.shipment_invoice_corrections from public, anon, authenticated;
grant select on public.shipment_invoice_corrections to authenticated;
drop policy if exists "managers read invoice corrections" on public.shipment_invoice_corrections;
create policy "managers read invoice corrections" on public.shipment_invoice_corrections
  for select to authenticated using (exists (
    select 1 from public.staff_profiles where id = auth.uid()
      and active and not must_change_password and role in ('Admin', 'Manager')
  ));

-- Extend the existing snapshot guard to cover the legacy money aliases too.
create or replace function public.guard_invoice_correction_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.invoice_finalized_at is not null
    and coalesce(current_setting('app.invoice_amend_authorized', true), 'false') <> 'true'
    and (
      new.currency is distinct from old.currency or
      new.base_rate is distinct from old.base_rate or
      new.shipping_rate is distinct from old.shipping_rate or
      new.other_charges is distinct from old.other_charges or
      new.discount is distinct from old.discount or
      new.discount_reason is distinct from old.discount_reason or
      new.total_amount is distinct from old.total_amount or
      new.invoice_revision is distinct from old.invoice_revision or
      new.invoice_amended_at is distinct from old.invoice_amended_at or
      new.invoice_amended_by is distinct from old.invoice_amended_by or
      new.invoice_amendment_reason is distinct from old.invoice_amendment_reason
    ) then
    raise exception 'Use Edit Shipment to correct a finalized invoice with a reason.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_invoice_correction_fields() from public, anon, authenticated;
drop trigger if exists trg_guard_invoice_correction_fields on public.shipments;
create trigger trg_guard_invoice_correction_fields before update on public.shipments
  for each row execute function public.guard_invoice_correction_fields();

-- Only descriptions can change on finalized items, inside the correction RPC.
-- IDs, QR tokens, quantities and packing allocations remain stable.
create or replace function public.guard_finalized_shipment_items()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_shipment_id text; v_allocated numeric(14,3) := 0;
begin
  v_shipment_id := case when tg_op = 'DELETE' then old.shipment_id else new.shipment_id end;
  if exists (select 1 from public.shipments where id = v_shipment_id and invoice_finalized_at is not null) then
    if tg_op = 'UPDATE'
      and coalesce(current_setting('app.shipment_correction_authorized', true), 'false') = 'true'
      and (to_jsonb(new) - 'description' - 'updated_at') = (to_jsonb(old) - 'description' - 'updated_at') then
      return new;
    end if;
    raise exception 'Cargo items on a finalized invoice are immutable.';
  end if;
  if tg_op = 'DELETE' and exists (select 1 from public.packing_list_items where shipment_item_id = old.id) then
    raise exception 'This item is already used in a Packing List and cannot be deleted.';
  end if;
  if tg_op = 'UPDATE' and new.quantity <> old.quantity then
    select coalesce(sum(allocation.quantity), 0) into v_allocated
    from public.packing_list_items allocation join public.packing_lists list on list.id = allocation.packing_list_id
    where allocation.shipment_item_id = old.id and list.status in ('Draft','Closed','Dispatched');
    if new.quantity < v_allocated then raise exception 'Quantity cannot be reduced below the quantity already allocated to Packing Lists.'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.guard_finalized_shipment_items() from public, anon, authenticated;

create or replace function public.correct_shipment_invoice(
  p_shipment_id text, p_changes jsonb, p_reason text,
  p_expected_revision integer, p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_name text;
  v_role text;
  v_profile jsonb;
  v_before public.shipments%rowtype;
  v_after public.shipments%rowtype;
  v_existing public.shipment_invoice_corrections%rowtype;
  v_payload jsonb;
  v_before_json jsonb;
  v_result jsonb;
  v_currency text;
  v_measurement numeric(14,6);
  v_rate numeric(14,6);
  v_fx numeric(18,6);
  v_fx_date date;
  v_usd numeric(18,2);
  v_freight numeric(18,2);
  v_other numeric(18,2);
  v_discount numeric(18,2);
  v_net numeric(18,2);
  v_paid numeric(18,2);
  v_billable numeric(18,2);
  v_old_entry uuid;
  v_entry public.journal_entries%rowtype;
  v_item jsonb;
  v_item_count integer;
  v_flag text := coalesce(current_setting('app.invoice_amend_authorized', true), 'false');
  v_item_flag text := coalesce(current_setting('app.shipment_correction_authorized', true), 'false');
begin
  select profile.name, profile.role, to_jsonb(profile) into v_actor_name, v_role, v_profile from public.staff_profiles profile
    where profile.id = v_actor and profile.active and not profile.must_change_password;
  if v_actor_name is null or v_role not in ('Admin', 'Manager') then
    raise exception 'Correcting a shipment invoice requires an active Manager or Admin session.';
  end if;
  if v_role <> 'Admin' and v_profile->>'permissions_mode' = 'CUSTOM' and not (
    coalesce(v_profile->'permissions', '[]'::jsonb) ? 'shipments.edit' and
    coalesce(v_profile->'permissions', '[]'::jsonb) ? 'invoices.edit'
  ) then raise exception 'Shipment and invoice editing permissions are required.'; end if;
  if p_request_id is null or nullif(btrim(p_reason), '') is null then
    raise exception 'A request ID and correction reason are required.';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'object' then raise exception 'Correction details are required.'; end if;
  v_payload := jsonb_build_object('changes', p_changes, 'reason', btrim(p_reason), 'expectedRevision', p_expected_revision);

  -- Serialize retries as well as payment/extra-charge writes on this shipment.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_before from public.shipments where id = p_shipment_id for update;
  if v_before.id is null then raise exception 'Shipment not found.'; end if;
  select * into v_existing from public.shipment_invoice_corrections where request_id = p_request_id;
  if v_existing.request_id is not null then
    if v_existing.shipment_id is distinct from p_shipment_id or v_existing.request_payload <> v_payload then
      raise exception 'This request ID was already used for a different correction.';
    end if;
    return v_existing.result;
  end if;
  if v_before.voided_at is not null then raise exception 'A voided shipment cannot be corrected.'; end if;
  if v_before.invoice_finalized_at is null then raise exception 'Only a finalized invoice can be corrected.'; end if;
  if p_expected_revision is distinct from v_before.invoice_revision then
    raise exception 'The invoice changed while you were editing. Refresh and reopen Edit Shipment.';
  end if;

  if exists (select 1 from jsonb_object_keys(p_changes) as key where key not in (
    'customerName','customerPhone','customerEmail','origin','destination','destinationCity',
    'description','notes','measurement','rateUsd','currency','exchangeRate','exchangeRateDate',
    'otherCharges','discount','discountReason','items'
  )) then raise exception 'Unsupported shipment correction field.'; end if;
  if nullif(btrim(p_changes->>'customerName'), '') is null
    or nullif(btrim(p_changes->>'origin'), '') is null
    or nullif(btrim(p_changes->>'destination'), '') is null
    or nullif(btrim(p_changes->>'destinationCity'), '') is null
    or nullif(btrim(p_changes->>'description'), '') is null then
    raise exception 'Customer name, route, destination city and cargo description are required.';
  end if;
  v_currency := p_changes->>'currency';
  if v_currency is null or v_currency not in ('USD','TZS','AED') then raise exception 'Invalid invoice currency.'; end if;
  v_measurement := (p_changes->>'measurement')::numeric;
  v_rate := (p_changes->>'rateUsd')::numeric;
  v_other := round((p_changes->>'otherCharges')::numeric, 2);
  v_discount := round((p_changes->>'discount')::numeric, 2);
  v_fx := case when v_currency = 'USD' then 1 else (p_changes->>'exchangeRate')::numeric end;
  v_fx_date := nullif(p_changes->>'exchangeRateDate', '')::date;
  if v_measurement is null or v_rate is null or v_fx is null or v_other is null or v_discount is null
    or v_measurement::text in ('NaN','Infinity','-Infinity') or v_rate::text in ('NaN','Infinity','-Infinity')
    or v_fx::text in ('NaN','Infinity','-Infinity') or v_other::text in ('NaN','Infinity','-Infinity')
    or v_discount::text in ('NaN','Infinity','-Infinity')
    or v_measurement <= 0 or v_rate <= 0 or v_fx <= 0 or v_other < 0 or v_discount < 0 then
    raise exception 'Enter finite positive weight/CBM, rate and exchange rate, and nonnegative charges and discount.';
  end if;
  if v_currency <> 'USD' and (v_fx_date is null or v_fx_date > current_date) then
    raise exception 'A valid exchange rate date is required.';
  end if;
  if v_discount > 0 and nullif(btrim(p_changes->>'discountReason'), '') is null then
    raise exception 'A discount reason is required.';
  end if;
  v_usd := round(v_measurement * v_rate, 2);
  v_freight := round(v_usd * v_fx, case when v_currency = 'TZS' then 0 else 2 end);
  v_net := round(v_freight + v_other - v_discount, 2);
  if v_net <= 0 then raise exception 'The invoice after discount must be greater than zero.'; end if;

  if v_currency is distinct from coalesce(v_before.invoice_currency, v_before.currency) and (
    exists (select 1 from public.payment_records where shipment_id = p_shipment_id and status = 'POSTED') or
    exists (select 1 from public.cargo_extra_charges where shipment_id = p_shipment_id and status = 'ACTIVE') or
    exists (select 1 from public.expenses where shipment_id = p_shipment_id and status = 'POSTED')
  ) then raise exception 'Currency cannot change while posted payments, active cargo charges or posted shipment expenses exist.'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payment_records
    where shipment_id = p_shipment_id and status = 'POSTED';
  if v_paid > 0 and v_fx is distinct from (case v_before.invoice_currency
    when 'USD' then 1 when 'TZS' then v_before.usd_to_tzs_rate_used when 'AED' then v_before.usd_to_aed_rate_used end) then
    raise exception 'The exchange rate cannot change while posted payments exist.';
  end if;
  select coalesce(sum(amount), 0) into v_billable from public.cargo_extra_charges
    where shipment_id = p_shipment_id and status = 'ACTIVE' and charge_direction = 'billable_to_customer';
  if v_paid > v_net + v_billable + 0.01 then raise exception 'The corrected Total Due cannot be less than payments already posted.'; end if;

  if jsonb_typeof(p_changes->'items') is distinct from 'array' then raise exception 'Cargo item descriptions are required.'; end if;
  perform 1 from public.shipment_items where shipment_id = p_shipment_id for update;
  select count(*) into v_item_count from public.shipment_items where shipment_id = p_shipment_id;
  if jsonb_array_length(p_changes->'items') <> v_item_count
    or (select count(distinct item->>'id') from jsonb_array_elements(p_changes->'items') item) <> v_item_count then
    raise exception 'Cargo items changed. Refresh before correcting this shipment.';
  end if;
  for v_item in select * from jsonb_array_elements(p_changes->'items') loop
    if nullif(btrim(v_item->>'description'), '') is null or not exists (
      select 1 from public.shipment_items where id::text = v_item->>'id' and shipment_id = p_shipment_id
    ) then raise exception 'Every cargo item must belong to this shipment and have a description.'; end if;
  end loop;
  v_before_json := to_jsonb(v_before) || jsonb_build_object('shipment_items', (
    select coalesce(jsonb_agg(to_jsonb(item) order by sort_order), '[]'::jsonb)
    from public.shipment_items item where shipment_id = p_shipment_id
  ));

  -- Find a missing invoice link without issuing duplicate revenue.
  select id into v_old_entry from public.journal_entries
    where reference_type = 'INVOICE' and reference_id = p_shipment_id and status = 'POSTED'
    order by created_at desc limit 1;
  if (select count(*) from public.journal_entries where reference_type = 'INVOICE'
    and reference_id = p_shipment_id and status = 'POSTED') > 1 then
    raise exception 'Multiple posted invoice journals exist. Resolve the ledger before correcting this invoice.';
  end if;
  perform set_config('app.invoice_amend_authorized', 'true', true);
  perform set_config('app.shipment_correction_authorized', 'true', true);
  update public.shipments set
    customer_name_snapshot = btrim(p_changes->>'customerName'),
    customer_phone_snapshot = btrim(p_changes->>'customerPhone'),
    customer_email_snapshot = btrim(p_changes->>'customerEmail'),
    origin = btrim(p_changes->>'origin'), destination = btrim(p_changes->>'destination'),
    destination_city = btrim(p_changes->>'destinationCity'), description = btrim(p_changes->>'description'),
    notes = nullif(btrim(p_changes->>'notes'), ''),
    weight_kg = case when shipment_type = 'Air Cargo' then v_measurement else weight_kg end,
    volume_cbm = case when shipment_type = 'Sea Cargo' then v_measurement else volume_cbm end,
    pricing_unit = case when shipment_type = 'Air Cargo' then 'KG' else 'CBM' end,
    applied_rate_usd = v_rate,
    rate_overridden = v_rate is distinct from standard_rate_usd,
    override_reason = case when v_rate is distinct from standard_rate_usd then btrim(p_reason) else null end,
    overridden_by = case when v_rate is distinct from standard_rate_usd then v_actor else null end,
    override_timestamp = case when v_rate is distinct from standard_rate_usd then now() else null end,
    shipping_rate = 'USD ' || v_rate::text || ' / ' || case when shipment_type = 'Air Cargo' then 'KG' else 'CBM' end,
    base_currency = 'USD', base_amount_usd = v_usd, base_rate = v_freight,
    other_charges = v_other, discount = v_discount, discount_reason = nullif(btrim(p_changes->>'discountReason'), ''),
    currency = v_currency, invoice_currency = v_currency, total_amount = v_net, invoice_amount = v_net,
    usd_to_tzs_rate_used = case when v_currency = 'TZS' then v_fx else usd_to_tzs_rate_used end,
    usd_to_aed_rate_used = case when v_currency = 'AED' then v_fx else usd_to_aed_rate_used end,
    selected_exchange_rate = v_fx, exchange_rate_date = coalesce(v_fx_date, exchange_rate_date),
    amount_paid = v_paid, accounting_journal_entry_id = null,
    invoice_revision = invoice_revision + 1, invoice_amended_at = now(), invoice_amended_by = v_actor,
    invoice_amendment_reason = btrim(p_reason), updated_at = now()::text
  where id = p_shipment_id;
  for v_item in select * from jsonb_array_elements(p_changes->'items') loop
    update public.shipment_items set description = btrim(v_item->>'description'), updated_at = now()
      where id::text = v_item->>'id' and shipment_id = p_shipment_id;
  end loop;
  if v_old_entry is not null then
    perform public.void_accounting_entry(v_old_entry, 'Shipment invoice correction: ' || btrim(p_reason));
  end if;
  v_entry := public.post_invoice_accounting(p_shipment_id);
  if v_entry.id is null or v_entry.status <> 'POSTED' then raise exception 'The corrected invoice could not be posted.'; end if;
  perform set_config('app.invoice_amend_authorized', v_flag, true);
  perform set_config('app.shipment_correction_authorized', v_item_flag, true);
  select * into v_after from public.shipments where id = p_shipment_id;
  v_result := jsonb_build_object('requestId', p_request_id, 'shipment', to_jsonb(v_after) || jsonb_build_object(
    'shipment_items', (select coalesce(jsonb_agg(to_jsonb(item) order by sort_order), '[]'::jsonb) from public.shipment_items item where shipment_id = p_shipment_id),
    'shipment_status_history', (select coalesce(jsonb_agg(to_jsonb(event) order by changed_at), '[]'::jsonb) from public.shipment_status_history event where shipment_id = p_shipment_id)
  ));
  insert into public.shipment_invoice_corrections
    (request_id, shipment_id, tracking_number, revision, reason, actor_id, actor_name, request_payload, before_snapshot, result)
  values (p_request_id, p_shipment_id, v_before.tracking_number, v_after.invoice_revision,
    btrim(p_reason), v_actor, v_actor_name, v_payload, v_before_json, v_result);
  insert into public.business_audit_log (action, entity_type, entity_id, actor_id, actor_name, details)
  values ('SHIPMENT_INVOICE_CORRECTED', 'shipment', p_shipment_id, v_actor, v_actor_name,
    jsonb_build_object('requestId', p_request_id, 'revision', v_after.invoice_revision, 'reason', btrim(p_reason),
      'previousCurrency', v_before.invoice_currency, 'currency', v_currency,
      'previousInvoiceAmount', v_before.invoice_amount, 'invoiceAmount', v_net,
      'voidedJournalEntryId', v_old_entry, 'journalEntryId', v_entry.id));
  return v_result;
end;
$$;
revoke all on function public.correct_shipment_invoice(text, jsonb, text, integer, uuid) from public, anon;
grant execute on function public.correct_shipment_invoice(text, jsonb, text, integer, uuid) to authenticated;

insert into supabase_migrations.schema_migrations(version, name)
values ('20261029090000', 'shipment_invoice_corrections') on conflict (version) do nothing;

