import { database } from './helpers/localPostgres.mjs'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const db = await database()
const admin = '11111111-1111-1111-1111-111111111111'
const manager = '22222222-2222-2222-2222-222222222222'
const staff = '33333333-3333-3333-3333-333333333333'
let checks = 0
const pass = text => { checks++; console.log('PASS:', text) }
const sql = async (query, params = []) => (await db.query(query, params)).rows
const actor = async id => sql("select set_config('request.jwt.claim.sub', $1, false)", [id])
const expectError = async (task, pattern) => { await assert.rejects(task, pattern) }
const form = (changes = {}) => ({
  customerName: 'Corrected Customer', customerPhone: '+255700000000', customerEmail: 'test@example.test',
  origin: 'Dubai', destination: 'Tanzania', destinationCity: 'Arusha', description: 'Corrected cargo', notes: 'Corrected',
  measurement: '10', rateUsd: '10', currency: 'USD', exchangeRate: '1', exchangeRateDate: '',
  otherCharges: '0', discount: '0', discountReason: '', items: [], ...changes,
})
const correct = async (id, changes, revision = 1, key = randomUUID(), reason = 'Test correction') =>
  (await sql('select public.correct_shipment_invoice($1, $2::jsonb, $3, $4, $5::uuid) as result', [id, JSON.stringify(changes), reason, revision, key]))[0].result

async function fixture(id, sea = false) {
  await sql(`insert into public.shipments(id, tracking_number, status, shipment_type, cargo_category, service_type,
    origin,destination,destination_city,description,weight_kg,volume_cbm,pcs,base_rate,total_amount,currency,
    customer_name_snapshot,standard_rate_usd,applied_rate_usd,base_currency,base_amount_usd,invoice_currency,invoice_amount,invoice_number,
    selected_exchange_rate,created_by,created_at,updated_at)
    values($1,$1,'RECEIVED',$2,'General Cargo',$2,'Dubai','Tanzania','Dar es Salaam','Original',20,2,1,200,200,'USD',
    'Original Customer',10,10,'USD',200,'USD',200,$1,1,'test',current_date::text,current_date::text)`, [id, sea ? 'Sea Cargo' : 'Air Cargo'])
  const items = await sql("insert into public.shipment_items(shipment_id,item_number,description,quantity,unit,sort_order) values($1,1,'Original item',1,'PCS',0) returning *", [id])
  await sql('update public.shipments set invoice_finalized_at=now() where id=$1', [id])
  await sql('select public.post_invoice_accounting($1)', [id])
  return items[0]
}

