import { useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Tags,
  Loader2,
} from 'lucide-react'
import { db } from '../../services/firebase'
import { useFirestoreQuery } from '../../hooks/useFirestoreQuery'
import Badge from '../common/Badge'
import Table from '../common/Table'
import CategoryFormModal from './CategoryFormModal'

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'labour', label: 'Labour' },
  { value: 'production', label: 'Production' },
]

export default function CategoryList() {
  const categoriesQuery = useMemo(
    () => query(collection(db, 'categories'), orderBy('createdAt', 'desc')),
    [],
  )
  const { data: categories, loading, error } = useFirestoreQuery(categoriesQuery)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories.filter((c) => {
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q)
      const matchType = typeFilter === 'all' || c.type === typeFilter
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [categories, search, typeFilter, statusFilter])

  const counts = useMemo(() => {
    return {
      total: categories.length,
      income: categories.filter((c) => c.type === 'income').length,
      expense: categories.filter((c) => c.type === 'expense').length,
      labour: categories.filter((c) => c.type === 'labour').length,
      production: categories.filter((c) => c.type === 'production').length,
    }
  }, [categories])

  const openCreate = () => {
    setEditing(null)
    setActionError('')
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setActionError('')
    setModalOpen(true)
  }

  const handleSave = async (form) => {
    setSaving(true)
    setActionError('')
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        code: form.code.trim().toUpperCase(),
        status: form.status,
      }
      if (editing?.id) {
        await updateDoc(doc(db, 'categories', editing.id), payload)
      } else {
        await addDoc(collection(db, 'categories'), {
          ...payload,
          createdAt: serverTimestamp(),
        })
      }
      setModalOpen(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      setActionError(err.message || 'Failed to save category. Check Firebase config & rules.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    const ok = window.confirm(`Delete category "${row.name}"? This cannot be undone.`)
    if (!ok) return
    try {
      await deleteDoc(doc(db, 'categories', row.id))
    } catch (err) {
      console.error(err)
      setActionError(err.message || 'Failed to delete category.')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Category',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-400 sm:hidden">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      className: 'hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      render: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <Badge tone={row.type}>{row.type}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge tone={row.status}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
            onClick={() => openEdit(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => handleDelete(row)}
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Total', counts.total, 'slate'],
          ['Income', counts.income, 'emerald'],
          ['Expense', counts.expense, 'rose'],
          ['Labour', counts.labour, 'amber'],
          ['Production', counts.production, 'indigo'],
        ].map(([label, value, tone]) => (
          <div key={label} className="card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                tone === 'emerald'
                  ? 'text-emerald-600'
                  : tone === 'rose'
                    ? 'text-rose-600'
                    : tone === 'amber'
                      ? 'text-amber-600'
                      : tone === 'indigo'
                        ? 'text-indigo-600'
                        : 'text-slate-900'
              }`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-10"
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-40">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="input-field pl-9"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {TYPE_FILTERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="input-field w-32"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        {(error || actionError) && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {actionError ||
              error?.message ||
              'Could not load categories. Add your Firebase keys in .env and enable Firestore.'}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Loading categories…
            </div>
          ) : (
            <Table
              columns={columns}
              data={filtered}
              emptyMessage={
                categories.length === 0
                  ? 'No categories yet. Create your first income/expense/labour/production category.'
                  : 'No categories match your filters.'
              }
            />
          )}
        </div>

        {!loading && categories.length === 0 && !error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-800">
            <Tags className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Tip: Start with production yarn/fabric categories, then income (sales) and expense
              (power, rent, labour) so the dashboard and Excel matrix populate correctly.
            </p>
          </div>
        )}
      </div>

      <CategoryFormModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
        initial={editing}
        saving={saving}
      />
    </div>
  )
}
