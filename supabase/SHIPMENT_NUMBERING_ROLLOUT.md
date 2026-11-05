# Server-side shipment & invoice numbering — rollout

Fixes `duplicate key value violates unique constraint "shipments_invoice_number_idx"`
when creating a shipment.

## Root cause

`CreateShipment.tsx` built the invoice number in the browser as
`INV-${previewTracking}`, where `previewTracking` came from
`nextTrackingNumber()` **without** the company tracking prefix (so always
`TWIGA-…`). The tracking number saved by `useAppStore.addShipment` used
`settings.trackingPrefix`, which is empty in Production. Since then tracking
numbers look like `-261029-0001`, and the invoice counter (which counts only
`TWIGA-` numbers) is always `0001`. The second shipment of any day therefore
reused `INV-TWIGA-<day>-0001`. Both numbers were also computed from the
browser's cached shipment list (MAX + 1), which is unsafe across devices, and
the shipment, items, finalisation and accounting were separate requests.

## The fix

* `20261029120000_server_side_shipment_numbering.sql` adds
  `create_shipment(request_id, shipment, items, finalize)`: one transaction that
  allocates the numbers (row-locked per-day counter), inserts the shipment and
  items, finalises the invoice and posts accounting. Any error rolls back
  everything. The same `request_id` (double click / retry) returns the shipment
  already created.
* Formats are unchanged: `TWIGA-YYMMDD-NNNN` (day in Asia/Dubai) and
  `INV-<tracking number>`. A blank `tracking_prefix` falls back to `TWIGA`.
  Numbers already used as a tracking **or** invoice number are skipped.
* Existing shipments, numbers, indexes and constraints are not modified.

## 1. Read-only pre-checks (SQL Editor)

```sql
-- Must return 0 rows (no existing duplicates).
select invoice_number, count(*) from public.shipments
where invoice_number is not null group by 1 having count(*) > 1;

-- Current prefix (blank / NULL → TWIGA is used).
select to_jsonb(s) ->> 'tracking_prefix' as tracking_prefix
from public.company_settings s where id = 'default';

-- Today's numbers, for comparison after rollout.
select tracking_number, invoice_number from public.shipments
where created_at >= to_char(now() - interval '2 days', 'YYYY-MM-DD') order by created_at;

-- Prerequisite migration is applied.
select version from supabase_migrations.schema_migrations where version = '20261029090000';
```

## 2. Apply

Paste `migrations/20261029120000_server_side_shipment_numbering.sql` into the
SQL Editor and run it **before** deploying the matching app build (the new app
calls `create_shipment`; the old app keeps working after the migration because
nothing it uses was changed).

## 3. Verify

```sql
select version from supabase_migrations.schema_migrations where version = '20261029120000';
select proname from pg_proc where proname in ('create_shipment', 'allocate_shipment_numbers');
```

Then deploy the app, create two shipments on the same day and confirm both get
consecutive `TWIGA-…` / `INV-TWIGA-…` numbers.

## Local tests

```bash
pnpm test                 # unit tests (incl. error messages)
pnpm test:db:numbering    # all migrations + numbering/idempotency checks in PGlite
pnpm test:db:corrections  # existing invoice-correction checks still pass
```

## Rollback

Deploy the previous app build first, then:

```sql
begin;
drop function if exists public.create_shipment(uuid, jsonb, jsonb, boolean);
drop function if exists public.allocate_shipment_numbers();
drop table if exists public.shipment_create_requests;
drop table if exists public.shipment_number_counters;
delete from supabase_migrations.schema_migrations where version = '20261029120000';
commit;
```

Shipments created through `create_shipment` are ordinary rows and remain intact.
