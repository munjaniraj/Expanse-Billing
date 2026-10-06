/** Indian FY runs April 1 – March 31. Label format: "2026-27" */

export function getCurrentFinancialYear(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-indexed
  const startYear = month >= 3 ? year : year - 1
  const endYearShort = String(startYear + 1).slice(-2)
  return `${startYear}-${endYearShort}`
}

export function getFinancialYearOptions(span = 5) {
  const current = getCurrentFinancialYear()
  const startYear = Number(current.split('-')[0])
  const options = []

  for (let i = -1; i < span - 1; i += 1) {
    const y = startYear + i
    options.push(`${y}-${String(y + 1).slice(-2)}`)
  }

  return options
}

export const FY_MONTHS = [
  { key: 'apr', label: 'Apr', index: 3 },
  { key: 'may', label: 'May', index: 4 },
  { key: 'jun', label: 'Jun', index: 5 },
  { key: 'jul', label: 'Jul', index: 6 },
  { key: 'aug', label: 'Aug', index: 7 },
  { key: 'sep', label: 'Sep', index: 8 },
  { key: 'oct', label: 'Oct', index: 9 },
  { key: 'nov', label: 'Nov', index: 10 },
  { key: 'dec', label: 'Dec', index: 11 },
  { key: 'jan', label: 'Jan', index: 0 },
  { key: 'feb', label: 'Feb', index: 1 },
  { key: 'mar', label: 'Mar', index: 2 },
]

export function getFyMonthKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  const month = d.getMonth()
  return FY_MONTHS.find((m) => m.index === month)?.key ?? 'apr'
}

export function formatFyLabel(fy) {
  return `FY ${fy}`
}
