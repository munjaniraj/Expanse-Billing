'use client'

import { formatINR } from '@/utils/currencyFormatter'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'

export default function LabourSummaryTable({ rows = [] }) {
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
    <div className="card p-5">
      <h3 className="font-display mb-4 text-sm font-bold text-ink-950">
        Labour by Department / Work Type
      </h3>
      <Table columns={columns} data={rows} emptyMessage="No labour entries for this financial year." />
    </div>
  )
}
