'use client'

import Link from 'next/link'

/**
 * Consistent page toolbar: optional back link, description, action buttons.
 */
export default function PageHeader({ description, backHref, backLabel, actions, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0 space-y-1.5">
        {backHref && (
          <Link
            href={backHref}
            className="mb-0.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            {backLabel || 'Back'}
          </Link>
        )}
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p> : null}
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
