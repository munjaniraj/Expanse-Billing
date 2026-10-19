'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side pagination for filtered lists.
 * Pass resetKey (e.g. search + filters) to jump back to page 1 when filters change.
 */
export function usePagination(items = [], { initialPageSize = 10, resetKey = '' } = {}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const safePage = Math.min(page, totalPages)

  const pageData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const setPageSize = (size) => {
    setPageSizeState(Number(size) || initialPageSize)
    setPage(1)
  }

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageData,
    total,
    totalPages,
    from,
    to,
  }
}
