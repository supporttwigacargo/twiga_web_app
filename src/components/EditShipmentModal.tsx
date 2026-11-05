import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { useAppStore } from '../store/useAppStore'
import { useRatesStore } from '../store/useRatesStore'
import { useAccountingStore } from '../store/useAccountingStore'
import { findApplicableExchangeRate } from '../lib/exchangeRateService'
import { correctionFromShipment, correctionTotals, currencyChangeBlocker, type ShipmentCorrection } from '../lib/shipmentCorrection'
import { generateInvoicePDF } from '../lib/pdf'
import { formatAmount, type Currency, type Shipment } from '../types'

interface Props { shipment: Shipment; onClose: () => void }

export default function EditShipmentModal({ shipment, onClose }: Props) {
  const { correctShipmentInvoice, settings, customers, getPaymentsForShipment, getExtraChargesForShipment, expenses } = useAppStore()
  const [form, setForm] = useState<ShipmentCorrection>(() => correctionFromShipment(shipment))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(crypto.randomUUID())
  const expectedRevision = useRef(shipment.invoiceRevision ?? 1)
  const submitGuard = useRef(false)
  const originalCurrency = shipment.invoiceCurrency ?? shipment.currency
  const blocker = currencyChangeBlocker(
    getPaymentsForShipment(shipment.id).some(payment => payment.status === 'POSTED'),
    getExtraChargesForShipment(shipment.id).some(charge => charge.status === 'ACTIVE'),
    expenses.some(expense => expense.shipmentId === shipment.id && expense.status === 'POSTED'),
  )
  const paid = getPaymentsForShipment(shipment.id).filter(payment => payment.status === 'POSTED').reduce((sum, payment) => sum + payment.amount, 0)
  const billable = getExtraChargesForShipment(shipment.id).filter(charge => charge.status === 'ACTIVE' && charge.direction === 'billable_to_customer').reduce((sum, charge) => sum + charge.amount, 0)
  let preview: ReturnType<typeof correctionTotals> | undefined
  let previewError = ''
  try { preview = correctionTotals(form) } catch (err) { previewError = err instanceof Error ? err.message : 'Check the invoice values.' }

  function update<K extends keyof ShipmentCorrection>(key: K, value: ShipmentCorrection[K]) {
    requestId.current = crypto.randomUUID()
    setForm(previous => ({ ...previous, [key]: value }))
    setError('')
  }

  async function changeCurrency(currency: Currency) {
    if (currency === form.currency) return
    if (currency !== originalCurrency && blocker) { setError(blocker); return }
    setBusy(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      if (currency !== 'USD' && currency !== originalCurrency) await useRatesStore.getState().loadRates()
      const applicable = findApplicableExchangeRate(useRatesStore.getState().exchangeRates, today, settings.exchangeRatePolicy)
      const rate = currency === 'USD' ? 1 : currency === originalCurrency ? shipment.selectedExchangeRate : currency === 'TZS' ? applicable?.rate.usdToTzs : applicable?.rate.usdToAed
      if (!rate) throw new Error(`No approved ${currency} exchange rate is available. Update Exchange Rates first.`)
      const oldRate = form.currency === 'USD' ? 1 : Number(form.exchangeRate)
      if (!oldRate || oldRate <= 0) throw new Error('The original invoice exchange rate is missing. Resolve it before changing currency.')
      const convert = (value: number) => (value / oldRate * rate).toFixed(currency === 'TZS' ? 0 : 2)
      requestId.current = crypto.randomUUID()
      setForm(previous => ({ ...previous, currency, exchangeRate: String(rate), exchangeRateDate: currency === originalCurrency ? shipment.exchangeRateDate || today : applicable?.rate.rateDate || today,
        otherCharges: convert(Number(form.otherCharges)), discount: convert(Number(form.discount)),
      }))
      setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Exchange rates could not be loaded.') }
    finally { setBusy(false) }
  }

  async function save(print: boolean) {
    if (submitGuard.current) return
    if (!reason.trim()) { setError('Enter a reason for this correction.'); return }
    if (!form.customerName.trim() || !form.origin.trim() || !form.destination.trim() || !form.destinationCity.trim() || !form.description.trim()) {
      setError('Customer name, route, destination city and cargo description are required.'); return
    }
    if (form.items.some(item => !item.id || !item.description.trim())) { setError('Every cargo item needs a description.'); return }
    if (!preview) { setError(previewError); return }
    if (form.currency !== originalCurrency && blocker) { setError(blocker); return }
    if (form.currency === originalCurrency && preview.net + billable + 0.01 < paid) { setError('The corrected Total Due cannot be less than payments already posted.'); return }
    submitGuard.current = true
    setBusy(true)
    setError('')
    let corrected: Shipment
    try {
      corrected = await correctShipmentInvoice(shipment.id, form, reason, expectedRevision.current, requestId.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The correction could not be saved.')
      setBusy(false)
      submitGuard.current = false
      return
    }
    toast.success(`Shipment saved. Invoice revision ${corrected.invoiceRevision}.`)
    void useAccountingStore.getState().loadAccounting().catch(() => {
      toast.error('Shipment saved. Refresh Financial Reports to load the updated ledger.')
    })
    onClose()
    if (print) {
      try {
        await generateInvoicePDF(corrected, customers.find(customer => customer.id === corrected.customerId), getPaymentsForShipment(corrected.id), settings, getExtraChargesForShipment(corrected.id), 'download')
      } catch {
        toast.error('The shipment was saved, but the invoice could not be generated. Use Print Invoice to try again.')
      }
    }
    setBusy(false)
    submitGuard.current = false
  }

  const input = (label: string, key: keyof Omit<ShipmentCorrection, 'items' | 'currency'>, type = 'text') => (
    <label className="block text-xs font-medium text-slate-600">{label}
      <input disabled={paid > 0 && (key === 'exchangeRate' || key === 'exchangeRateDate')} className="form-input mt-1" type={type} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? '0' : undefined} value={form[key]} onChange={event => update(key, event.target.value)} />
    </label>
  )

  return <Modal open onClose={() => { if (!busy) onClose() }} title="Edit shipment & invoice" width="max-w-3xl">
    <fieldset disabled={busy} className="space-y-4">
      <p className="text-xs text-slate-500">{shipment.trackingNumber} · Invoice revision {expectedRevision.current}. Saving records the reason and issues a revised invoice.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {input('Customer name *', 'customerName')}{input('Customer phone', 'customerPhone')}
        {input('Customer email', 'customerEmail', 'email')}{input('Origin *', 'origin')}
        {input('Destination country *', 'destination')}{input('Destination city *', 'destinationCity')}
      </div>
      <p className="text-xs text-slate-500">These customer details apply to this shipment and invoice.</p>
      <label className="block text-xs font-medium text-slate-600">Cargo description *<textarea className="form-input mt-1" rows={2} value={form.description} onChange={event => update('description', event.target.value)} /></label>
      {form.items.map((item, index) => <label key={item.id} className="block text-xs font-medium text-slate-600">Item {index + 1} description<input className="form-input mt-1" value={item.description} onChange={event => update('items', form.items.map((candidate, i) => i === index ? { ...candidate, description: event.target.value } : candidate))} /></label>)}
      <div className="grid gap-3 sm:grid-cols-2">
        {input(shipment.shipmentType === 'Air Cargo' ? 'Weight (kg) *' : 'Volume (CBM) *', 'measurement', 'number')}
        {input(`Rate (USD / ${shipment.shipmentType === 'Air Cargo' ? 'kg' : 'CBM'}) *`, 'rateUsd', 'number')}
        <label className="block text-xs font-medium text-slate-600">Freight total (USD)<input className="form-input mt-1" type="number" min="0.01" step="0.01" value={preview?.baseUsd ?? ''} onChange={event => { if (Number(form.measurement) > 0) update('rateUsd', (Number(event.target.value) / Number(form.measurement)).toFixed(6)) }} /><span className="mt-1 block text-[11px] text-slate-400">Changing the total adjusts the rate per kg/CBM.</span></label>
        <label className="block text-xs font-medium text-slate-600">Invoice currency<select aria-label="Invoice currency" className="form-input mt-1" value={form.currency} onChange={event => void changeCurrency(event.target.value as Currency)}>{(['USD', 'TZS', 'AED'] as Currency[]).map(currency => <option key={currency} value={currency} disabled={currency !== originalCurrency && Boolean(blocker)}>{currency}</option>)}</select></label>
        {form.currency !== 'USD' && input(`Exchange rate: 1 USD = ${form.currency} *`, 'exchangeRate', 'number')}
        {form.currency !== 'USD' && input('Exchange rate date *', 'exchangeRateDate', 'date')}
        {input(`Other charges (${form.currency})`, 'otherCharges', 'number')}
        {input(`Discount (${form.currency})`, 'discount', 'number')}
        {Number(form.discount) > 0 && input('Discount reason *', 'discountReason')}
      </div>
      {blocker && <p className="text-xs text-amber-800">{blocker}</p>}
      <label className="block text-xs font-medium text-slate-600">Shipment notes<textarea className="form-input mt-1" rows={2} value={form.notes} onChange={event => update('notes', event.target.value)} /></label>
      <div className="rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite">
        {preview ? <><div>Freight: {formatAmount(preview.freight, form.currency)}</div><div>Invoice after discount: {formatAmount(preview.net, form.currency)}</div><div className="font-bold">Total Due: {formatAmount(preview.net + billable, form.currency)}</div></> : <p className="text-amber-800">{previewError}</p>}
      </div>
      <label className="block text-xs font-semibold text-slate-700">Reason for correction *<textarea className="form-input mt-1" rows={2} placeholder="e.g. Corrected weight, or customer requested a TZS invoice" value={reason} onChange={event => { requestId.current = crypto.randomUUID(); setReason(event.target.value) }} /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="min-h-11 rounded-lg border px-4 text-sm">Cancel</button>
        <button type="button" onClick={() => void save(false)} className="min-h-11 rounded-lg border px-4 text-sm font-semibold">{busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" onClick={() => void save(true)} className="min-h-11 rounded-lg bg-cargo-500 px-4 text-sm font-semibold text-white">{busy ? 'Saving…' : 'Save & Print Invoice'}</button>
      </div>
    </fieldset>
  </Modal>
}

