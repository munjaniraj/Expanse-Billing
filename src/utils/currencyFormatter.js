const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatINR(value, { precise = false } = {}) {
  const amount = Number(value) || 0
  return precise ? inrPrecise.format(amount) : inrFormatter.format(amount)
}

/** Compact Indian notation: ₹12.50 L / ₹1.25 Cr */
export function formatINRCompact(value) {
  const amount = Number(value) || 0
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`
  }
  return formatINR(amount)
}

export function parseAmount(value) {
  if (typeof value === 'number') return value
  const cleaned = String(value ?? '').replace(/[₹,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}
