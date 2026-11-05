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
