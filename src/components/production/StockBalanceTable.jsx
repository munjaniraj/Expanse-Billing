import { Minus, Plus } from 'lucide-react'
import { formatINR } from '../../utils/currencyFormatter'
import Table from '../common/Table'

export default function StockBalanceTable({
  rows = [],
  selectedRowId,
  onRowSelect,
  onAdd,
  onReduce,
}) {
  const columns = [
    {
      key: 'categoryName',
      label: 'Category',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.categoryName}</p>
          <p className="text-xs text-slate-400">
            {row.unit || 'Mtr'} · Available{' '}
            <span className="font-semibold text-slate-600 tabular-nums">{row.netStock ?? 0}</span>
          </p>
        </div>
      ),
    },
    { key: 'openingStock', label: 'Opening', className: 'tabular-nums' },
    { key: 'totalProduced', label: 'Produced', className: 'tabular-nums text-emerald-700' },
    { key: 'totalSold', label: 'Sold', className: 'tabular-nums text-indigo-700' },
    { key: 'totalWastage', label: 'Wastage', className: 'tabular-nums text-rose-700' },
    {
      key: 'netStock',
      label: 'Net Available',
      className: 'tabular-nums font-bold text-slate-900',
    },
    {
      key: 'value',
      label: 'Stock Value',
      className: 'tabular-nums',
      render: (row) => formatINR((Number(row.netStock) || 0) * (Number(row.unitCost) || 0)),
    },
    {
      key: 'actions',
      label: 'Actions',
      stopPropagation: true,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            onClick={() => onAdd?.(row)}
            title="Add production stock"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            onClick={() => onReduce?.(row)}
            disabled={!(Number(row.netStock) > 0)}
            title={Number(row.netStock) > 0 ? 'Reduce stock' : 'No stock available'}
          >
            <Minus className="h-3.5 w-3.5" />
            Reduce
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Stock Balance</h3>
          <p className="text-xs text-slate-500">
            Click a row to reduce, or use Add / Reduce. Net = Opening + Produced − Sold − Wastage
          </p>
        </div>
      </div>
      <Table
        columns={columns}
        data={rows}
        selectedRowId={selectedRowId}
        onRowClick={(row) => {
          onRowSelect?.(row)
          if (Number(row.netStock) > 0) {
            onReduce?.(row)
          } else {
            onAdd?.(row)
          }
        }}
        emptyMessage="No stock balances for this FY yet. Use Add Stock to create the first balance."
      />
    </div>
  )
}
