export default function MetricCard({ title, value, subtitle, icon: Icon, tone = 'ink' }) {
  const tones = {
    ink: 'from-ink-900 to-ink-800 text-white',
    teal: 'from-teal-800 to-teal-700 text-white',
    emerald: 'from-emerald-700 to-emerald-600 text-white',
    rose: 'from-rose-700 to-rose-600 text-white',
    amber: 'from-amber-600 to-amber-500 text-white',
  }

  return (
    <div className={`card relative overflow-hidden bg-gradient-to-br p-5 ${tones[tone] || tones.ink}`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80 sm:text-sm">{title}</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{value}</p>
          {subtitle && <p className="mt-1 text-base opacity-80">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-white/15 p-2.5">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
