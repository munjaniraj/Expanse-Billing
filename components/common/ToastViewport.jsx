'use client'

import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const styles = {
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: 'text-rose-600',
    Icon: XCircle,
  },
  info: {
    wrap: 'border-teal-200 bg-teal-50 text-teal-900',
    icon: 'text-teal-700',
    Icon: Info,
  },
}

export default function ToastViewport({ toasts = [], onDismiss }) {
  if (!toasts.length) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6 sm:pb-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => {
        const s = styles[t.type] || styles.info
        const Icon = s.Icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-[fadeUp_0.25s_ease-out] ${s.wrap}`}
            role="status"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              onClick={() => onDismiss?.(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
