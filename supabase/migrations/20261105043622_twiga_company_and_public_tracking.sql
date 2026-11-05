-- Complete company settings used by the cloned staff application.
alter table public.company_settings
 add column if not exists short_name text not null default '',
 add column if not exists logo_path text not null default '',
 add column if not exists whatsapp text not null default '',
 add column if not exists dubai_address text not null default '',
 add column if not exists dubai_phone text not null default '',
 add column if not exists dubai_email text not null default '',
 add column if not exists tanzania_address text not null default '',
 add column if not exists tanzania_phone text not null default '',
 add column if not exists tanzania_email text not null default '',
 add column if not exists registration_number text not null default '',
 add column if not exists iban text not null default '',
 add column if not exists payment_instructions text not null default '',
 add column if not exists invoice_footer text not null default '',
 add column if not exists receipt_footer text not null default '',
 add column if not exists quote_footer text not null default '',
 add column if not exists packing_list_footer text not null default '',
 add column if not exists powered_by_text text not null default '',
 add column if not exists tracking_prefix text not null default 'TWIGA',
 add column if not exists packing_list_prefix text not null default 'PL-TWIGA',
 add column if not exists primary_color text not null default '#050909',
 add column if not exists secondary_color text not null default '#BF4133',
 add column if not exists accent_color text not null default '#4B2928';

-- Signing up for Auth does not confer staff access. Admin provisioning explicitly activates staff.
alter table public.staff_profiles alter column active set default false;

-- Public customers get only the tracking contract, never operational tables.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
revoke execute on function public.handle_new_auth_user() from authenticated;
revoke execute on function public.staff_profiles_guard_self_update() from authenticated;
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;

create index if not exists shipments_tracking_number_upper_idx on public.shipments(upper(tracking_number));

-- Intentionally anonymous, read-only lookup by exact shipment number.
-- Customer names, contacts, invoices, amounts, internal notes and staff identities are excluded.
create or replace function public.track_shipment(p_tracking_number text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.shipments%rowtype;
begin
 if p_tracking_number is null or length(btrim(p_tracking_number)) not between 3 and 80 then return null; end if;
 select * into s from public.shipments where upper(tracking_number)=upper(btrim(p_tracking_number)) and voided_at is null;
 if not found then return null; end if;
 return jsonb_build_object(
  'shipmentNumber',s.tracking_number,'status',s.status,
  'statusLabel',public.shipment_status_label(s.status),'isOnHold',s.is_on_hold,
  'origin',s.origin,'destination',s.destination_city || ', ' || s.destination,
  'currentLocation',coalesce((select h.location from public.shipment_status_history h where h.shipment_id=s.id and nullif(btrim(h.location),'') is not null order by h.changed_at desc,h.id desc limit 1),s.origin),
  'lastUpdate',s.updated_at,
  'history',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
   'status',h.new_status,'label',public.shipment_status_label(h.new_status),'location',h.location,
   'time',h.changed_at,'description',h.public_note
  )) order by h.changed_at,h.id) from public.shipment_status_history h where h.shipment_id=s.id),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon,authenticated;

-- Company branding columns missing from some versions of the original template.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS short_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_prefix text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS packing_list_prefix text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dubai_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dubai_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tanzania_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tanzania_phone text NOT NULL DEFAULT '';

-- Run after all migrations in a new Twiga Star Cargo database.
INSERT INTO public.company_settings (
  id, company_name, business_type, default_currency, default_origin, default_destination_country, short_name, tracking_prefix, packing_list_prefix, primary_color, secondary_color, accent_color, address, phone, whatsapp, email, website, dubai_address, dubai_phone, tanzania_address, tanzania_phone
) VALUES (
  'default', 'Twiga Star Cargo LLC', 'International Cargo & Freight Forwarding', 'TZS', 'Dubai, UAE', 'Tanzania', 'TWIGA STAR CARGO', 'TWIGA', 'PL-TWIGA', '#050909', '#BF4133', '#4B2928', 'Avon Building, Sabkha Road, Deira, Dubai, UAE', '+971 54 285 9771', '+971 54 285 9771', 'info@twigastarcargo.com', 'https://twigastarcargo.com', 'Avon Building, Sabkha Road, Deira, Dubai, UAE', '+971 54 285 9771', 'Mwinyijuma RD House No 15, Mwananyamala, Kinondoni, Dar es Salaam', '+255 764 262 132'
) ON CONFLICT (id) DO NOTHING;

update public.company_settings set supported_destination_cities = ARRAY['Dar es Salaam','Zanzibar','Arusha','Dodoma','Mwanza','Mbeya','Morogoro','Tanga','Kigoma','Tabora','Mtwara','Iringa','Moshi','Songea','Other'] where id='default' and cardinality(supported_destination_cities)=0;
