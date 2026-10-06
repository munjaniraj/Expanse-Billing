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
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${col.headerClassName || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, idx) => {
            const id = row[rowKey] ?? idx
            const selected = selectedRowId != null && selectedRowId === row[rowKey]
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${
                  onRowClick ? 'cursor-pointer' : ''
                } ${selected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-100' : 'hover:bg-slate-50/80'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-3 text-slate-700 whitespace-nowrap ${col.className || ''}`}
                    onClick={
                      col.stopPropagation
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
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
