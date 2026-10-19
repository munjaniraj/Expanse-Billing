'use client'

/**
 * Summary metric cards used on list pages.
 * items: [{ label, value, colorClass?, money? }] — value already formatted string/number
 */
export default function StatGrid({ items = [], columns = 4, className = '' }) {
  const colClass =
    columns === 5
      ? 'grid-cols-2 lg:grid-cols-5'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : columns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid gap-3 ${colClass} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            {item.label}
          </p>
          <p
            className={`mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight ${
              item.colorClass || 'text-ink-950'
            }`}
          >
            {item.value}
          </p>
          {item.hint ? <p className="mt-1 text-xs text-ink-400">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
