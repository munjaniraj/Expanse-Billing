'use client'

import { useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useToast } from '@/context/ToastContext'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { formatINR } from '@/utils/currencyFormatter'
import { sortByDateDesc } from '@/utils/sortByDate'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import Modal from '@/components/common/Modal'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

const DEPARTMENTS = ['Cutting', 'Stitching', 'Packing', 'Dyeing', 'Loading']
const WORK_TYPES = ['Piece Rate', 'Daily Wage', 'Contract']

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  labourName: '',
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
    labourName: row.labourName || '',
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
  // Filter by FY only (no orderBy) so Firestore does not require a composite index.
  const labourQuery = useMemo(
    () => query(collection(db, 'labour_entries'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const { data: rawEntries, loading, error } = useFirestoreQuery(labourQuery)
  const entries = useMemo(() => sortByDateDesc(rawEntries, 'date'), [rawEntries])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const netPayment =
    (Number(form.quantity) || 0) * (Number(form.rate) || 0) +
    (Number(form.overtimeAmount) || 0) -
    (Number(form.advanceDeduction) || 0)

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setFormError('')
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        financialYear,
        date: Timestamp.fromDate(new Date(form.date)),
        labourName: form.labourName.trim(),
        department: form.department,
        workType: form.workType,
        quantity: Number(form.quantity) || 0,
        rate: Number(form.rate) || 0,
        overtimeAmount: Number(form.overtimeAmount) || 0,
        advanceDeduction: Number(form.advanceDeduction) || 0,
        netPayment,
        paymentStatus: form.paymentStatus,
      }
      if (editing?.id) {
        await updateDoc(doc(db, 'labour_entries', editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        })
        toast.success('Labour entry updated')
      } else {
        await addDoc(collection(db, 'labour_entries'), {
          ...payload,
          createdAt: serverTimestamp(),
        })
        toast.success('Labour entry added')
      }
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
      await deleteDoc(doc(db, 'labour_entries', deleting.id))
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
    { key: 'labourName', label: 'Labour' },
    { key: 'department', label: 'Dept' },
    { key: 'workType', label: 'Work Type' },
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">Track piece-rate, daily wage and contract labour.</p>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load labour entries.{' '}
          {error.message?.includes('index')
            ? 'A Firestore index is still required — open the link in the browser console to create it.'
            : error.message || 'Check Firebase configuration.'}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <Table columns={columns} data={entries} emptyMessage="No labour entries for this FY." />
        </div>
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
            <label className="label">Labour Name</label>
            <input
              className="input-field"
              required
              value={form.labourName}
              onChange={(e) => setForm((p) => ({ ...p, labourName: e.target.value }))}
            />
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
            <label className="label">Advance Deduction</label>
            <input
              type="number"
              className="input-field"
              value={form.advanceDeduction}
              onChange={(e) => setForm((p) => ({ ...p, advanceDeduction: e.target.value }))}
            />
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
          <div className="flex items-end">
            <div className="w-full rounded-xl bg-teal-50 px-3 py-2.5 text-sm">
              Net Payment:{' '}
              <strong className="font-mono tabular-nums text-teal-800">{formatINR(netPayment)}</strong>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete labour entry?"
        message="Are you sure you want to delete this record?"
        detail={deleting ? `Labour: ${deleting.labourName || '—'}` : ''}
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}
