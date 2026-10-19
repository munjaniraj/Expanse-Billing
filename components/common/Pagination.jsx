'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZES = [10, 25, 50, 100]

/**
 * Proper pagination controls: range label, page size, prev/next, page numbers.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZES,
  className = '',
}) {
  if (total === 0) return null

  const pages = buildPageList(page, totalPages)

  return (
    <div
      className={`mt-4 flex flex-col gap-3 rounded-xl border border-ink-100 bg-sand-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-ink-500">
        Showing <span className="font-semibold text-ink-800">{from}</span>
        {'–'}
        <span className="font-semibold text-ink-800">{to}</span>
        {' of '}
        <span className="font-semibold text-ink-800">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <span className="whitespace-nowrap">Rows</span>
          <select
            className="input-field w-auto py-1.5 pl-2 pr-8 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="px-1 text-sm text-ink-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
                  p === page
                    ? 'bg-teal-700 text-white'
                    : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                }`}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function buildPageList(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const set = new Set([1, totalPages, page, page - 1, page + 1, page - 2, page + 2])
  const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…')
    result.push(sorted[i])
  }
  return result
}
