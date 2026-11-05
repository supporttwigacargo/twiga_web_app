-- Server-side shipment and invoice numbering plus an idempotent, atomic
-- create_shipment() RPC.
--
-- Why: CreateShipment.tsx built the invoice number in the browser as
-- 'INV-' || <tracking preview>, but the preview ignored the company tracking
-- prefix while the saved tracking number used it. With an empty prefix every
-- shipment of a day got invoice INV-TWIGA-YYMMDD-0001, so the second shipment
-- of the day hit shipments_invoice_number_idx. Both numbers were also derived
-- from the browser's cached list (MAX + 1), which is unsafe across devices.
--
-- What this adds (additive only — no existing row, number, index or
-- constraint is changed or removed):
--   * shipment_number_counters: one row per (prefix, day); incremented with
--     INSERT .. ON CONFLICT DO UPDATE, which row-locks the counter until the
--     transaction commits, so concurrent creations can never get the same
--     number.
--   * allocate_shipment_numbers(): TWIGA-YYMMDD-NNNN tracking number and
--     INV-<tracking> invoice number (the established formats). It skips any
--     candidate already used as a tracking OR invoice number, so legacy rows
--     such as tracking '-261029-0001' / invoice 'INV-TWIGA-261029-0001'
--     cannot collide.
--   * shipment_create_requests: request-ID ledger so a retry or double click
--     returns the shipment already created instead of creating another.
--   * create_shipment(): shipment, cargo items, invoice finalisation and
--     accounting posting in ONE transaction. Any failure rolls everything
--     back, so no half-created shipment can hold a number.
--
-- Rollback: see supabase/SHIPMENT_NUMBERING_ROLLOUT.md (drops only the
-- objects created here; shipments created through the RPC stay intact).
-- Safe to run more than once.

set lock_timeout = '5s';
set statement_timeout = '120s';

