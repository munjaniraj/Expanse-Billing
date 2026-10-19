'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
import { Loader2, Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useToast } from '@/context/ToastContext'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { usePagination } from '@/hooks/usePagination'
import { formatINR } from '@/utils/currencyFormatter'
import { sortByDateDesc } from '@/utils/sortByDate'
import { filterRows } from '@/utils/filterRows'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import StatGrid from '@/components/common/StatGrid'
import Modal from '@/components/common/Modal'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  dueDate: '',
  categoryId: '',
  vendorName: '',
  billNumber: '',
  amount: '',
  paidAmount: '',
  paymentMethod: 'Bank Transfer',
  notes: '',
}

function toDateInput(value) {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function computePayment(amount, paidAmount) {
  const total = Number(amount) || 0
  const paid = Number(paidAmount) || 0
  const pending = Math.max(total - paid, 0)
  let paymentStatus = 'Pending'
  if (total > 0 && pending <= 0) paymentStatus = 'Paid'
  else if (paid > 0) paymentStatus = 'Partially Paid'
  return { pendingAmount: pending, paymentStatus }
}

function rowToForm(row) {
  return {
    date: toDateInput(row.date) || new Date().toISOString().slice(0, 10),
    dueDate: toDateInput(row.dueDate),
    categoryId: row.categoryId || '',
    vendorName: row.vendorName || '',
    billNumber: row.billNumber || '',
    amount: String(row.amount ?? ''),
    paidAmount: String(row.paidAmount ?? ''),
    paymentMethod: row.paymentMethod || 'Bank Transfer',
    notes: row.notes || '',
  }
}

export default function BillsView() {
  const toast = useToast()
  const { financialYear } = useFinancialYear()

  const billsQuery = useMemo(
    () => query(collection(db, 'bills'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const catsQuery = useMemo(
    () => query(collection(db, 'categories'), where('type', '==', 'bill')),
    [],
  )

  const { data: rawBills, loading, error } = useFirestoreQuery(billsQuery)
  const { data: billCategories, loading: catsLoading } = useFirestoreQuery(catsQuery)
  const bills = useMemo(() => sortByDateDesc(rawBills, 'date'), [rawBills])

  const activeCategories = useMemo(
    () =>
      billCategories
        .filter((c) => c.status !== 'inactive')
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [billCategories],
  )

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const filtered = useMemo(
    () =>
      filterRows(bills, {
        query: search,
        fields: ['vendorName', 'billNumber', 'categoryName', 'notes', 'paymentMethod'],
        predicates: [
          (b) => categoryFilter === 'all' || b.categoryId === categoryFilter,
          (b) => statusFilter === 'all' || b.paymentStatus === statusFilter,
        ],
      }),
    [bills, search, categoryFilter, statusFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${search}|${categoryFilter}|${statusFilter}|${financialYear}`,
  })

  const stats = useMemo(() => {
    const totalAmount = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0)
    const paid = bills.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0)
    const pending = bills.reduce((s, b) => s + (Number(b.pendingAmount) || 0), 0)
    return {
      count: bills.length,
      categories: activeCategories.length,
      totalAmount,
      paid,
      pending,
    }
  }, [bills, activeCategories])

  const computed = useMemo(
    () => computePayment(form.amount, form.paidAmount),
    [form.amount, form.paidAmount],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
      categoryId: activeCategories[0]?.id || '',
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
      setFormError('Select a bill category.')
      return
    }
    const amount = Number(form.amount) || 0
    if (!(amount > 0)) {
      setFormError('Bill amount must be greater than zero.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const cat = billCategories.find((c) => c.id === form.categoryId)
      const { pendingAmount, paymentStatus } = computePayment(form.amount, form.paidAmount)
      const payload = {
        financialYear,
        date: Timestamp.fromDate(new Date(form.date)),
        dueDate: form.dueDate ? Timestamp.fromDate(new Date(form.dueDate)) : null,
        categoryId: form.categoryId,
        categoryName: cat?.name || '',
        categoryCode: cat?.code || '',
        vendorName: form.vendorName.trim(),
        billNumber: form.billNumber.trim(),
        amount,
        paidAmount: Number(form.paidAmount) || 0,
        pendingAmount,
        paymentStatus,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      }

      if (editing?.id) {
        await updateDoc(doc(db, 'bills', editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        })
        toast.success(`Bill updated · ${payload.categoryName || 'Bill'}`)
      } else {
        await addDoc(collection(db, 'bills'), {
          ...payload,
          createdAt: serverTimestamp(),
        })
        toast.success(`Bill added · ${payload.categoryName || 'Bill'}`)
      }
      closeModal()
      setForm(emptyForm)
    } catch (err) {
      const msg = err.message || 'Failed to save bill.'
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
      await deleteDoc(doc(db, 'bills', deleting.id))
      toast.success('Bill deleted')
      setDeleting(null)
    } catch (err) {
      toast.error(err.message || 'Failed to delete bill.')
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
      key: 'categoryName',
      label: 'Bill Category',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-950">{row.categoryName || '—'}</p>
          <p className="font-mono text-xs text-ink-400">{row.categoryCode || ''}</p>
        </div>
      ),
    },
    { key: 'vendorName', label: 'Vendor' },
    {
      key: 'billNumber',
      label: 'Bill No.',
      render: (row) => <span className="font-mono text-xs">{row.billNumber || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'font-mono tabular-nums font-semibold',
      render: (row) => formatINR(row.amount),
    },
    {
      key: 'pendingAmount',
      label: 'Pending',
      className: 'font-mono tabular-nums text-amber-700',
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

  return (
    <div className="space-y-5">
      <PageHeader
        description="Record utility and vendor bills by Bill Category. Track amount, paid and pending for the selected FY."
        actions={
          <>
            <Link href="/categories" className="btn-secondary">
              <FileText className="h-4 w-4" />
              Bill Categories
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={openCreate}
              disabled={!activeCategories.length && !catsLoading}
            >
              <Plus className="h-4 w-4" />
              Add Bill
            </button>
          </>
        }
      />

      <StatGrid
        items={[
          { label: 'Bills', value: stats.count },
          { label: 'Bill Categories', value: stats.categories, colorClass: 'text-sky-700' },
          { label: 'Total Amount', value: formatINR(stats.totalAmount) },
          { label: 'Pending', value: formatINR(stats.pending), colorClass: 'text-amber-700' },
        ]}
      />

      {!catsLoading && activeCategories.length === 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          No bill categories yet. Create categories with type <strong>Bill</strong> in{' '}
          <Link href="/categories" className="font-semibold underline">
            Category Master
          </Link>
          {' '}
          (e.g. Electricity, Gas, Water, Internet, Rent), then add bills here.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load bills.{' '}
          {error.message?.includes('index')
            ? 'A Firestore index may be required — check the browser console link.'
            : error.message || 'Check Firebase configuration.'}
        </div>
      )}

      {loading ? (
        <div className="card flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      ) : (
        <SectionCard title="Bills" subtitle={`Financial year ${financialYear}`}>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search vendor, bill no., category…"
            filters={[
              {
                id: 'category',
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: [
                  { value: 'all', label: 'All categories' },
                  ...activeCategories.map((c) => ({
                    value: c.id,
                    label: c.code ? `${c.code} — ${c.name}` : c.name,
                  })),
                ],
              },
              {
                id: 'status',
                value: statusFilter,
                onChange: setStatusFilter,
                showIcon: false,
                className: 'w-40 flex-none',
                options: [
                  { value: 'all', label: 'All status' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Partially Paid', label: 'Partially Paid' },
                  { value: 'Pending', label: 'Pending' },
                ],
              },
            ]}
          />
          <div className="mt-4">
            <Table
              columns={columns}
              data={pageData}
              emptyMessage={
                bills.length ? 'No bills match your search.' : 'No bills for this FY yet. Click Add Bill.'
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
        title={editing ? 'Edit Bill' : 'New Bill'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="bill-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update Bill' : 'Save Bill'}
            </button>
          </>
        }
      >
        <form id="bill-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          {formError && (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Bill Date</label>
            <input
              type="date"
              className="input-field"
              required
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input-field"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Bill Category</label>
            <select
              className="input-field"
              required
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
            >
              <option value="">Select bill category</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ` : ''}
                  {c.name}
                </option>
              ))}
              {editing?.categoryId &&
                !activeCategories.some((c) => c.id === editing.categoryId) && (
                  <option value={editing.categoryId}>
                    {editing.categoryName || 'Category'} (inactive)
                  </option>
                )}
            </select>
            {activeCategories.length === 0 && (
              <p className="mt-1 text-xs text-ink-500">
                Create a category with type <strong>Bill</strong> in Category Master first.
              </p>
            )}
          </div>

          <div>
            <label className="label">Vendor / Party</label>
            <input
              className="input-field"
              required
              value={form.vendorName}
              onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))}
              placeholder="e.g. Torrent Power"
            />
          </div>
          <div>
            <label className="label">Bill Number</label>
            <input
              className="input-field"
              value={form.billNumber}
              onChange={(e) => setForm((p) => ({ ...p, billNumber: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="label">Bill Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              required
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Paid Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.paidAmount}
              onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Payment Method</label>
            <select
              className="input-field"
              value={form.paymentMethod}
              onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
            >
              {['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Auto-debit'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-xl bg-sand-50 px-3 py-2.5 text-sm">
              Pending:{' '}
              <strong className="font-mono tabular-nums text-amber-700">
                {formatINR(computed.pendingAmount)}
              </strong>
              <span className="mx-2 text-ink-300">·</span>
              <Badge tone={computed.paymentStatus}>{computed.paymentStatus}</Badge>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              className="input-field min-h-[70px]"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete bill?"
        message="Are you sure you want to delete this bill record?"
        detail={
          deleting
            ? `${deleting.categoryName || 'Bill'} · ${deleting.vendorName || '—'} · ${formatINR(deleting.amount)}`
            : ''
        }
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}
