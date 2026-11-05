import { database } from './helpers/localPostgres.mjs'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// Server-side shipment/invoice numbering and idempotent create_shipment().
// Concurrency itself (two transactions racing for the counter row) is covered
// by the counter's INSERT .. ON CONFLICT DO UPDATE row lock; PGlite is a single
// connection, so here we verify the numbering rules, atomicity and retries.
const db = await database()
const migration = path.resolve(import.meta.dirname, '../migrations/20261029120000_server_side_shipment_numbering.sql')
const admin = '11111111-1111-1111-1111-111111111111'
const staff = '33333333-3333-3333-3333-333333333333'
let checks = 0
const pass = text => { checks++; console.log('PASS:', text) }
const sql = async (query, params = []) => (await db.query(query, params)).rows
const actor = async id => sql("select set_config('request.jwt.claim.sub', $1, false)", [id])
const day = (await sql("select to_char(now() at time zone 'Asia/Dubai', 'YYMMDD') as day"))[0].day

const shipment = (changes = {}) => ({
  status: 'RECEIVED', shipmentType: 'Air Cargo', cargoCategory: 'General Cargo', serviceType: 'Air Cargo',
  customerId: '', origin: 'Dubai, UAE', destination: 'Tanzania', destinationCity: 'Dar es Salaam',
  description: 'Test cargo', weightKg: 10, volumeCbm: 0, pcs: 2, shippingRate: 'USD 12 / KG',
  baseRate: 120, otherCharges: 0, discount: 0, totalAmount: 120, currency: 'USD',
  customerNameSnapshot: 'Test Customer', customerPhoneSnapshot: '+255700000000', customerEmailSnapshot: '',
  pricingUnit: 'KG', standardRateUsd: 12, appliedRateUsd: 12, rateOverridden: false,
  baseCurrency: 'USD', baseAmountUsd: 120, selectedExchangeRate: 1, invoiceCurrency: 'USD', invoiceAmount: 120,
  notes: '', createdBy: 'tester@test.test', ...changes,
})
const items = [{ itemNumber: 1, description: 'Box of parts', quantity: 2, unit: 'BOX', sortOrder: 0 }]
const create = async (requestId = randomUUID(), body = shipment(), cargo = items) =>
  (await sql('select public.create_shipment($1::uuid, $2::jsonb, $3::jsonb) as result',
    [requestId, JSON.stringify(body), JSON.stringify(cargo)]))[0].result
const count = async () => Number((await sql('select count(*) as n from public.shipments'))[0].n)