-- ---------------------------------------------------------------------------
-- 1. Counters
-- ---------------------------------------------------------------------------
create table if not exists public.shipment_number_counters (
  prefix text not null check (btrim(prefix) <> ''),
  number_date text not null check (number_date ~ '^[0-9]{6}$'),
  last_value integer not null check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (prefix, number_date)
);
alter table public.shipment_number_counters enable row level security;
revoke all on public.shipment_number_counters from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Idempotency ledger
-- ---------------------------------------------------------------------------
create table if not exists public.shipment_create_requests (
  request_id uuid primary key,
  shipment_id text references public.shipments (id) on delete set null,
  tracking_number text not null,
  invoice_number text not null,
  actor_id uuid,
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists shipment_create_requests_shipment_idx
  on public.shipment_create_requests (shipment_id);
alter table public.shipment_create_requests enable row level security;
revoke all on public.shipment_create_requests from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Number allocation
-- ---------------------------------------------------------------------------
create or replace function public.allocate_shipment_numbers(
  out tracking_number text,
  out invoice_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_day text := to_char(now() at time zone 'Asia/Dubai', 'YYMMDD');
  v_stem text;
  v_seed integer;
  v_next integer;
  v_attempts integer := 0;
begin
  -- tracking_prefix exists only on some databases, so read it dynamically.
  -- A blank prefix falls back to the brand code instead of '-YYMMDD-NNNN'.
  select nullif(btrim(to_jsonb(settings) ->> 'tracking_prefix'), '')
  into v_prefix
  from public.company_settings as settings
  where settings.id = 'default';
  v_prefix := upper(coalesce(v_prefix, 'TWIGA'));
  v_stem := v_prefix || '-' || v_day || '-';

  -- Seed a new day's counter from numbers already stored (tracking or invoice)
  -- so the first allocation never reuses an existing suffix.
  select coalesce(max(suffix::integer), 0)
  into v_seed
  from (
    select substring(shipment.tracking_number from length(v_stem) + 1) as suffix
    from public.shipments as shipment
    where left(shipment.tracking_number, length(v_stem)) = v_stem
    union all
    select substring(shipment.invoice_number from length(v_stem) + 5)
    from public.shipments as shipment
    where left(shipment.invoice_number, length(v_stem) + 4) = 'INV-' || v_stem
  ) as used
  where suffix ~ '^[0-9]{1,9}$';

  loop
    insert into public.shipment_number_counters as counter (prefix, number_date, last_value)
    values (v_prefix, v_day, v_seed + 1)
    on conflict (prefix, number_date)
    do update set last_value = counter.last_value + 1, updated_at = now()
    returning counter.last_value into v_next;

    tracking_number := v_stem || lpad(v_next::text, 4, '0');
    invoice_number := 'INV-' || tracking_number;
    exit when not exists (
      select 1 from public.shipments as shipment
      where shipment.tracking_number = allocate_shipment_numbers.tracking_number
         or shipment.invoice_number = allocate_shipment_numbers.invoice_number
    );
    v_attempts := v_attempts + 1;
    if v_attempts >= 10000 then
      raise exception 'Could not allocate a free shipment number for %.', v_stem;
    end if;
  end loop;
end;
$$;
revoke all on function public.allocate_shipment_numbers() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Atomic, idempotent shipment creation
-- ---------------------------------------------------------------------------
create or replace function public.create_shipment(
  p_request_id uuid,
  p_shipment jsonb,
  p_items jsonb,
  p_finalize_invoice boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_name text;
  v_actor_email text;
  v_payload jsonb;
  v_existing public.shipment_create_requests%rowtype;
  v_numbers record;
  v_id text;
  v_now timestamptz := now();
  v_today text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_created_by text;
  v_item jsonb;
  v_index integer := 0;
  v_entry public.journal_entries%rowtype;
  v_result jsonb;
begin
  select profile.name, profile.email into v_actor_name, v_actor_email
  from public.staff_profiles as profile
  where profile.id = v_actor and profile.active and not profile.must_change_password;
  if v_actor_name is null then
    raise exception 'An active staff session is required to create a shipment.';
  end if;
  if p_request_id is null then
    raise exception 'A request ID is required to create a shipment.';
  end if;
  if jsonb_typeof(p_shipment) is distinct from 'object' then
    raise exception 'Shipment details are required.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one cargo item.';
  end if;
  v_payload := jsonb_build_object('shipment', p_shipment, 'items', p_items, 'finalize', coalesce(p_finalize_invoice, true));

  -- Two clicks / a retry with the same request ID wait here for each other.
  perform pg_advisory_xact_lock(hashtextextended('create_shipment:' || p_request_id::text, 0));
  select * into v_existing from public.shipment_create_requests where request_id = p_request_id;
  if v_existing.request_id is not null then
    if v_existing.request_payload <> v_payload then
      raise exception 'This request was already used to create shipment %. Refresh before creating another shipment.', v_existing.tracking_number;
    end if;
    if v_existing.shipment_id is null then
      raise exception 'Shipment % from this request was later deleted.', v_existing.tracking_number;
    end if;
    select to_jsonb(shipment) || jsonb_build_object(
      'shipment_items', (select coalesce(jsonb_agg(to_jsonb(item) order by item.sort_order), '[]'::jsonb)
        from public.shipment_items as item where item.shipment_id = shipment.id),
      'shipment_status_history', (select coalesce(jsonb_agg(to_jsonb(event) order by event.changed_at), '[]'::jsonb)
        from public.shipment_status_history as event where event.shipment_id = shipment.id)
    ) into v_result
    from public.shipments as shipment where shipment.id = v_existing.shipment_id;
    return jsonb_build_object('requestId', p_request_id, 'replayed', true, 'shipment', v_result);
  end if;

  select * into v_numbers from public.allocate_shipment_numbers();
  v_id := (floor(extract(epoch from clock_timestamp()) * 1000))::bigint::text
    || '-' || substr(md5(gen_random_uuid()::text), 1, 7);
  v_created_by := coalesce(nullif(btrim(p_shipment ->> 'createdBy'), ''), v_actor_email, v_actor_name);

  insert into public.shipments (
    id, tracking_number, status, shipment_type, cargo_category, service_type,
    customer_id, origin, destination, destination_city, description,
    weight_kg, volume_cbm, pcs, shipping_rate, base_rate, other_charges, discount,
    total_amount, amount_paid, currency,
    customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    pricing_unit, standard_rate_usd, applied_rate_usd, rate_overridden, override_reason,
    overridden_by, override_timestamp, base_currency, base_amount_usd,
    usd_to_tzs_rate_used, usd_to_aed_rate_used, selected_exchange_rate, exchange_rate_date,
    invoice_currency, invoice_amount, invoice_number, invoice_finalized_at,
    packing_list_id, is_on_hold, notes, status_history, created_by, created_at, updated_at
  ) values (
    v_id, v_numbers.tracking_number,
    coalesce(nullif(p_shipment ->> 'status', ''), 'RECEIVED'),
    p_shipment ->> 'shipmentType',
    coalesce(nullif(p_shipment ->> 'cargoCategory', ''), 'General Cargo'),
    coalesce(nullif(p_shipment ->> 'serviceType', ''), p_shipment ->> 'shipmentType'),
    nullif(p_shipment ->> 'customerId', ''),
    p_shipment ->> 'origin', p_shipment ->> 'destination', p_shipment ->> 'destinationCity',
    coalesce(p_shipment ->> 'description', ''),
    coalesce((p_shipment ->> 'weightKg')::numeric, 0),
    coalesce((p_shipment ->> 'volumeCbm')::numeric, 0),
    coalesce((p_shipment ->> 'pcs')::integer, 0),
    coalesce(p_shipment ->> 'shippingRate', ''),
    coalesce((p_shipment ->> 'baseRate')::numeric, 0),
    coalesce((p_shipment ->> 'otherCharges')::numeric, 0),
    coalesce((p_shipment ->> 'discount')::numeric, 0),
    coalesce((p_shipment ->> 'totalAmount')::numeric, 0),
    0,
    p_shipment ->> 'currency',
    nullif(p_shipment ->> 'customerNameSnapshot', ''),
    nullif(p_shipment ->> 'customerPhoneSnapshot', ''),
    nullif(p_shipment ->> 'customerEmailSnapshot', ''),
    nullif(p_shipment ->> 'pricingUnit', ''),
    (p_shipment ->> 'standardRateUsd')::numeric,
    (p_shipment ->> 'appliedRateUsd')::numeric,
    coalesce((p_shipment ->> 'rateOverridden')::boolean, false),
    nullif(btrim(p_shipment ->> 'overrideReason'), ''),
    case when coalesce((p_shipment ->> 'rateOverridden')::boolean, false) then v_actor end,
    case when coalesce((p_shipment ->> 'rateOverridden')::boolean, false) then v_now end,
    'USD',
    (p_shipment ->> 'baseAmountUsd')::numeric,
    (p_shipment ->> 'usdToTzsRateUsed')::numeric,
    (p_shipment ->> 'usdToAedRateUsed')::numeric,
    (p_shipment ->> 'selectedExchangeRate')::numeric,
    nullif(p_shipment ->> 'exchangeRateDate', '')::date,
    nullif(p_shipment ->> 'invoiceCurrency', ''),
    (p_shipment ->> 'invoiceAmount')::numeric,
    v_numbers.invoice_number,
    null,
    nullif(p_shipment ->> 'packingListId', ''),
    coalesce((p_shipment ->> 'isOnHold')::boolean, false),
    nullif(p_shipment ->> 'notes', ''),
    jsonb_build_array(jsonb_build_object(
      'status', coalesce(nullif(p_shipment ->> 'status', ''), 'RECEIVED'),
      'location', p_shipment ->> 'origin',
      'timestamp', to_char(v_now at time zone 'Asia/Dubai', 'YYYY-MM-DD HH24:MI'),
      'staff', v_created_by,
      'note', 'Shipment created.',
      'isPublic', true
    )),
    v_created_by, v_today, v_today
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index := v_index + 1;
    if nullif(btrim(v_item ->> 'description'), '') is null or coalesce((v_item ->> 'quantity')::numeric, 0) <= 0 then
      raise exception 'Every cargo item needs a description and quantity greater than zero.';
    end if;
    insert into public.shipment_items (shipment_id, item_number, description, quantity, unit, sort_order)
    values (
      v_id,
      coalesce((v_item ->> 'itemNumber')::integer, v_index),
      btrim(v_item ->> 'description'),
      (v_item ->> 'quantity')::numeric,
      coalesce(nullif(v_item ->> 'unit', ''), 'PCS'),
      coalesce((v_item ->> 'sortOrder')::integer, v_index - 1)
    );
  end loop;

  if coalesce(p_finalize_invoice, true) then
    update public.shipments set invoice_finalized_at = v_now where id = v_id;
    v_entry := public.post_invoice_accounting(v_id);
    if v_entry.id is null or v_entry.status <> 'POSTED' then
      raise exception 'The invoice could not be posted to accounting.';
    end if;
  end if;

  insert into public.shipment_create_requests (
    request_id, shipment_id, tracking_number, invoice_number, actor_id, request_payload
  ) values (
    p_request_id, v_id, v_numbers.tracking_number, v_numbers.invoice_number, v_actor, v_payload
  );

  select to_jsonb(shipment) || jsonb_build_object(
    'shipment_items', (select coalesce(jsonb_agg(to_jsonb(item) order by item.sort_order), '[]'::jsonb)
      from public.shipment_items as item where item.shipment_id = shipment.id),
    'shipment_status_history', (select coalesce(jsonb_agg(to_jsonb(event) order by event.changed_at), '[]'::jsonb)
      from public.shipment_status_history as event where event.shipment_id = shipment.id)
  ) into v_result
  from public.shipments as shipment where shipment.id = v_id;
  return jsonb_build_object('requestId', p_request_id, 'replayed', false, 'shipment', v_result);
end;
$$;
revoke all on function public.create_shipment(uuid, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.create_shipment(uuid, jsonb, jsonb, boolean) to authenticated;

insert into supabase_migrations.schema_migrations (version, name)
values ('20261029120000', 'server_side_shipment_numbering') on conflict (version) do nothing;
