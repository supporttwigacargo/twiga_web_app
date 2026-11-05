# Correct shipments and reprint invoices

An active Admin or Manager can open a finalized shipment, choose **Edit Shipment**,
correct the customer snapshot, route, cargo/item descriptions, kg/CBM, USD rate or
freight amount, other charges, discount and invoice currency, then choose
**Save changes** or **Save & Print Invoice**. A correction reason is mandatory.
Managers with custom permissions also need `shipments.edit` and `invoices.edit`.

The total is calculated on the server from measurement × USD rate, converted with
the saved exchange rate, plus other charges, less discount. Changing currency
loads a configured exchange rate and converts the existing other charges and
discount through USD. Managers can correct the rate/date before saving. A missing
exchange rate blocks conversion. Invoice amounts include the discount once.

The tracking number and invoice number stay the same. Each correction increments
the invoice revision, records the actor/reason and before/after snapshots, reverses
the previous invoice journal, and posts its replacement in one transaction. The
PDF includes the revision and revised date, with a distinct `-rN.pdf` filename.
Item identities, quantities, QR codes, allocations and payment records are retained.
Customer snapshot edits apply to this shipment, not the shared customer directory.

Currency changes are refused while posted payments, active cargo extra charges or
posted linked expenses exist. Use the existing refund/void/correction process to
resolve those records first. Same-currency corrections may retain payments, but
cannot reduce total due below the amount paid and retain the existing payment
exchange rate. Voided and unfinalized shipments
cannot use this correction flow. Adding/removing items or changing quantities is
outside this editor.

## Release order

1. Apply `supabase/migrations/20261029090000_shipment_invoice_corrections.sql`
   after the existing migration ledger and invoice-repair migrations.
2. Deploy the client only after the RPC and correction-history table exist.
3. Verify an authorized test shipment, its replacement journal and revision PDF.

The migration is additive, widens kg/CBM precision to six decimal places, and
records its version in `supabase_migrations.schema_migrations`. It does not rewrite
existing shipment amounts. A retry with the same request ID returns its prior
result. Reusing a key with different data or saving a stale revision is rejected.

## Local verification

```sh
pnpm install --frozen-lockfile
npm run typecheck
npm test
npm run test:db:corrections
npm run build
```

The database test runs the repository migrations and RPCs on isolated PostgreSQL
via the development-only PGlite dependency. Its helper creates local equivalents
of Supabase's auth/storage schemas and roles. It does not use production URLs,
credentials or data. It verifies conversion, payment/charge/expense safeguards,
permissions, immutable snapshots, idempotency, stale revisions, full rollback,
item identity preservation and balanced journals. A real Supabase release still
requires migration application and an authenticated acceptance check.

