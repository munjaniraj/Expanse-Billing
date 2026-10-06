import { TrendingDown, TrendingUp } from 'lucide-react'

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'slate',
  trend,
}) {
  const tones = {
    slate: 'from-slate-800 to-slate-900 text-white',
    indigo: 'from-indigo-600 to-indigo-800 text-white',
    emerald: 'from-emerald-600 to-emerald-700 text-white',
    rose: 'from-rose-600 to-rose-700 text-white',
    amber: 'from-amber-500 to-amber-600 text-white',
  }

  return (
    <div className={`card relative overflow-hidden bg-gradient-to-br p-5 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</p>
          {subtitle && <p className="mt-1 text-sm opacity-80">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend != null && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-90">
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </div>
  )
}
