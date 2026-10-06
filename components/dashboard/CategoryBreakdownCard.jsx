'use client'

import { formatINR, formatINRCompact } from '@/utils/currencyFormatter'

export default function CategoryBreakdownCard({
  title,
  items = [],
  tone = 'teal',
  emptyText = 'No data for this FY yet.',
}) {
  const max = Math.max(...items.map((i) => Math.abs(i.amount || 0)), 1)
  const bar =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'rose'
        ? 'bg-rose-500'
        : tone === 'amber'
          ? 'bg-amber-500'
          : 'bg-teal-500'

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-ink-950">{title}</h3>
        <span className="text-xs text-ink-400">{items.length} cats</span>
      </div>
      {!items.length ? (
        <p className="py-8 text-center text-sm text-ink-400">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 8).map((item) => (
            <li key={item.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-ink-700">{item.name}</span>
                <span
                  className="shrink-0 font-mono tabular-nums font-semibold text-ink-950"
                  title={formatINR(item.amount)}
                >
                  {formatINRCompact(item.amount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${(Math.abs(item.amount) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
