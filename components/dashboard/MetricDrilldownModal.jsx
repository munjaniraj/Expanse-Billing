'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Table from '@/components/common/Table'
import Badge from '@/components/common/Badge'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import { formatINR } from '@/utils/currencyFormatter'
import { filterRows } from '@/utils/filterRows'
import { usePagination } from '@/hooks/usePagination'

function formatDate(value) {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN') : '—'
}

const SEARCH_FIELDS = {
  income: ['categoryName', 'partyName', 'paymentStatus'],
  expense: ['source', 'name', 'categoryName'],
  profit: ['type', 'name', 'categoryName'],
  stock: ['categoryName', 'unit'],
}

const CONFIG = {
  income: {
    title: 'Total Income — Records',
    manageHref: '/transactions?type=income',
    manageLabel: 'Manage income',
    empty: 'No income records for this FY.',
    placeholder: 'Search party, category…',
    columns: [
      { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
      { key: 'categoryName', label: 'Category' },
      { key: 'partyName', label: 'Party' },
      {
        key: 'totalAmount',
        label: 'Amount',
        className: 'font-mono tabular-nums font-semibold',
        render: (row) => formatINR(row.totalAmount),
      },
      {
        key: 'paymentStatus',
        label: 'Status',
        render: (row) => <Badge tone={row.paymentStatus}>{row.paymentStatus}</Badge>,
      },
    ],
  },
  expense: {
    title: 'Total Expense — Records',
    manageHref: '/transactions?type=expense',
    manageLabel: 'Manage expenses',
    empty: 'No expense or labour records for this FY.',
    placeholder: 'Search party, labour, category…',
    columns: [
      { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
      {
        key: 'source',
        label: 'Source',
        render: (row) => <Badge tone={row.source === 'Labour' ? 'labour' : 'expense'}>{row.source}</Badge>,
      },
      { key: 'name', label: 'Party / Labour' },
      { key: 'categoryName', label: 'Category / Dept' },
      {
        key: 'totalAmount',
        label: 'Amount',
        className: 'font-mono tabular-nums font-semibold',
        render: (row) => formatINR(row.totalAmount),
      },
    ],
  },
  profit: {
    title: 'Net Profit / Loss — Breakdown',
    manageHref: '/transactions',
    manageLabel: 'Manage transactions',
    empty: 'No P&L records for this FY.',
    placeholder: 'Search party, labour, category…',
    columns: [
      { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
      {
        key: 'type',
        label: 'Type',
        render: (row) => <Badge tone={row.type}>{row.type}</Badge>,
      },
      { key: 'name', label: 'Party / Labour' },
      { key: 'categoryName', label: 'Category / Dept' },
      {
        key: 'signedAmount',
        label: 'Impact',
        className: 'font-mono tabular-nums font-semibold',
        render: (row) => {
          const n = Number(row.signedAmount) || 0
          const cls = n >= 0 ? 'text-emerald-700' : 'text-rose-700'
          return <span className={cls}>{formatINR(n)}</span>
        },
      },
    ],
  },
  stock: {
    title: 'Stock Value — Balances',
    manageHref: '/production',
    manageLabel: 'Manage production',
    empty: 'No stock balances for this FY.',
    placeholder: 'Search category…',
    columns: [
      { key: 'categoryName', label: 'Category' },
      {
        key: 'netStock',
        label: 'Net Stock',
        className: 'font-mono tabular-nums font-semibold',
      },
      { key: 'unit', label: 'Unit' },
      {
        key: 'unitCost',
        label: 'Unit Cost',
        className: 'font-mono tabular-nums',
        render: (row) => formatINR(row.unitCost),
      },
      {
        key: 'value',
        label: 'Stock Value',
        className: 'font-mono tabular-nums font-semibold',
        render: (row) =>
          formatINR((Number(row.netStock) || 0) * (Number(row.unitCost) || 0)),
      },
    ],
  },
}

export default function MetricDrilldownModal({ open, kind, rows = [], totalLabel, totalValue, onClose }) {
  const config = CONFIG[kind] || CONFIG.income
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      filterRows(rows, {
        query: search,
        fields: SEARCH_FIELDS[kind] || SEARCH_FIELDS.income,
      }),
    [rows, search, kind],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${kind}|${search}|${open}`,
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.title}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <Link href={config.manageHref} className="btn-primary" onClick={onClose}>
            <ExternalLink className="h-4 w-4" />
            {config.manageLabel}
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {(totalLabel || totalValue != null) && (
          <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
            <span className="text-ink-500">{totalLabel || 'Total'}: </span>
            <strong className="font-mono tabular-nums text-ink-950">
              {typeof totalValue === 'number' ? formatINR(totalValue) : totalValue}
            </strong>
            <span className="ml-2 text-ink-400">· {rows.length} record(s)</span>
          </div>
        )}
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder={config.placeholder || 'Search…'}
        />
        <Table
          columns={config.columns}
          data={pageData}
          emptyMessage={rows.length ? 'No records match your search.' : config.empty}
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
    </Modal>
  )
}
