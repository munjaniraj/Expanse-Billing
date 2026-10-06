const styles = {
  income: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  expense: 'bg-rose-50 text-rose-800 ring-rose-200',
  labour: 'bg-amber-50 text-amber-800 ring-amber-200',
  production: 'bg-teal-50 text-teal-800 ring-teal-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  inactive: 'bg-ink-100 text-ink-600 ring-ink-200',
  Paid: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  'Partially Paid': 'bg-sky-50 text-sky-800 ring-sky-200',
  ADD: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REDUCE: 'bg-rose-50 text-rose-800 ring-rose-200',
  default: 'bg-ink-100 text-ink-600 ring-ink-200',
}

export default function Badge({ children, tone = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${styles[tone] || styles.default} ${className}`}
    >
      {children}
    </span>
  )
}