try {
  await sql(`insert into auth.users(id,email) values($1,'admin@test.test'),($2,'manager@test.test'),($3,'staff@test.test')`, [admin, manager, staff])
  await sql("update public.staff_profiles set role='Admin',must_change_password=false where id=$1", [admin])
  await sql("update public.staff_profiles set role='Manager',must_change_password=false where id=$1", [manager])
  await sql("update public.staff_profiles set must_change_password=false where id=$1", [staff])
  await actor(admin)

  const item = await fixture('TEST-USD')
  const changes = form({ currency: 'TZS', exchangeRate: '2500', exchangeRateDate: '2026-10-29', items: [{ id: item.id, description: 'Corrected item' }] })
  const key = randomUUID()
  const result = await correct('TEST-USD', changes, 1, key)
  assert.equal(Number(result.shipment.invoice_amount), 250000)
  assert.equal(result.shipment.invoice_currency, 'TZS')
  assert.equal(Number(result.shipment.base_amount_usd), 100)
  assert.equal(Number(result.shipment.weight_kg), 10)
  assert.equal(result.shipment.invoice_revision, 2)
  assert.equal(result.shipment.shipment_items[0].id, item.id)
  assert.equal(result.shipment.shipment_items[0].qr_token, item.qr_token)
  assert.equal(result.shipment.shipment_items[0].description, 'Corrected item')
  pass('USD to TZS recalculates money, kg and descriptions and retains QR identities')
  const journals = await sql("select status,count(*)::int as count from public.journal_entries where reference_type='INVOICE' and reference_id='TEST-USD' group by status")
  assert.equal(journals.find(row => row.status === 'POSTED').count, 1)
  assert.equal(journals.find(row => row.status === 'VOIDED').count, 1)
  pass('prior invoice is reversed and exactly one replacement invoice is posted')
  const before = Number((await sql('select count(*) as count from public.journal_entries'))[0].count)
  assert.deepEqual(await correct('TEST-USD', changes, 1, key), result)
  assert.equal(Number((await sql('select count(*) as count from public.journal_entries'))[0].count), before)
  pass('retry with identical request ID is idempotent')
  await expectError(() => correct('TEST-USD', { ...changes, measurement: '11' }, 1, key), /different correction/)
  await expectError(() => correct('TEST-USD', changes, 1), /changed while you were editing/)
  pass('reused request ID with a different payload and stale revision are rejected')

  await actor(staff)
  await db.exec('set role authenticated')
  await expectError(() => correct('TEST-USD', changes, 2), /Manager or Admin/)
  assert.equal((await sql('select * from public.shipment_invoice_corrections')).length, 0)
  await expectError(() => sql("insert into public.shipment_invoice_corrections(request_id) values(gen_random_uuid())"), /permission denied/)
  await db.exec('reset role')
  pass('ordinary staff cannot correct invoices, read correction history or write audit rows')

  await actor(manager)
  await db.exec('set role authenticated')
  await expectError(() => sql("update public.shipments set currency='USD' where id='TEST-USD'"), /Edit Shipment/)
  await expectError(() => sql("update public.shipment_items set description='Bypass' where shipment_id='TEST-USD'"), /immutable/)
  assert.equal((await sql('select * from public.shipment_invoice_corrections')).length, 1)
  await db.exec('reset role')
  pass('direct table writes cannot bypass finalized shipment guards; managers can read history')

  // The agent migration also defines staff custom permissions.
  await actor(admin)
  await sql("update public.staff_profiles set permissions_mode='CUSTOM' where id=$1", [manager])
  await actor(manager)
  await expectError(() => correct('TEST-USD', changes, 2), /editing permissions/)
  await actor(admin)
  await sql(`update public.staff_profiles set permissions=array['shipments.edit','invoices.edit'] where id=$1`, [manager])
  await actor(manager)
  await db.exec('set role authenticated')
  assert.equal((await correct('TEST-USD', changes, 2)).shipment.invoice_revision, 3)
  await db.exec('reset role')
  await actor(admin)
  await sql('update public.staff_profiles set active=false where id=$1', [manager])
  await actor(manager)
  await expectError(() => correct('TEST-USD', changes, 3), /active Manager or Admin/)
  await actor('')
  await db.exec('set role anon')
  await expectError(() => correct('TEST-USD', changes, 3), /permission denied/)
  await db.exec('reset role')
  pass('custom manager permissions, disabled staff and anonymous callers are enforced on the server')

  await actor(admin)
  const paidItem = await fixture('TEST-PAID')
  await sql("select public.record_payment('TEST-PAID',50,'USD','Cash',current_date,'Part payment',$1::uuid,'1000')", [randomUUID()])
  const paidForm = form({ items: [{ id: paidItem.id, description: 'Paid cargo' }] })
  await expectError(() => correct('TEST-PAID', { ...paidForm, currency: 'TZS', exchangeRate: '2500', exchangeRateDate: '2026-10-29' }), /Currency cannot change/)
  await expectError(() => correct('TEST-PAID', { ...paidForm, measurement: '1' }), /less than payments/)
  const paidResult = await correct('TEST-PAID', { ...paidForm, measurement: '12', discount: '10', discountReason: 'Rebate' })
  assert.equal(Number(paidResult.shipment.invoice_amount), 110)
  assert.equal(Number(paidResult.shipment.amount_paid), 50)
  pass('posted payments prohibit currency conversion and overpayment, but allow a valid same currency correction')
  await sql("select public.record_payment('TEST-USD',50000,'TZS','Cash',current_date,null,$1::uuid,'1000')", [randomUUID()])
  await expectError(() => correct('TEST-USD', { ...changes, exchangeRate: '2600' }, 3), /exchange rate cannot change/)
  pass('a paid foreign currency invoice retains the original payment exchange rate')

  const chargedItem = await fixture('TEST-CHARGE')
  await sql("select public.create_cargo_extra_charge('TEST-CHARGE','pickup',null,'billable_to_customer',20,'USD',current_date,null,null,$1::uuid)", [randomUUID()])
  const chargedForm = form({ items: [{ id: chargedItem.id, description: 'Charged cargo' }] })
  await expectError(() => correct('TEST-CHARGE', { ...chargedForm, currency: 'TZS', exchangeRate: '2500', exchangeRateDate: '2026-10-29' }), /Currency cannot change/)
  await correct('TEST-CHARGE', chargedForm)
  assert.equal(Number((await sql("select sum(amount) as amount from public.cargo_extra_charges where shipment_id='TEST-CHARGE' and status='ACTIVE'"))[0].amount), 20)
  pass('active cargo charges block currency changes and survive same currency corrections')

  const expenseItem = await fixture('TEST-EXPENSE')
  await sql("select public.record_expense($1::uuid,current_date,'Transport','Delivery',20,'USD','5000','Cash','1000',null,null,'TEST-EXPENSE',null)", [randomUUID()])
  await expectError(() => correct('TEST-EXPENSE', form({ currency: 'TZS', exchangeRate: '2500', exchangeRateDate: '2026-10-29', items: [{ id: expenseItem.id, description: 'Expense cargo' }] })), /Currency cannot change/)
  pass('posted shipment expenses also block currency changes')

  const seaItem = await fixture('TEST-SEA', true)
  const seaResult = await correct('TEST-SEA', form({ measurement: '1.234567', rateUsd: '300', currency: 'AED', exchangeRate: '3.67', exchangeRateDate: '2026-10-29', items: [{ id: seaItem.id, description: 'Sea cargo' }] }))
  assert.equal(Number(seaResult.shipment.volume_cbm), 1.234567)
  assert.equal(Number(seaResult.shipment.invoice_amount), 1359.26)
  pass('sea cargo CBM retains six decimal precision and converts to AED')

  await expectError(() => correct('TEST-SEA', form({ measurement: 'NaN' }), 2), /finite positive/)
  await expectError(() => correct('TEST-SEA', form(), 2, randomUUID(), ''), /reason/)
  await expectError(() => correct('TEST-SEA', form({ items: [{ id: item.id, description: 'Wrong shipment' }] }), 2), /belong to this shipment/)
  pass('nonfinite numeric values, missing reason and cross shipment item IDs are rejected')

  const saved = await sql("select invoice_revision,invoice_currency from public.shipments where id='TEST-SEA'")
  await db.exec("create function public.qa_fail_correction() returns trigger language plpgsql as $$ begin if new.action='SHIPMENT_INVOICE_CORRECTED' then raise exception 'QA simulated audit failure'; end if; return new; end $$; create trigger qa_fail before insert on public.business_audit_log for each row execute function public.qa_fail_correction();")
  await expectError(() => correct('TEST-SEA', form({ items: [{ id: seaItem.id, description: 'Must roll back' }] }), 2), /simulated audit failure/)
  assert.deepEqual(await sql("select invoice_revision,invoice_currency from public.shipments where id='TEST-SEA'"), saved)
  assert.equal((await sql("select description from public.shipment_items where id=$1", [seaItem.id]))[0].description, 'Sea cargo')
  await db.exec('drop trigger qa_fail on public.business_audit_log')
  pass('an error after posting rolls back shipment, item, journal and revision changes atomically')

  const balances = await sql("select e.id,sum(l.debit)-sum(l.credit) as difference from public.journal_entries e join public.journal_lines l on l.journal_entry_id=e.id group by e.id having sum(l.debit) <> sum(l.credit)")
  assert.equal(balances.length, 0)
  pass('all original, reversal, replacement and payment journals balance')
  console.log(`SUCCESS: ${checks} PostgreSQL integration checks`)
} catch (error) { console.error('FAIL:', error.message, error.where || ''); process.exitCode = 1 }
finally { await db.close() }

