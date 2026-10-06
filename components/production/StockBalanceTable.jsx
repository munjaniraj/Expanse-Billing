'use client'

import { Minus, Plus } from 'lucide-react'
import { formatINR } from '@/utils/currencyFormatter'
import Table from '@/components/common/Table'

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
          <p className="font-semibold text-ink-950">{row.categoryName}</p>
          <p className="text-xs text-ink-400">
            {row.unit || 'Mtr'} · Available{' '}
            <span className="font-mono font-semibold tabular-nums text-ink-600">{row.netStock ?? 0}</span>
          </p>
        </div>
      ),
    },
    { key: 'openingStock', label: 'Opening', className: 'font-mono tabular-nums' },
    { key: 'totalProduced', label: 'Produced', className: 'font-mono tabular-nums text-emerald-700' },
    { key: 'totalSold', label: 'Sold', className: 'font-mono tabular-nums text-teal-700' },
    { key: 'totalWastage', label: 'Wastage', className: 'font-mono tabular-nums text-rose-700' },
    {
      key: 'netStock',
      label: 'Net Available',
      className: 'font-mono tabular-nums font-bold text-ink-950',
    },
    {
      key: 'value',
      label: 'Stock Value',
      className: 'font-mono tabular-nums',
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
          <h3 className="font-display text-sm font-bold text-ink-950">Stock Balance</h3>
          <p className="text-xs text-ink-500">
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
