'use client'

import { Search, Filter } from 'lucide-react'

/**
 * Shared search + optional dropdown filters for list pages.
 */
export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  filters = [],
  actions = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-ink-100 bg-sand-50/70 p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            className="input-field bg-white pl-10"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={placeholder}
          />
        </div>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            {filters.map((filter, index) => (
              <div
                key={filter.id}
                className={`relative ${filter.className || 'min-w-[9rem] flex-1 sm:flex-none sm:w-44'}`}
              >
                {(filter.showIcon ?? index === 0) && (
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                )}
                <select
                  className={`input-field bg-white ${(filter.showIcon ?? index === 0) ? 'pl-9' : ''}`}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  aria-label={filter.label || filter.id}
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
