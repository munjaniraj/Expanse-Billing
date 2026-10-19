'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatINR } from '@/utils/currencyFormatter'
import { filterRows } from '@/utils/filterRows'
import { usePagination } from '@/hooks/usePagination'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import SectionCard from '@/components/common/SectionCard'

export default function StockBalanceTable({
  rows = [],
  selectedRowId,
  onRowSelect,
  onAdd,
  onReduce,
  onEdit,
  onDelete,
}) {
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  const filtered = useMemo(
    () =>
      filterRows(rows, {
        query: search,
        fields: ['categoryName', 'unit'],
        predicates: [
          (row) => {
            const net = Number(row.netStock) || 0
            if (stockFilter === 'in_stock') return net > 0
            if (stockFilter === 'zero') return net <= 0
            return true
          },
        ],
      }),
    [rows, search, stockFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${search}|${stockFilter}`,
  })

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
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-teal-50 hover:text-teal-700"
            onClick={() => onEdit?.(row)}
            title="Edit stock settings"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => onDelete?.(row)}
            title="Delete stock balance"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <SectionCard
      title="Stock Balance"
      subtitle="Click a row to reduce, or use Add / Reduce. Net = Opening + Produced − Sold − Wastage"
    >
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search category, unit…"
        filters={[
          {
            id: 'stock',
            value: stockFilter,
            onChange: setStockFilter,
            options: [
              { value: 'all', label: 'All stock' },
              { value: 'in_stock', label: 'In stock' },
              { value: 'zero', label: 'Zero / empty' },
            ],
          },
        ]}
      />
      <div className="mt-4">
        <Table
          columns={columns}
          data={pageData}
          selectedRowId={selectedRowId}
          onRowClick={(row) => {
            onRowSelect?.(row)
            if (Number(row.netStock) > 0) {
              onReduce?.(row)
            } else {
              onAdd?.(row)
            }
          }}
          emptyMessage={
            rows.length
              ? 'No stock rows match your search.'
              : 'No stock balances for this FY yet. Use Add Stock to create the first balance.'
          }
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          from={from}
          to={to}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </SectionCard>
  )
}
