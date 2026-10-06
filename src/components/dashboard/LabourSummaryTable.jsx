import { formatINR } from '../../utils/currencyFormatter'
import Badge from '../common/Badge'
import Table from '../common/Table'

export default function LabourSummaryTable({ rows = [] }) {
  const columns = [
    { key: 'department', label: 'Department' },
    { key: 'workType', label: 'Work Type' },
    {
      key: 'entries',
      label: 'Entries',
      className: 'tabular-nums',
    },
    {
      key: 'netPayment',
      label: 'Net Payment',
      className: 'tabular-nums font-semibold',
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
      <h3 className="mb-4 text-sm font-bold text-slate-900">Labour by Department / Work Type</h3>
      <Table columns={columns} data={rows} emptyMessage="No labour entries for this financial year." />
    </div>
  )
}
