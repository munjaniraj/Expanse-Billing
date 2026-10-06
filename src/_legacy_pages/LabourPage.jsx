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

export default function LabourPage() {
  const { financialYear } = useFinancialYear()
  const labourQuery = useMemo(
    () =>
      query(
        collection(db, 'labour_entries'),
        where('financialYear', '==', financialYear),
        orderBy('date', 'desc'),
      ),
    [financialYear],
  )
  const { data: entries, loading, error } = useFirestoreQuery(labourQuery)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const netPayment =
    (Number(form.quantity) || 0) * (Number(form.rate) || 0) +
    (Number(form.overtimeAmount) || 0) -
    (Number(form.advanceDeduction) || 0)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await addDoc(collection(db, 'labour_entries'), {
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
        createdAt: serverTimestamp(),
      })
      setOpen(false)
      setForm(emptyForm)
    } catch (err) {
      alert(err.message || 'Failed to save labour entry.')
    } finally {
      setSaving(false)
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
      className: 'tabular-nums font-semibold',
      render: (row) => formatINR(row.netPayment),
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
        <p className="text-sm text-slate-500">Track piece-rate, daily wage and contract labour.</p>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load labour entries. Configure Firebase / create index if prompted.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <Table columns={columns} data={entries} emptyMessage="No labour entries for this FY." />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="Labour Entry"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="labour-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Entry'}
            </button>
          </>
        }
      >
        <form id="labour-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
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
            <div className="w-full rounded-xl bg-indigo-50 px-3 py-2.5 text-sm">
              Net Payment:{' '}
              <strong className="tabular-nums text-indigo-800">{formatINR(netPayment)}</strong>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
