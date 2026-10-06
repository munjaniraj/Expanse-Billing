import { useMemo, useState } from 'react'
import Badge from '../common/Badge'
import Table from '../common/Table'
import { Search } from 'lucide-react'

export default function MovementHistoryLog({ movements = [] }) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return movements.filter((m) => {
      const matchAction = actionFilter === 'all' || m.actionType === actionFilter
      const matchSearch =
        !q ||
        m.categoryName?.toLowerCase().includes(q) ||
        m.lotNumber?.toLowerCase().includes(q) ||
        m.operator?.toLowerCase().includes(q) ||
        m.operationReason?.toLowerCase().includes(q)
      return matchAction && matchSearch
    })
  }, [movements, search, actionFilter])

  const columns = [
    {
      key: 'timestamp',
      label: 'When',
      render: (row) => {
        const ts = row.timestamp?.toDate?.() || (row.timestamp ? new Date(row.timestamp) : null)
        return (
          <span className="text-xs text-slate-500">
            {ts ? ts.toLocaleString('en-IN') : '—'}
          </span>
        )
      },
    },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'actionType',
      label: 'Action',
      render: (row) => <Badge tone={row.actionType}>{row.actionType}</Badge>,
    },
    { key: 'operationReason', label: 'Reason' },
    { key: 'quantity', label: 'Qty', className: 'tabular-nums font-semibold' },
    { key: 'lotNumber', label: 'Lot' },
    { key: 'operator', label: 'Operator' },
    { key: 'balanceAfter', label: 'Balance', className: 'tabular-nums' },
  ]

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Movement History</h3>
          <p className="text-xs text-slate-500">Immutable audit trail from stock_movements</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9 sm:w-56"
              placeholder="Search lot, operator…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field sm:w-36"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All actions</option>
            <option value="ADD">ADD</option>
            <option value="REDUCE">REDUCE</option>
          </select>
        </div>
      </div>
      <Table columns={columns} data={filtered} emptyMessage="No stock movements yet." />
    </div>
  )
}
