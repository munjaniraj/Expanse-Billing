'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { Loader2, Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useToast } from '@/context/ToastContext'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { usePagination } from '@/hooks/usePagination'
import {
  saveLabourEntryWithAdvance,
  deleteLabourEntryWithAdvance,
  availableAdvanceBalance,
  suggestAdvanceDeduction,
} from '@/hooks/useLabourAdvances'
import { formatINR } from '@/utils/currencyFormatter'
import { sortByDateDesc } from '@/utils/sortByDate'
import { filterRows } from '@/utils/filterRows'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import Modal from '@/components/common/Modal'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

const DEPARTMENTS = ['Cutting', 'Stitching', 'Packing', 'Dyeing', 'Loading']
const WORK_TYPES = ['Piece Rate', 'Daily Wage', 'Contract']

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  labourId: '',
  department: 'Stitching',
  workType: 'Piece Rate',
  quantity: '',
  rate: '',
  overtimeAmount: '0',
  advanceDeduction: '0',
  paymentStatus: 'Pending',
}

function toDateInput(value) {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  if (!d || Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function rowToForm(row) {
  return {
    date: toDateInput(row.date),
    labourId: row.labourId || '',
    department: row.department || 'Stitching',
    workType: row.workType || 'Piece Rate',
    quantity: String(row.quantity ?? ''),
    rate: String(row.rate ?? ''),
    overtimeAmount: String(row.overtimeAmount ?? '0'),
    advanceDeduction: String(row.advanceDeduction ?? '0'),
    paymentStatus: row.paymentStatus || 'Pending',
  }
}

export default function LabourView() {
  const toast = useToast()
  const { financialYear } = useFinancialYear()
  const labourQuery = useMemo(
    () => query(collection(db, 'labour_entries'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const workersQuery = useMemo(() => collection(db, 'labour_workers'), [])
  const { data: rawEntries, loading, error } = useFirestoreQuery(labourQuery)
  const { data: workers } = useFirestoreQuery(workersQuery)
  const entries = useMemo(() => sortByDateDesc(rawEntries, 'date'), [rawEntries])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [autoDeduct, setAutoDeduct] = useState(true)

  const activeWorkers = useMemo(
    () =>
      workers
        .filter((w) => !w.status || w.status === 'active')
        .sort((a, b) => {
          const codeCmp = String(a.code || '').localeCompare(String(b.code || ''))
          if (codeCmp !== 0) return codeCmp
          return String(a.name || '').localeCompare(String(b.name || ''))
        }),
    [workers],
  )

  const filtered = useMemo(
    () =>
      filterRows(entries, {
        query: search,
        fields: ['labourName', 'labourCode', 'department', 'workType'],
        predicates: [
          (r) => deptFilter === 'all' || r.department === deptFilter,
          (r) => statusFilter === 'all' || r.paymentStatus === statusFilter,
        ],
      }),
    [entries, search, deptFilter, statusFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${search}|${deptFilter}|${statusFilter}`,
  })

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === form.labourId) || null,
    [workers, form.labourId],
  )

  const availableBalance = useMemo(
    () => availableAdvanceBalance(selectedWorker, editing),
    [selectedWorker, editing],
  )

  const gross =
    (Number(form.quantity) || 0) * (Number(form.rate) || 0) +
    (Number(form.overtimeAmount) || 0)

  const advanceDeduction = Number(form.advanceDeduction) || 0
  const netPayment = gross - advanceDeduction
  const cappedHint = suggestAdvanceDeduction(gross, availableBalance)

  // Auto-fill deduction when labour / earnings change (if auto mode on)
  useEffect(() => {
    if (!open || !autoDeduct || !form.labourId) return
    const suggested = suggestAdvanceDeduction(gross, availableBalance)
    setForm((p) => {
      if (String(p.advanceDeduction) === String(suggested)) return p
      return { ...p, advanceDeduction: String(suggested) }
    })
  }, [open, autoDeduct, form.labourId, gross, availableBalance])

  const openCreate = () => {
    setEditing(null)
    setAutoDeduct(true)
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setFormError('')
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setAutoDeduct(false)
    setForm(rowToForm(row))
    setFormError('')
    setOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setOpen(false)
    setEditing(null)
    setFormError('')
  }

  const handleLabourChange = (labourId) => {
    const worker = workers.find((w) => w.id === labourId)
    setAutoDeduct(true)
    setForm((p) => ({
      ...p,
      labourId,
      department: worker?.department && DEPARTMENTS.includes(worker.department)
        ? worker.department
        : p.department,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.labourId) {
      setFormError('Select a labour worker (Labour ID).')
      return
    }
    if (advanceDeduction > availableBalance + 0.001) {
      setFormError(
        `Advance deduction cannot exceed outstanding balance (${formatINR(availableBalance)}).`,
      )
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const result = await saveLabourEntryWithAdvance({
        entryId: editing?.id || null,
        previousEntry: editing,
        payload: {
          financialYear,
          date: Timestamp.fromDate(new Date(form.date)),
          labourId: form.labourId,
          labourName: selectedWorker?.name || '',
          department: form.department,
          workType: form.workType,
          quantity: Number(form.quantity) || 0,
          rate: Number(form.rate) || 0,
          overtimeAmount: Number(form.overtimeAmount) || 0,
          advanceDeduction,
          paymentStatus: form.paymentStatus,
        },
      })
      toast.success(
        editing
          ? `Labour entry updated${result.advanceDeduction ? ` · deducted ${formatINR(result.advanceDeduction)}` : ''}`
          : `Labour entry added${result.advanceDeduction ? ` · deducted ${formatINR(result.advanceDeduction)}` : ''}`,
      )
      closeModal()
      setForm(emptyForm)
    } catch (err) {
      const msg = err.message || 'Failed to save labour entry.'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting?.id) return
    setDeletingBusy(true)
    try {
      await deleteLabourEntryWithAdvance(deleting)
      toast.success('Labour entry deleted')
      setDeleting(null)
    } catch (err) {
      toast.error(err.message || 'Failed to delete labour entry.')
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (row) => {
        const d = row.date?.toDate?.() || null
        return d ? d.toLocaleDateString('en-IN') : '—'
      },
    },
    {
      key: 'labourCode',
      label: 'ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-ink-600">{row.labourCode || '—'}</span>
      ),
    },
    { key: 'labourName', label: 'Labour' },
    { key: 'department', label: 'Dept' },
    { key: 'workType', label: 'Work Type' },
    {
      key: 'advanceDeduction',
      label: 'Adv (−)',
      className: 'font-mono tabular-nums text-rose-700',
      render: (row) =>
        Number(row.advanceDeduction) > 0 ? formatINR(row.advanceDeduction) : '—',
    },
    {
      key: 'netPayment',
      label: 'Net Pay',
      className: 'font-mono tabular-nums font-semibold',
      render: (row) => formatINR(row.netPayment),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (row) => <Badge tone={row.paymentStatus}>{row.paymentStatus}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      stopPropagation: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-ink-500 hover:bg-teal-50 hover:text-teal-700"
            onClick={() => openEdit(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => setDeleting(row)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        description="Track piece-rate, daily wage and contract labour. Advance (−) is calculated per Labour ID."
        actions={
          <>
            <Link href="/labour/advances" className="btn-secondary">
              <Wallet className="h-4 w-4" />
              Advances
            </Link>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load labour entries.{' '}
          {error.message?.includes('index')
            ? 'A Firestore index is still required — open the link in the browser console to create it.'
            : error.message || 'Check Firebase configuration.'}
        </div>
      )}

      {loading ? (
        <div className="card flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      ) : (
        <SectionCard title="Labour Entries" subtitle={`Financial year ${financialYear}`}>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search labour ID, name, dept…"
            filters={[
              {
                id: 'department',
                value: deptFilter,
                onChange: setDeptFilter,
                options: [
                  { value: 'all', label: 'All departments' },
                  ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
                ],
              },
              {
                id: 'status',
                value: statusFilter,
                onChange: setStatusFilter,
                showIcon: false,
                className: 'w-36 flex-none',
                options: [
                  { value: 'all', label: 'All status' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Paid', label: 'Paid' },
                ],
              },
            ]}
          />
          <div className="mt-4">
            <Table
              columns={columns}
              data={pageData}
              emptyMessage={
                entries.length ? 'No labour entries match your search.' : 'No labour entries for this FY.'
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
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={editing ? 'Edit Labour Entry' : 'Labour Entry'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="labour-form" className="btn-primary" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                'Update Entry'
              ) : (
                'Save Entry'
              )}
            </button>
          </>
        }
      >
        <form id="labour-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          {formError && (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input-field"
              required
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Select Labour (all labour)</label>
            <select
              className="input-field"
              required
              value={form.labourId}
              onChange={(e) => handleLabourChange(e.target.value)}
            >
              <option value="">— Select labour —</option>
              {activeWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code || 'NO-ID'} — {w.name}
                  {w.department ? ` · ${w.department}` : ''}
                  {' · Adv '}
                  {formatINR(w.advanceBalance)}
                </option>
              ))}
              {editing?.labourId &&
                !activeWorkers.some((w) => w.id === editing.labourId) &&
                selectedWorker && (
                  <option value={selectedWorker.id}>
                    {selectedWorker.code || 'NO-ID'} — {selectedWorker.name} (inactive)
                  </option>
                )}
            </select>
            {selectedWorker && (
              <p className="mt-1 text-xs text-ink-500">
                Selected:{' '}
                <strong className="font-mono text-ink-800">{selectedWorker.code || '—'}</strong>
                {' — '}
                {selectedWorker.name}
                {' · '}
                Outstanding advance:{' '}
                <strong className="text-amber-700">{formatINR(availableBalance)}</strong>
              </p>
            )}
            {activeWorkers.length === 0 && (
              <p className="mt-1 text-xs text-ink-500">
                No labour in list.{' '}
                <Link href="/labour/advances" className="font-semibold text-teal-700 hover:underline">
                  Add labour / Sync on Advances
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="input-field"
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Work Type</label>
            <select
              className="input-field"
              value={form.workType}
              onChange={(e) => setForm((p) => ({ ...p, workType: e.target.value }))}
            >
              {WORK_TYPES.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity / Days</label>
            <input
              type="number"
              className="input-field"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Rate</label>
            <input
              type="number"
              className="input-field"
              value={form.rate}
              onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Overtime</label>
            <input
              type="number"
              className="input-field"
              value={form.overtimeAmount}
              onChange={(e) => setForm((p) => ({ ...p, overtimeAmount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Advance Deduction (−)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.advanceDeduction}
              onChange={(e) => {
                setAutoDeduct(false)
                setForm((p) => ({ ...p, advanceDeduction: e.target.value }))
              }}
            />
            {form.labourId && (
              <p className="mt-1 text-xs text-ink-500">
                Outstanding for this ID: <strong className="text-amber-700">{formatINR(availableBalance)}</strong>
                {cappedHint > 0 && (
                  <>
                    {' '}
                    · Auto (−):{' '}
                    <button
                      type="button"
                      className="font-semibold text-teal-700 hover:underline"
                      onClick={() => {
                        setAutoDeduct(true)
                        setForm((p) => ({ ...p, advanceDeduction: String(cappedHint) }))
                      }}
                    >
                      {formatINR(cappedHint)}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <div>
            <label className="label">Payment Status</label>
            <select
              className="input-field"
              value={form.paymentStatus}
              onChange={(e) => setForm((p) => ({ ...p, paymentStatus: e.target.value }))}
            >
              <option>Pending</option>
              <option>Paid</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
            <div className="flex-1 rounded-xl bg-sand-50 px-3 py-2.5 text-sm">
              Gross:{' '}
              <strong className="font-mono tabular-nums text-ink-950">{formatINR(gross)}</strong>
              <span className="mx-2 text-ink-300">·</span>
              Adv (−):{' '}
              <strong className="font-mono tabular-nums text-rose-700">{formatINR(advanceDeduction)}</strong>
              <span className="mx-2 text-ink-300">·</span>
              Net:{' '}
              <strong className="font-mono tabular-nums text-teal-800">{formatINR(netPayment)}</strong>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete labour entry?"
        message="Are you sure you want to delete this record? Any advance deduction will be restored to the labour balance."
        detail={
          deleting
            ? `${deleting.labourCode || ''} ${deleting.labourName || '—'}`.trim()
            : ''
        }
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}
