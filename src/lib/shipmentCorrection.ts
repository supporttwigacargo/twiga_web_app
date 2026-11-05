import type { Currency, Shipment } from '../types/index.ts'
import { calculateBaseAmount, invoiceAmountFor, multiplyDecimal } from './pricing.ts'

export interface ShipmentCorrection {
  customerName: string
  customerPhone: string
  customerEmail: string
  origin: string
  destination: string
  destinationCity: string
  description: string
  notes: string
  measurement: string
  rateUsd: string
  currency: Currency
  exchangeRate: string
  exchangeRateDate: string
  otherCharges: string
  discount: string
  discountReason: string
  items: { id: string; description: string }[]
}

export function correctionFromShipment(shipment: Shipment): ShipmentCorrection {
  return {
    customerName: shipment.customerNameSnapshot || '',
    customerPhone: shipment.customerPhoneSnapshot || '',
    customerEmail: shipment.customerEmailSnapshot || '',
    origin: shipment.origin, destination: shipment.destination, destinationCity: shipment.destinationCity,
    description: shipment.description, notes: shipment.notes || '',
    measurement: String(shipment.shipmentType === 'Air Cargo' ? shipment.weightKg : shipment.volumeCbm),
    rateUsd: String(shipment.appliedRateUsd ?? ''),
    currency: shipment.invoiceCurrency ?? shipment.currency,
    exchangeRate: String(shipment.selectedExchangeRate ?? (shipment.invoiceCurrency === 'TZS' ? shipment.usdToTzsRateUsed : shipment.invoiceCurrency === 'AED' ? shipment.usdToAedRateUsed : 1) ?? ''),
    exchangeRateDate: shipment.exchangeRateDate || '',
    otherCharges: String(shipment.otherCharges || 0), discount: String(shipment.discount || 0),
    discountReason: shipment.discountReason || '',
    items: shipment.items.map(item => ({ id: item.id || '', description: item.description })),
  }
}

export function correctionTotals(form: ShipmentCorrection) {
  const values = [form.measurement, form.rateUsd, form.exchangeRate, form.otherCharges, form.discount]
  if (values.some(value => !value.trim() || !Number.isFinite(Number(value)))) throw new Error('Enter valid numeric amounts.')
  if (Number(form.measurement) <= 0 || Number(form.rateUsd) <= 0) throw new Error('Weight/CBM and the USD rate must be greater than zero.')
  if (Number(form.otherCharges) < 0 || Number(form.discount) < 0) throw new Error('Charges and discount cannot be negative.')
  if (form.currency !== 'USD' && (Number(form.exchangeRate) <= 0 || !form.exchangeRateDate)) throw new Error('Enter a positive exchange rate and its date.')
  const baseUsd = calculateBaseAmount(form.measurement, form.rateUsd)
  const freight = Number(invoiceAmountFor(baseUsd, form.currency, form.exchangeRate, form.exchangeRate))
  const other = Number(multiplyDecimal(form.otherCharges, 1, 2))
  const discount = Number(multiplyDecimal(form.discount, 1, 2))
  const gross = Number(multiplyDecimal(freight + other, 1, 2))
  const net = Number(multiplyDecimal(gross - discount, 1, 2))
  if (net <= 0) throw new Error('The invoice after discount must be greater than zero.')
  if (Number(form.discount) > 0 && !form.discountReason.trim()) throw new Error('Enter a reason for the discount.')
  return { baseUsd: Number(baseUsd), freight, gross, net }
}

export function currencyChangeBlocker(hasPostedPayments: boolean, hasActiveCharges: boolean, hasPostedExpenses: boolean): string | null {
  if (hasPostedPayments) return 'Currency cannot change while posted payments exist. Resolve those payments through the refund/correction process first.'
  if (hasActiveCharges || hasPostedExpenses) return 'Currency cannot change while active cargo charges or posted shipment expenses exist. Correct those records first.'
  return null
}

