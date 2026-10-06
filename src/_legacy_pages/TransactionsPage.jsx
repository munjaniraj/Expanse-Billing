import { useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { Loader2, Plus } from 'lucide-react'
import { db } from '../services/firebase'
import { useFinancialYear } from '../context/FinancialYearContext'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'
import { formatINR } from '../utils/currencyFormatter'
import Badge from '../components/common/Badge'
import Table from '../components/common/Table'
import Modal from '../components/common/Modal'

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

export default function TransactionsPage() {
  const { financialYear } = useFinancialYear()
  const txQuery = useMemo(
    () =>
      query(
        collection(db, 'transactions'),
        where('financialYear', '==', financialYear),
        orderBy('date', 'desc'),
      ),
    [financialYear],
  )
  const catsQuery = useMemo(() => collection(db, 'categories'), [])
  const { data: transactions, loading, error } = useFirestoreQuery(txQuery)
  const { data: categories } = useFirestoreQuery(catsQuery)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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
      await addDoc(collection(db, 'transactions'), {
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
        createdAt: serverTimestamp(),
      })
      setOpen(false)
      setForm(emptyForm)
    } catch (err) {
      setFormError(err.message || 'Failed to save transaction.')
    } finally {
      setSaving(false)
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
      className: 'tabular-nums font-semibold',
      render: (row) => formatINR(row.totalAmount),
    },
    {
      key: 'pendingAmount',
      label: 'Pending',
      className: 'tabular-nums',
      render: (row) => formatINR(row.pendingAmount),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (row) => <Badge tone={row.paymentStatus}>{row.paymentStatus}</Badge>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Income & expense vouchers for the selected FY.</p>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load transactions. Configure Firebase / create the suggested index if asked.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <Table columns={columns} data={transactions} emptyMessage="No transactions yet." />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="New Transaction"
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="tx-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
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
          <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <span>
                Total:{' '}
                <strong className="tabular-nums text-slate-900">{formatINR(computed.totalAmount)}</strong>
              </span>
              <span>
                Pending:{' '}
                <strong className="tabular-nums text-amber-700">{formatINR(computed.pendingAmount)}</strong>
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
