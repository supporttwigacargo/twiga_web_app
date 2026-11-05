import assert from 'node:assert/strict'
import test from 'node:test'
import { extraChargeErrorMessage, paymentErrorMessage, shipmentCreateErrorMessage, statusErrorMessage } from './domainErrors.ts'

test('payment database details are mapped to safe user messages', () => {
  const duplicate = paymentErrorMessage({ code: '23505', message: 'duplicate key violates payment_records_receipt_number_key' })
  assert.match(duplicate, /receipt number conflict/i)
  assert.doesNotMatch(duplicate, /constraint|payment_records/i)
  assert.match(paymentErrorMessage({ message: 'Payment exceeds the outstanding invoice balance.' }), /greater than/i)
  assert.match(paymentErrorMessage({ message: 'Idempotency key was already used for a different payment request.' }), /different details/i)
})

test('status errors never expose raw database text', () => {
  const message = statusErrorMessage({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
  assert.match(message, /no longer available/i)
  assert.doesNotMatch(message, /PGRST|JSON object/i)
})

test('extra-charge validation errors are actionable', () => {
  assert.match(extraChargeErrorMessage({ message: 'custom label is required' }), /custom label/i)
  assert.match(extraChargeErrorMessage({ message: 'Supplier Payment must be a company expense.' }), /company expense/i)
  assert.match(extraChargeErrorMessage({ message: 'Posted payments would exceed the shipment total due.' }), /below payments/i)
})

test('shipment creation errors are safe, actionable and never expose constraint names', () => {
  const duplicate = shipmentCreateErrorMessage({ code: '23505', message: 'duplicate key value violates unique constraint "shipments_invoice_number_idx"' })
  assert.match(duplicate, /number conflict/i)
  assert.doesNotMatch(duplicate, /constraint|shipments_invoice/i)
  assert.match(shipmentCreateErrorMessage({ message: 'This request was already used to create shipment TWIGA-261029-0002.' }), /already created/i)
  assert.match(shipmentCreateErrorMessage(new TypeError('Failed to fetch')), /will not create a duplicate/i)
  assert.match(shipmentCreateErrorMessage({ message: 'something unexpected' }), /Nothing was saved/i)
})
