/**
 * Client-side multi-field text filter.
 * @param {Array<object>} rows
 * @param {{ query?: string, fields?: string[], predicates?: Array<(row: object) => boolean> }} options
 */
export function filterRows(rows, { query = '', fields = [], predicates = [] } = {}) {
  const q = String(query).trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (q && fields.length > 0) {
      const match = fields.some((field) => {
        const value = row?.[field]
        return value != null && String(value).toLowerCase().includes(q)
      })
      if (!match) return false
    }
    return predicates.every((fn) => fn(row))
  })
}
