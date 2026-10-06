const styles = {
  income: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  expense: 'bg-rose-50 text-rose-700 ring-rose-100',
  labour: 'bg-amber-50 text-amber-700 ring-amber-100',
  production: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  'Partially Paid': 'bg-sky-50 text-sky-700 ring-sky-100',
  ADD: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  REDUCE: 'bg-rose-50 text-rose-700 ring-rose-100',
  default: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function Badge({ children, tone = 'default', className = '' }) {
  const toneClass = styles[tone] || styles.default
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClass} ${className}`}
    >
      {children}
    </span>
  )
}
