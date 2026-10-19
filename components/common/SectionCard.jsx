'use client'

/**
 * White card with optional title/subtitle wrapping search + table content.
 */
export default function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h3 className="font-display text-sm font-bold tracking-tight text-ink-950">{title}</h3>
            ) : null}
            {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  )
}
