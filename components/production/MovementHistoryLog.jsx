'use client'

import { useMemo, useState } from 'react'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import SectionCard from '@/components/common/SectionCard'
import { filterRows } from '@/utils/filterRows'
import { usePagination } from '@/hooks/usePagination'

export default function MovementHistoryLog({ movements = [] }) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const filtered = useMemo(
    () =>
      filterRows(movements, {
        query: search,
        fields: ['categoryName', 'lotNumber', 'operator', 'operationReason'],
        predicates: [(m) => actionFilter === 'all' || m.actionType === actionFilter],
      }),
    [movements, search, actionFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${search}|${actionFilter}`,
  })

  const columns = [
    {
      key: 'timestamp',
      label: 'When',
      render: (row) => {
        const ts = row.timestamp?.toDate?.() || (row.timestamp ? new Date(row.timestamp) : null)
        return (
          <span className="text-xs text-ink-500">
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
    { key: 'quantity', label: 'Qty', className: 'font-mono tabular-nums font-semibold' },
    { key: 'lotNumber', label: 'Lot' },
    { key: 'operator', label: 'Operator' },
    { key: 'balanceAfter', label: 'Balance', className: 'font-mono tabular-nums' },
  ]

  return (
    <SectionCard title="Movement History" subtitle="Immutable audit trail from stock_movements">
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search lot, operator, category…"
        filters={[
          {
            id: 'action',
            value: actionFilter,
            onChange: setActionFilter,
            options: [
              { value: 'all', label: 'All actions' },
              { value: 'ADD', label: 'ADD' },
              { value: 'REDUCE', label: 'REDUCE' },
            ],
          },
        ]}
      />
      <div className="mt-4">
        <Table
          columns={columns}
          data={pageData}
          emptyMessage={
            movements.length ? 'No movements match your search.' : 'No stock movements yet.'
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
