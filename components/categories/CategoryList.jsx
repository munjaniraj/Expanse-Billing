'use client'

import { useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { Plus, Pencil, Trash2, Search, Filter, Tags, Loader2 } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
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
      const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
      const matchType = typeFilter === 'all' || c.type === typeFilter
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [categories, search, typeFilter, statusFilter])

  const counts = useMemo(() => ({
    total: categories.length,
    income: categories.filter((c) => c.type === 'income').length,
    expense: categories.filter((c) => c.type === 'expense').length,
    labour: categories.filter((c) => c.type === 'labour').length,
    production: categories.filter((c) => c.type === 'production').length,
  }), [categories])

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
      if (editing?.id) await updateDoc(doc(db, 'categories', editing.id), payload)
      else await addDoc(collection(db, 'categories'), { ...payload, createdAt: serverTimestamp() })
      setModalOpen(false)
      setEditing(null)
    } catch (err) {
      setActionError(err.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return
    try {
      await deleteDoc(doc(db, 'categories', row.id))
    } catch (err) {
      setActionError(err.message || 'Failed to delete category.')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Category',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-950">{row.name}</p>
          <p className="text-xs text-ink-400 sm:hidden">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      className: 'hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      render: (row) => <span className="font-mono text-xs text-ink-600">{row.code}</span>,
    },
    { key: 'type', label: 'Type', render: (row) => <Badge tone={row.type}>{row.type}</Badge> },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-teal-50 hover:text-teal-700" onClick={() => { setEditing(row); setModalOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(row)}>
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
          ['Total', counts.total, 'text-ink-950'],
          ['Income', counts.income, 'text-emerald-700'],
          ['Expense', counts.expense, 'text-rose-600'],
          ['Labour', counts.labour, 'text-amber-600'],
          ['Production', counts.production, 'text-teal-700'],
        ].map(([label, value, color]) => (
          <div key={label} className="card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
            <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input className="input-field pl-10" placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-40">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <select className="input-field pl-9" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  {TYPE_FILTERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <select className="input-field w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn-primary shrink-0" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>

        {(error || actionError) && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {actionError || error?.message || 'Could not load categories.'}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" /> Loading categories…
            </div>
          ) : (
            <Table columns={columns} data={filtered} emptyMessage="No categories yet." />
          )}
        </div>

        {!loading && categories.length === 0 && !error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
            <Tags className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Tip: Start with production categories, then income and expense so the dashboard and Excel matrix populate correctly.</p>
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
