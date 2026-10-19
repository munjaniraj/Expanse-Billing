'use client'

import { useMemo, useState } from 'react'
import { formatINR } from '@/utils/currencyFormatter'
import { filterRows } from '@/utils/filterRows'
import { usePagination } from '@/hooks/usePagination'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import SectionCard from '@/components/common/SectionCard'

export default function LabourSummaryTable({ rows = [] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      filterRows(rows, {
        query: search,
        fields: ['department', 'workType'],
      }),
    [rows, search],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: search,
  })

  const columns = [
    { key: 'department', label: 'Department' },
    { key: 'workType', label: 'Work Type' },
    {
      key: 'entries',
      label: 'Entries',
      className: 'font-mono tabular-nums',
    },
    {
      key: 'netPayment',
      label: 'Net Payment',
      className: 'font-mono tabular-nums font-semibold',
      render: (row) => formatINR(row.netPayment),
    },
    {
      key: 'pending',
      label: 'Pending',
      render: (row) =>
        row.pendingCount > 0 ? (
          <Badge tone="Pending">{row.pendingCount} pending</Badge>
        ) : (
          <Badge tone="Paid">Cleared</Badge>
        ),
    },
  ]

  return (
    <SectionCard title="Labour by Department / Work Type" subtitle="Summary for the selected financial year">
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search department, work type…"
      />
      <div className="mt-4">
        <Table
          columns={columns}
          data={pageData}
          emptyMessage={
            rows.length ? 'No rows match your search.' : 'No labour entries for this financial year.'
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
