/** Costing sheet columns matching RADHE KRUSHNA TEXTILE costing.pdf */

export const COSTING_COLUMNS = [
  { key: 'pagar', label: 'PAGAR', short: 'Pagar' },
  { key: 'ebill', label: 'E-Bill', short: 'E-Bill' },
  { key: 'gas', label: 'GAS Bill', short: 'Gas' },
  { key: 'milgin', label: 'MILGIN', short: 'Milgin' },
  { key: 'kharch', label: 'KHARCH', short: 'Kharch' },
  { key: 'onetime', label: '1 TIME EX', short: '1-Time' },
  { key: 'intpay', label: 'INT PAY', short: 'Int Pay' },
  { key: 'emi', label: 'EMI', short: 'EMI' },
  { key: 'other', label: 'Other EX', short: 'Other' },
]

export const COST_KEYS = COSTING_COLUMNS.map((c) => c.key)

export function emptyCostRow() {
  return {
    pagar: 0,
    ebill: 0,
    gas: 0,
    milgin: 0,
    kharch: 0,
    onetime: 0,
    intpay: 0,
    emi: 0,
    other: 0,
    mtr: 0,
  }
}

export function rowTotalCost(row) {
  return COST_KEYS.reduce((sum, key) => sum + (Number(row?.[key]) || 0), 0)
}

/** AVG ₹/Mtr for one cost head */
export function avgPerMtr(amount, mtr) {
  const meters = Number(mtr) || 0
  if (meters <= 0) return 0
  return (Number(amount) || 0) / meters
}

/**
 * Summary ₹/Mtr metrics from costing.pdf:
 * - NET                = (all − EMI − INT PAY) / MTR
 * - WITH C.C Int       = (all − EMI) / MTR
 * - WITH EMI AND ALL   = all / MTR
 * - net With Emi       = (all − Other EX) / MTR
 */
export function computeCostingSummary(rows, totalAavak = 0) {
  const totals = emptyCostRow()
  Object.values(rows || {}).forEach((row) => {
    COST_KEYS.forEach((key) => {
      totals[key] += Number(row?.[key]) || 0
    })
    totals.mtr += Number(row?.mtr) || 0
  })

  const allCost = rowTotalCost(totals)
  const mtr = totals.mtr
  const aavak = Number(totalAavak) || 0

  return {
    totals,
    allCost,
    mtr,
    aavak,
    aavakAvg: avgPerMtr(aavak, mtr),
    net: avgPerMtr(allCost - totals.emi - totals.intpay, mtr),
    withInterest: avgPerMtr(allCost - totals.emi, mtr),
    withEmiAndAll: avgPerMtr(allCost, mtr),
    netWithEmi: avgPerMtr(allCost - totals.other, mtr),
  }
}

export function formatAvg(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}
