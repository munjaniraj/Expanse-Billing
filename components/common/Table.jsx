export default function Table({
  columns = [],
  data = [],
  emptyMessage = 'No records found.',
  rowKey = 'id',
  onRowClick,
  selectedRowId,
}) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/80 px-4 py-10 text-center text-sm text-ink-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200">
      <table className="min-w-full divide-y divide-ink-200 text-base">
        <thead className="bg-ink-50/90">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-500 whitespace-nowrap ${col.headerClassName || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 bg-white">
          {data.map((row, idx) => {
            const id = row[rowKey] ?? idx
            const selected = selectedRowId != null && selectedRowId === row[rowKey]
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} ${
                  selected ? 'bg-teal-50 ring-1 ring-inset ring-teal-100' : 'hover:bg-sand-50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-3.5 text-ink-700 whitespace-nowrap ${col.className || ''}`}
                    onClick={col.stopPropagation ? (e) => e.stopPropagation() : undefined}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
