'use client'

import { useMemo, useState, useEffect } from 'react'
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

function sourceTone(source) {
  if (source === 'Labour') return 'labour'
  if (source === 'Bill') return 'bill'
  if (source === 'Expense') return 'expense'
  return 'default'
}

function typeTone(type) {
  if (type === 'labour') return 'labour'
  if (type === 'bill') return 'bill'
  if (type === 'expense') return 'expense'
  if (type === 'income') return 'income'
  return type
}

const SEARCH_FIELDS = {
  income: ['categoryName', 'partyName', 'paymentStatus'],
  expense: ['source', 'name', 'department', 'detail', 'categoryName'],
  profit: ['type', 'name', 'department', 'categoryName'],
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
    manageHref: '/bills',
    manageLabel: 'Manage bills',
    empty: 'No expense, labour or bill records for this FY.',
    placeholder: 'Search party, labour, vendor, dept…',
    columns: [
      { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
      {
        key: 'source',
        label: 'Source',
        render: (row) => <Badge tone={sourceTone(row.source)}>{row.source}</Badge>,
      },
      {
        key: 'name',
        label: 'Party / Labour / Vendor',
        render: (row) => (
          <div>
            <p className="font-semibold text-ink-950">{row.name || '—'}</p>
            {row.detail && row.detail !== '—' ? (
              <p className="text-xs text-ink-400">{row.detail}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'department',
        label: 'Department / Category',
        render: (row) => {
          const label =
            row.source === 'Labour'
              ? 'Dept'
              : row.source === 'Bill'
                ? 'Bill category'
                : 'Category'
          return (
            <div>
              <p className="font-semibold text-ink-950">{row.department || row.categoryName || '—'}</p>
              <p className="text-xs text-ink-400">{label}</p>
            </div>
          )
        },
      },
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
    placeholder: 'Search party, labour, vendor, dept…',
    columns: [
      { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
      {
        key: 'type',
        label: 'Type',
        render: (row) => <Badge tone={typeTone(row.type)}>{row.type}</Badge>,
      },
      { key: 'name', label: 'Party / Labour / Vendor' },
      {
        key: 'department',
        label: 'Department / Category',
        render: (row) => row.department || row.categoryName || '—',
      },
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

const EXPENSE_SOURCE_FILTERS = [
  { value: 'all', label: 'All sources' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Labour', label: 'Labour' },
  { value: 'Bill', label: 'Bill' },
]

const PROFIT_TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'labour', label: 'Labour' },
  { value: 'bill', label: 'Bill' },
]

export default function MetricDrilldownModal({ open, kind, rows = [], totalLabel, totalValue, onClose }) {
  const config = CONFIG[kind] || CONFIG.income
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  useEffect(() => {
    if (open) {
      setSearch('')
      setSourceFilter('all')
    }
  }, [open, kind])

  const filtered = useMemo(
    () =>
      filterRows(rows, {
        query: search,
        fields: SEARCH_FIELDS[kind] || SEARCH_FIELDS.income,
        predicates: [
          (row) => {
            if (sourceFilter === 'all') return true
            if (kind === 'expense') return row.source === sourceFilter
            if (kind === 'profit') return row.type === sourceFilter
            return true
          },
        ],
      }),
    [rows, search, kind, sourceFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${kind}|${search}|${sourceFilter}|${open}`,
  })

  const manageLinks =
    kind === 'expense'
      ? [
          { href: '/transactions?type=expense', label: 'Expenses' },
          { href: '/labour', label: 'Labour' },
          { href: '/bills', label: 'Bills' },
        ]
      : null

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
          {manageLinks ? (
            <div className="flex flex-wrap gap-2">
              {manageLinks.map((link) => (
                <Link key={link.href} href={link.href} className="btn-secondary" onClick={onClose}>
                  <ExternalLink className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          ) : (
            <Link href={config.manageHref} className="btn-primary" onClick={onClose}>
              <ExternalLink className="h-4 w-4" />
              {config.manageLabel}
            </Link>
          )}
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
            <span className="ml-2 text-ink-400">
              · {filtered.length} of {rows.length} record(s)
            </span>
          </div>
        )}

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder={config.placeholder || 'Search…'}
          filters={
            kind === 'expense'
              ? [
                  {
                    id: 'source',
                    value: sourceFilter,
                    onChange: setSourceFilter,
                    options: EXPENSE_SOURCE_FILTERS,
                  },
                ]
              : kind === 'profit'
                ? [
                    {
                      id: 'type',
                      value: sourceFilter,
                      onChange: setSourceFilter,
                      options: PROFIT_TYPE_FILTERS,
                    },
                  ]
                : []
          }
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
