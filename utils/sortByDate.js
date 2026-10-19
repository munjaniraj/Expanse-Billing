/** Sort Firestore rows by a Timestamp/Date field (newest first by default). */
export function sortByDateDesc(rows = [], field = 'date') {
  return [...rows].sort((a, b) => toMillis(b?.[field]) - toMillis(a?.[field]))
}

export function sortByDateAsc(rows = [], field = 'date') {
  return [...rows].sort((a, b) => toMillis(a?.[field]) - toMillis(b?.[field]))
}

function toMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const d = value instanceof Date ? value : new Date(value)
  const t = d.getTime()
  return Number.isNaN(t) ? 0 : t
}
