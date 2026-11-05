import test from 'node:test'
import assert from 'node:assert/strict'
import { correctionTotals, currencyChangeBlocker, type ShipmentCorrection } from './shipmentCorrection.ts'

const form = (changes: Partial<ShipmentCorrection> = {}): ShipmentCorrection => ({
  customerName: 'Test', customerPhone: '', customerEmail: '', origin: 'Dubai', destination: 'Tanzania', destinationCity: 'Dar es Salaam',
  description: 'Cargo', notes: '', measurement: '20', rateUsd: '10', currency: 'USD', exchangeRate: '1', exchangeRateDate: '',
  otherCharges: '0', discount: '0', discountReason: '', items: [], ...changes,
})

test('USD to TZS recalculates the value, rather than relabeling USD', () => {
  assert.equal(correctionTotals(form({ currency: 'TZS', exchangeRate: '2500', exchangeRateDate: '2026-10-29' })).net, 500000)
})
test('corrected kg and rate include charges and subtract discount exactly once', () => {
  assert.deepEqual(correctionTotals(form({ measurement: '12.5', rateUsd: '12', otherCharges: '20', discount: '10', discountReason: 'Agreed' })), { baseUsd: 150, freight: 150, gross: 170, net: 160 })
})
test('sea cargo CBM and AED use the same decimal pricing boundaries', () => {
  assert.equal(correctionTotals(form({ measurement: '1.234567', rateUsd: '300', currency: 'AED', exchangeRate: '3.67', exchangeRateDate: '2026-10-29' })).net, 1359.26)
})
test('blank, nonfinite and invalid invoice inputs are rejected', () => {
  for (const changes of [{ measurement: '' }, { measurement: '-1' }, { rateUsd: 'Infinity' }, { exchangeRate: 'NaN' }, { otherCharges: '-1' }, { discount: '200', discountReason: 'bad' }, { discount: '1' }]) {
    assert.throws(() => correctionTotals(form(changes)))
  }
})
test('non USD invoices require an exchange rate and a date', () => {
  assert.throws(() => correctionTotals(form({ currency: 'TZS', exchangeRate: '0' })))
  assert.throws(() => correctionTotals(form({ currency: 'TZS', exchangeRate: '2500' })))
})
test('currency changes protect payment, extra charge and expense histories', () => {
  assert.equal(currencyChangeBlocker(false, false, false), null)
  assert.match(currencyChangeBlocker(true, false, false)!, /posted payments/)
  assert.match(currencyChangeBlocker(false, true, false)!, /cargo charges/)
  assert.match(currencyChangeBlocker(false, false, true)!, /expenses/)
})

