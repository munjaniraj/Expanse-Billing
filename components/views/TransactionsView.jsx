'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  type: 'income',
  categoryId: '',
  partyName: '',
  invoiceNumber: '',
  quantity: '',
  unit: 'Mtr',
  rate: '',
  discount: '0',
  gstAmount: '0',
  paidReceivedAmount: '',
  paymentMethod: 'Bank Transfer',
  notes: '',
}

const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

function toDateInput(value) {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  if (!d || Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function rowToForm(row) {
  return {
    date: toDateInput(row.date),
    type: row.type || 'income',
    categoryId: row.categoryId || '',
    partyName: row.partyName || '',
    invoiceNumber: row.invoiceNumber || '',
    quantity: String(row.quantity ?? ''),
    unit: row.unit || 'Mtr',
    rate: String(row.rate ?? ''),
    discount: String(row.discount ?? '0'),
    gstAmount: String(row.gstAmount ?? '0'),
    paidReceivedAmount: String(row.paidReceivedAmount ?? ''),
    paymentMethod: row.paymentMethod || 'Bank Transfer',
    notes: row.notes || '',
  }
}

export default function TransactionsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { financialYear } = useFinancialYear()
  // Filter by FY only (no orderBy) so Firestore does not require a composite index.
  const txQuery = useMemo(
    () => query(collection(db, 'transactions'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const catsQuery = useMemo(() => collection(db, 'categories'), [])
  const { data: rawTransactions, loading, error } = useFirestoreQuery(txQuery)
  const transactions = useMemo(() => sortByDateDesc(rawTransactions, 'date'), [rawTransactions])
  const { data: categories } = useFirestoreQuery(catsQuery)

  const [typeFilter, setTypeFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const t = searchParams.get('type')
    if (t === 'income' || t === 'expense' || t === 'all') setTypeFilter(t)
  }, [searchParams])

  const setFilter = (value) => {
    setTypeFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('type')
    else params.set('type', value)
    const qs = params.toString()
    router.replace(qs ? `/transactions?${qs}` : '/transactions', { scroll: false })
  }

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return transactions
    return transactions.filter((t) => t.type === typeFilter)
  }, [transactions, typeFilter])

  const filteredCats = categories.filter(
    (c) => c.status === 'active' && (c.type === form.type || c.type === 'production'),
  )

  const computed = useMemo(() => {
    const qty = Number(form.quantity) || 0
    const rate = Number(form.rate) || 0
    const discount = Number(form.discount) || 0
    const gstAmount = Number(form.gstAmount) || 0
    const totalAmount = qty * rate - discount + gstAmount
    const paidReceivedAmount = Number(form.paidReceivedAmount) || 0
    const pendingAmount = Math.max(totalAmount - paidReceivedAmount, 0)
    let paymentStatus = 'Pending'
    if (pendingAmount <= 0 && totalAmount > 0) paymentStatus = 'Paid'
    else if (paidReceivedAmount > 0) paymentStatus = 'Partially Paid'
    return { totalAmount, pendingAmount, paymentStatus }
  }, [form])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      type: typeFilter === 'expense' ? 'expense' : 'income',
      date: new Date().toISOString().slice(0, 10),
    })
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
    if (!form.categoryId) {
      setFormError('Select a category.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const cat = categories.find((c) => c.id === form.categoryId)
      const payload = {
        financialYear,
        date: Timestamp.fromDate(new Date(form.date)),
        type: form.type,
        categoryId: form.categoryId,
        categoryName: cat?.name || '',
        partyName: form.partyName.trim(),
        invoiceNumber: form.invoiceNumber.trim(),
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        rate: Number(form.rate) || 0,
        discount: Number(form.discount) || 0,
        gstAmount: Number(form.gstAmount) || 0,
        totalAmount: computed.totalAmount,
        paidReceivedAmount: Number(form.paidReceivedAmount) || 0,
        pendingAmount: computed.pendingAmount,
        paymentStatus: computed.paymentStatus,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      }
      if (editing?.id) {
        await updateDoc(doc(db, 'transactions', editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        })
        toast.success('Transaction updated')
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...payload,
          createdAt: serverTimestamp(),
        })
        toast.success('Transaction added')
      }
      closeModal()
      setForm(emptyForm)
    } catch (err) {
      const msg = err.message || 'Failed to save transaction.'
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
      await deleteDoc(doc(db, 'transactions', deleting.id))
      toast.success('Transaction deleted')
      setDeleting(null)
    } catch (err) {
      toast.error(err.message || 'Failed to delete transaction.')
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (row) => {
        const d = row.date?.toDate?.() || (row.date ? new Date(row.date) : null)
        return d ? d.toLocaleDateString('en-IN') : '—'
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <Badge tone={row.type}>{row.type}</Badge>,
    },
    { key: 'categoryName', label: 'Category' },
    { key: 'partyName', label: 'Party' },
    {
      key: 'totalAmount',
      label: 'Total',
      className: 'font-mono tabular-nums font-semibold',
      render: (row) => formatINR(row.totalAmount),
    },
    {
      key: 'pendingAmount',
      label: 'Pending',
      className: 'font-mono tabular-nums',
      render: (row) => formatINR(row.pendingAmount),
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

  const filterLabel =
    typeFilter === 'income' ? 'income' : typeFilter === 'expense' ? 'expense' : 'transaction'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-ink-500">Income & expense vouchers for the selected FY.</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  typeFilter === tab.value
                    ? 'bg-teal-700 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load transactions.{' '}
          {error.message?.includes('index')
            ? 'A Firestore index is still required — open the link in the browser console to create it.'
            : error.message || 'Check Firebase configuration.'}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <Table
            columns={columns}
            data={filtered}
            emptyMessage={`No ${filterLabel} records yet.`}
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={editing ? 'Edit Transaction' : 'New Transaction'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="tx-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Save'}
            </button>
          </>
        }
      >
        <form id="tx-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          {formError && (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <Field label="Date">
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
          </Field>
          <Field label="Type">
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, categoryId: '' }))}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <select
              className="input-field"
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Party Name">
            <input
              className="input-field"
              value={form.partyName}
              onChange={(e) => setForm((p) => ({ ...p, partyName: e.target.value }))}
              required
            />
          </Field>
          <Field label="Invoice No.">
            <input
              className="input-field"
              value={form.invoiceNumber}
              onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              className="input-field"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </Field>
          <Field label="Unit">
            <select
              className="input-field"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            >
              {['Mtr', 'Kg', 'Pcs', 'Bales'].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate">
            <input
              type="number"
              className="input-field"
              value={form.rate}
              onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
            />
          </Field>
          <Field label="Discount">
            <input
              type="number"
              className="input-field"
              value={form.discount}
              onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
            />
          </Field>
          <Field label="GST Amount">
            <input
              type="number"
              className="input-field"
              value={form.gstAmount}
              onChange={(e) => setForm((p) => ({ ...p, gstAmount: e.target.value }))}
            />
          </Field>
          <Field label="Paid / Received">
            <input
              type="number"
              className="input-field"
              value={form.paidReceivedAmount}
              onChange={(e) => setForm((p) => ({ ...p, paidReceivedAmount: e.target.value }))}
            />
          </Field>
          <Field label="Payment Method">
            <select
              className="input-field"
              value={form.paymentMethod}
              onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
            >
              {['Bank Transfer', 'Cheque', 'Cash'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 rounded-xl bg-sand-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <span>
                Total:{' '}
                <strong className="font-mono tabular-nums text-ink-950">{formatINR(computed.totalAmount)}</strong>
              </span>
              <span>
                Pending:{' '}
                <strong className="font-mono tabular-nums text-amber-700">{formatINR(computed.pendingAmount)}</strong>
              </span>
              <Badge tone={computed.paymentStatus}>{computed.paymentStatus}</Badge>
            </div>
          </div>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              className="input-field min-h-[70px]"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete transaction?"
        message="Are you sure you want to delete this record?"
        detail={
          deleting
            ? `${deleting.type || 'Transaction'} · ${deleting.partyName || '—'} · ${deleting.categoryName || ''}`
            : ''
        }
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
