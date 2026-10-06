import { formatINR } from '../../utils/currencyFormatter'

export default function ReceivablesPayablesSummary({ receivables = [], payables = [] }) {
  const totalRecv = receivables.reduce((s, r) => s + (r.amount || 0), 0)
  const totalPay = payables.reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Pending Receivables"
        subtitle="Income outstanding by category"
        total={totalRecv}
        items={receivables}
        tone="emerald"
      />
      <Panel
        title="Pending Payables"
        subtitle="Expense outstanding by category"
        total={totalPay}
        items={payables}
        tone="rose"
      />
    </div>
  )
}

function Panel({ title, subtitle, total, items, tone }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <p
          className={`text-lg font-bold tabular-nums ${
            tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {formatINR(total)}
        </p>
      </div>
      {!items.length ? (
        <p className="py-6 text-center text-sm text-slate-400">All clear for this FY.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 6).map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="truncate text-slate-700">{item.name}</span>
              <span className="tabular-nums font-semibold text-slate-900">{formatINR(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