try {
  await sql(`insert into auth.users(id,email) values($1,'admin@test.test'),($2,'staff@test.test')`, [admin, staff])
  await sql("update public.staff_profiles set role='Admin',must_change_password=false where id=$1", [admin])
  await sql("update public.staff_profiles set must_change_password=false where id=$1", [staff])

  // Production state today: empty prefix tracking number with a TWIGA invoice.
  await sql(`insert into public.shipments(id,tracking_number,status,shipment_type,cargo_category,service_type,
    origin,destination,destination_city,invoice_number,created_by,created_at,updated_at)
    values('legacy-1',$1,'RECEIVED','Air Cargo','General Cargo','Air Cargo','Dubai','Tanzania','Dar es Salaam',$2,'legacy','2026-10-29','2026-10-29')`,
  [`-${day}-0001`, `INV-TWIGA-${day}-0001`])
  await sql(`insert into public.shipments(id,tracking_number,status,shipment_type,cargo_category,service_type,
    origin,destination,destination_city,invoice_number,created_by,created_at,updated_at)
    values('legacy-2','TWIGA-260827-0001','DELIVERED','Air Cargo','General Cargo','Air Cargo','Dubai','Tanzania','Dar es Salaam','INV-TWIGA-260827-0001','legacy','2026-08-27','2026-08-27')`)
  const legacyBefore = await sql('select id,tracking_number,invoice_number from public.shipments order by id')
  await db.exec(await fs.readFile(migration, 'utf8'))
  assert.deepEqual(await sql('select id,tracking_number,invoice_number from public.shipments order by id'), legacyBefore)
  pass('migration is repeatable and leaves existing tracking and invoice numbers untouched')

  // The old browser logic gave every shipment of the day INV-TWIGA-<day>-0001.
  await assert.rejects(() => sql(`insert into public.shipments(id,tracking_number,status,shipment_type,cargo_category,service_type,
    origin,destination,destination_city,invoice_number,created_by,created_at,updated_at)
    values('old-path',$1,'RECEIVED','Air Cargo','General Cargo','Air Cargo','Dubai','Tanzania','Dar es Salaam',$2,'x','x','x')`,
  [`-${day}-0002`, `INV-TWIGA-${day}-0001`]), /shipments_invoice_number_idx/)
  pass('reproduced: the old client-built invoice number violates shipments_invoice_number_idx')

  await actor(admin)
  await db.exec('set role authenticated')
  const first = await create()
  assert.equal(first.replayed, false)
  assert.equal(first.shipment.tracking_number, `TWIGA-${day}-0002`)
  assert.equal(first.shipment.invoice_number, `INV-TWIGA-${day}-0002`)
  assert.ok(first.shipment.invoice_finalized_at)
  assert.ok(first.shipment.accounting_journal_entry_id)
  assert.equal(first.shipment.shipment_items.length, 1)
  assert.equal(first.shipment.shipment_status_history.length, 1)
  pass('create one shipment: numbers assigned on the server, skipping the legacy INV-TWIGA-<day>-0001')

  const sequential = []
  for (let i = 0; i < 3; i++) sequential.push((await create()).shipment.tracking_number)
  assert.deepEqual(sequential, [3, 4, 5].map(n => `TWIGA-${day}-000${n}`))
  pass('sequential shipments get consecutive numbers')

  const [a, b] = await Promise.all([create(), create()])
  assert.notEqual(a.shipment.invoice_number, b.shipment.invoice_number)
  pass('two simultaneous requests get different invoice numbers')

  await db.exec('reset role')
  await actor(staff)
  await db.exec('set role authenticated')
  const byStaff = await create()
  assert.equal(byStaff.shipment.tracking_number, `TWIGA-${day}-0008`)
  await assert.rejects(() => create(randomUUID(), shipment({ appliedRateUsd: 15, rateOverridden: true, overrideReason: 'x' })), /Only Admin or Manager/)
  pass('a second staff account shares the same counter; rate-override rules still apply')

  const before = await count()
  const failedKey = randomUUID()
  await assert.rejects(() => create(failedKey, shipment(), [{ itemNumber: 1, description: '', quantity: 1, unit: 'PCS', sortOrder: 0 }]), /description/)
  assert.equal(await count(), before)
  const retried = await create(failedKey, shipment(), items)
  assert.equal(retried.shipment.tracking_number, `TWIGA-${day}-0009`)
  assert.equal(await count(), before + 1)
  pass('a failed creation rolls back completely (no orphan, no number used) and can be retried safely')

  const key = randomUUID()
  const click1 = await create(key)
  const click2 = await create(key)
  assert.equal(click2.replayed, true)
  assert.equal(click2.shipment.id, click1.shipment.id)
  assert.equal(click2.shipment.invoice_number, click1.shipment.invoice_number)
  assert.equal(await count(), before + 2)
  await assert.rejects(() => create(key, shipment({ weightKg: 99 })), /already used/)
  await db.exec('reset role')
  const journals = await sql("select count(*)::int as n from public.journal_entries where reference_type='INVOICE' and reference_id=$1", [click1.shipment.id])
  assert.equal(journals[0].n, 1)
  pass('double click / network retry with the same request ID returns the same shipment and posts revenue once')

  await db.exec('reset role')
  await actor(admin)
  await db.exec('set role authenticated')
  const id = first.shipment.id
  await sql("update public.shipments set notes='Edited', updated_at='x' where id=$1", [id])
  await sql('select public.post_invoice_accounting($1)', [id])
  const item = first.shipment.shipment_items[0]
  await sql("select public.correct_shipment_invoice($1, $2::jsonb, 'Price fix', 1, gen_random_uuid())", [id, JSON.stringify({
    customerName: 'Test Customer', customerPhone: '', customerEmail: '', origin: 'Dubai, UAE', destination: 'Tanzania',
    destinationCity: 'Dar es Salaam', description: 'Test cargo', notes: 'Edited', measurement: '10', rateUsd: '14',
    currency: 'USD', exchangeRate: '1', exchangeRateDate: '', otherCharges: '0', discount: '0', discountReason: '',
    items: [{ id: item.id, description: 'Box of parts' }],
  })])
  const edited = (await sql('select tracking_number, invoice_number, invoice_revision from public.shipments where id=$1', [id]))[0]
  assert.deepEqual(edited, { tracking_number: `TWIGA-${day}-0002`, invoice_number: `INV-TWIGA-${day}-0002`, invoice_revision: 2 })
  pass('editing, re-posting and correcting an existing invoice never changes its invoice number')

  await assert.rejects(() => sql("update public.shipments set invoice_number='INV-OTHER' where id=$1", [id]), /immutable/)
  await assert.rejects(() => sql('select * from public.shipment_number_counters'), /permission denied/)
  await assert.rejects(() => sql('select public.allocate_shipment_numbers()'), /permission denied/)
  await db.exec('reset role')
  await actor('')
  await db.exec('set role anon')
  await assert.rejects(() => create(), /permission denied/)
  await db.exec('reset role')
  await sql("update public.staff_profiles set active=false where id=$1", [staff])
  await actor(staff)
  await assert.rejects(() => create(), /active staff session/)
  pass('invoice numbers stay immutable; counters are server-only; anonymous and disabled users cannot create')

  await actor(admin)
  await sql("update public.company_settings set business_type=business_type where id='default'")
  assert.deepEqual(await sql('select id,tracking_number,invoice_number from public.shipments where id in ($1,$2) order by id', ['legacy-1', 'legacy-2']), legacyBefore)
  const duplicates = await sql('select invoice_number from public.shipments where invoice_number is not null group by invoice_number having count(*) > 1')
  assert.equal(duplicates.length, 0)
  const dupTracking = await sql('select tracking_number from public.shipments group by tracking_number having count(*) > 1')
  assert.equal(dupTracking.length, 0)
  pass('existing numbers unchanged and no duplicate invoice or tracking numbers exist')

  const unbalanced = await sql('select e.id from public.journal_entries e join public.journal_lines l on l.journal_entry_id=e.id group by e.id having sum(l.debit) <> sum(l.credit)')
  assert.equal(unbalanced.length, 0)
  pass('all invoice journals balance')
  console.log(`SUCCESS: ${checks} PostgreSQL shipment numbering checks`)
} catch (error) { console.error('FAIL:', error.message, error.where || ''); process.exitCode = 1 }
finally { await db.close() }
