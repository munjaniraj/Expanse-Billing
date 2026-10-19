'use client'

import { useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { Plus, Pencil, Trash2, Tags, Loader2 } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { usePagination } from '@/hooks/usePagination'
import { useToast } from '@/context/ToastContext'
import { filterRows } from '@/utils/filterRows'
import Badge from '@/components/common/Badge'
import Table from '@/components/common/Table'
import SearchFilterBar from '@/components/common/SearchFilterBar'
import Pagination from '@/components/common/Pagination'
import StatGrid from '@/components/common/StatGrid'
import SectionCard from '@/components/common/SectionCard'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'
import CategoryFormModal from './CategoryFormModal'

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'labour', label: 'Labour' },
  { value: 'production', label: 'Production' },
  { value: 'bill', label: 'Bill' },
]

export default function CategoryList() {
  const toast = useToast()
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
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const filtered = useMemo(
    () =>
      filterRows(categories, {
        query: search,
        fields: ['name', 'code'],
        predicates: [
          (c) => typeFilter === 'all' || c.type === typeFilter,
          (c) => statusFilter === 'all' || c.status === statusFilter,
        ],
      }),
    [categories, search, typeFilter, statusFilter],
  )

  const {
    page, setPage, pageSize, setPageSize, pageData, total, totalPages, from, to,
  } = usePagination(filtered, {
    initialPageSize: 10,
    resetKey: `${search}|${typeFilter}|${statusFilter}`,
  })

  const counts = useMemo(() => ({
    total: categories.length,
    income: categories.filter((c) => c.type === 'income').length,
    expense: categories.filter((c) => c.type === 'expense').length,
    labour: categories.filter((c) => c.type === 'labour').length,
    production: categories.filter((c) => c.type === 'production').length,
    bill: categories.filter((c) => c.type === 'bill').length,
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
      if (editing?.id) {
        await updateDoc(doc(db, 'categories', editing.id), payload)
        toast.success(`Category "${payload.name}" updated`)
      } else {
        await addDoc(collection(db, 'categories'), { ...payload, createdAt: serverTimestamp() })
        toast.success(`Category "${payload.name}" added`)
      }
      setModalOpen(false)
      setEditing(null)
    } catch (err) {
      const msg = err.message || 'Failed to save category.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting?.id) return
    setDeletingBusy(true)
    setActionError('')
    try {
      await deleteDoc(doc(db, 'categories', deleting.id))
      toast.success(`Category "${deleting.name}" deleted`)
      setDeleting(null)
    } catch (err) {
      const msg = err.message || 'Failed to delete category.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setDeletingBusy(false)
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
          <button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleting(row)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <StatGrid
        columns={3}
        items={[
          { label: 'Total', value: counts.total },
          { label: 'Income', value: counts.income, colorClass: 'text-emerald-700' },
          { label: 'Expense', value: counts.expense, colorClass: 'text-rose-600' },
          { label: 'Labour', value: counts.labour, colorClass: 'text-amber-600' },
          { label: 'Production', value: counts.production, colorClass: 'text-teal-700' },
          { label: 'Bill', value: counts.bill, colorClass: 'text-sky-700' },
        ]}
      />

      <SectionCard title="Category Master" subtitle="Search, filter and manage income, expense, labour and production categories">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name or code…"
          filters={[
            {
              id: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: TYPE_FILTERS,
            },
            {
              id: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              showIcon: false,
              className: 'w-32 flex-none',
              options: [
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ],
            },
          ]}
          actions={
            <button type="button" className="btn-primary shrink-0" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="h-4 w-4" /> Add Category
            </button>
          }
        />

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
            <>
              <Table
                columns={columns}
                data={pageData}
                emptyMessage={categories.length ? 'No categories match your search.' : 'No categories yet.'}
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
            </>
          )}
        </div>

        {!loading && categories.length === 0 && !error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
            <Tags className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Tip: Add production, income, expense and bill categories (Electricity, Gas, etc.) so dashboard, bills and Excel matrix populate correctly.</p>
          </div>
        )}
      </SectionCard>

      <CategoryFormModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
        initial={editing}
        saving={saving}
      />

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete category?"
        message="Are you sure you want to delete this record?"
        detail={deleting ? `Category: ${deleting.name || '—'} (${deleting.type || ''})` : ''}
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}
