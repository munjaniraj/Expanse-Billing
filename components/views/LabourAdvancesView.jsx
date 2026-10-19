'use client'

import { useMemo, useState } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { Loader2, Plus, Pencil, Wallet, ArrowLeft, UserRound, RefreshCw } from 'lucide-react'
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
import StatGrid from '@/components/common/StatGrid'
import SectionCard from '@/components/common/SectionCard'
import Modal from '@/components/common/Modal'
import {
  createLabourWorker,
  updateLabourWorker,
  giveLabourAdvance,
  syncLabourWorkersFromEntries,
  nextLabourCode,
} from '@/hooks/useLabourAdvances'

const DEPARTMENTS = ['Cutting', 'Stitching', 'Packing', 'Dyeing', 'Loading']

const emptyWorker = {
  name: '',
  code: '',
  department: 'Stitching',
  phone: '',
  status: 'active',
}

const emptyAdvance = {
  labourId: '',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  notes: '',
}

function isActiveWorker(w) {
  return !w.status || w.status === 'active'
}

function labourLabel(w) {
  const code = w.code || 'NO-ID'
  const dept = w.department ? ` · ${w.department}` : ''
  return `${code} — ${w.name || 'Unnamed'}${dept}`
}

export default function LabourAdvancesView() {
  const toast = useToast()
  const { financialYear } = useFinancialYear()

  const workersQuery = useMemo(() => collection(db, 'labour_workers'), [])
  const entriesQuery = useMemo(
    () => query(collection(db, 'labour_entries'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const advancesQuery = useMemo(
    () => query(collection(db, 'labour_advances'), where('financialYear', '==', financialYear)),
    [financialYear],
  )

  const { data: workers, loading: workersLoading, error: workersError } = useFirestoreQuery(workersQuery)
  const { data: entries, loading: entriesLoading } = useFirestoreQuery(entriesQuery)
  const { data: rawAdvances, loading: advancesLoading, error: advancesError } = useFirestoreQuery(advancesQuery)
  const advances = useMemo(() => sortByDateDesc(rawAdvances, 'date'), [rawAdvances])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dropdownSearch, setDropdownSearch] = useState('')
  const [workerOpen, setWorkerOpen] = useState(false)
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [labourLocked, setLabourLocked] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [workerForm, setWorkerForm] = useState(emptyWorker)
  const [advanceForm, setAdvanceForm] = useState(emptyAdvance)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [formError, setFormError] = useState('')

  /** All labour for dropdown — active first, then inactive; sorted by code then name */
  const allLabourSorted = useMemo(() => {
    return [...workers].sort((a, b) => {
      const aActive = isActiveWorker(a) ? 0 : 1
      const bActive = isActiveWorker(b) ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      const codeCmp = String(a.code || '').localeCompare(String(b.code || ''))
      if (codeCmp !== 0) return codeCmp
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }, [workers])

  const dropdownLabour = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase()
    const list = allLabourSorted.filter(isActiveWorker)
    if (!q) return list
    return list.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.code?.toLowerCase().includes(q) ||
        w.department?.toLowerCase().includes(q),
    )
  }, [allLabourSorted, dropdownSearch])

  const selectedLabour = useMemo(
    () => workers.find((w) => w.id === advanceForm.labourId) || null,
    [workers, advanceForm.labourId],
  )

  const filteredWorkers = useMemo(() => {
    return filterRows(allLabourSorted, {
      query: search,
      fields: ['name', 'code', 'department', 'phone'],
      predicates: [
        (w) => {
          if (statusFilter === 'all') return true
          if (statusFilter === 'active') return isActiveWorker(w)
          return w.status === 'inactive'
        },
      ],
    })
  }, [allLabourSorted, search, statusFilter])

  const workersPage = usePagination(filteredWorkers, {
    initialPageSize: 10,
    resetKey: `${search}|${statusFilter}`,
  })

  const filteredAdvances = useMemo(
    () =>
      filterRows(advances, {
        query: ledgerSearch,
        fields: ['labourName', 'labourCode', 'notes', 'type'],
        predicates: [(a) => typeFilter === 'all' || a.type === typeFilter],
      }),
    [advances, ledgerSearch, typeFilter],
  )

  const ledgerPage = usePagination(filteredAdvances, {
    initialPageSize: 10,
    resetKey: `${ledgerSearch}|${typeFilter}|${financialYear}`,
  })

  const totals = useMemo(() => {
    const outstanding = workers.reduce((s, w) => s + (Number(w.advanceBalance) || 0), 0)
    const given = advances
      .filter((a) => a.type === 'given')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const deducted = advances
      .filter((a) => a.type === 'deduction')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)
    return { outstanding, given, deducted, labourCount: workers.filter(isActiveWorker).length }
  }, [workers, advances])

  const openCreateWorker = () => {
    setEditingWorker(null)
    setWorkerForm({
      ...emptyWorker,
      code: nextLabourCode(workers),
    })
    setFormError('')
    setWorkerOpen(true)
  }

  const openEditWorker = (row) => {
    setEditingWorker(row)
    setWorkerForm({
      name: row.name || '',
      code: row.code || '',
      department: row.department || 'Stitching',
      phone: row.phone || '',
      status: row.status || 'active',
    })
    setFormError('')
    setWorkerOpen(true)
  }

  const openGiveAdvance = (labourId = '') => {
    setAdvanceForm({
      ...emptyAdvance,
      labourId: labourId || '',
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      notes: '',
    })
    setLabourLocked(Boolean(labourId))
    setDropdownSearch('')
    setFormError('')
    setAdvanceOpen(true)
  }

  const handleSelectLabour = (labourId) => {
    setAdvanceForm((p) => ({ ...p, labourId }))
  }

  const handleSaveWorker = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editingWorker?.id) {
        await updateLabourWorker(editingWorker.id, workerForm)
        toast.success('Labour worker updated')
      } else {
        const created = await createLabourWorker(workerForm)
        toast.success(`Labour ${created.code} — ${created.name} added`)
      }
      setWorkerOpen(false)
    } catch (err) {
      const msg = err.message || 'Failed to save labour worker.'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSyncFromEntries = async () => {
    setSyncing(true)
    try {
      const created = await syncLabourWorkersFromEntries(entries, workers)
      if (created.length === 0) {
        toast.success('All labour from entries are already in the list.')
      } else {
        toast.success(`Added ${created.length} labour from entries.`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to sync labour.')
    } finally {
      setSyncing(false)
    }
  }

  const handleGiveAdvance = async (e) => {
    e.preventDefault()
    if (!advanceForm.labourId) {
      setFormError('Please select a labour from the dropdown.')
      return
    }
    const worker = workers.find((w) => w.id === advanceForm.labourId)
    if (!worker) {
      setFormError('Selected labour not found. Refresh and try again.')
      return
    }
    if (!isActiveWorker(worker)) {
      setFormError('Cannot give advance to inactive labour.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const amount = Number(advanceForm.amount)
      await giveLabourAdvance({
        labourId: worker.id,
        amount,
        date: advanceForm.date,
        financialYear,
        notes: advanceForm.notes,
      })
      toast.success(
        `Advance ${formatINR(amount)} set for ${worker.code || 'ID'} — ${worker.name}`,
      )
      setAdvanceOpen(false)
      setAdvanceForm(emptyAdvance)
      setLabourLocked(false)
      setDropdownSearch('')
    } catch (err) {
      const msg = err.message || 'Failed to record advance.'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const workerColumns = [
    {
      key: 'code',
      label: 'Labour ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-ink-700">{row.code || '—'}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-950">{row.name}</p>
          <p className="text-xs text-ink-400">{row.department || '—'}</p>
        </div>
      ),
    },
    {
      key: 'advanceBalance',
      label: 'Outstanding',
      className: 'font-mono tabular-nums font-bold text-amber-700',
      render: (row) => formatINR(row.advanceBalance),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = row.status || 'active'
        return <Badge tone={status}>{status}</Badge>
      },
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
            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40"
            onClick={() => openGiveAdvance(row.id)}
            disabled={!isActiveWorker(row)}
            title={`Give advance to ${row.name}`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Advance
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-ink-500 hover:bg-teal-50 hover:text-teal-700"
            onClick={() => openEditWorker(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const ledgerColumns = [
    {
      key: 'date',
      label: 'Date',
      render: (row) => {
        const d = row.date?.toDate?.() || (row.date ? new Date(row.date) : null)
        return d ? d.toLocaleDateString('en-IN') : '—'
      },
    },
    {
      key: 'labourCode',
      label: 'Labour ID',
      render: (row) => <span className="font-mono text-xs">{row.labourCode || '—'}</span>,
    },
    { key: 'labourName', label: 'Name' },
    {
      key: 'type',
      label: 'Type',
      render: (row) => {
        const tone =
          row.type === 'given' ? 'labour' : row.type === 'deduction' ? 'expense' : 'inactive'
        const label =
          row.type === 'given' ? 'Given (+)' : row.type === 'deduction' ? 'Deducted (−)' : 'Reversal'
        return <Badge tone={tone}>{label}</Badge>
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'font-mono tabular-nums font-semibold',
      render: (row) => {
        const sign = row.type === 'deduction' ? '−' : '+'
        const color =
          row.type === 'deduction' ? 'text-rose-700' : row.type === 'given' ? 'text-amber-700' : 'text-ink-600'
        return (
          <span className={color}>
            {sign}
            {formatINR(row.amount)}
          </span>
        )
      },
    },
    {
      key: 'balanceAfter',
      label: 'Balance After',
      className: 'font-mono tabular-nums',
      render: (row) => formatINR(row.balanceAfter),
    },
    { key: 'notes', label: 'Notes' },
  ]

  const loading = workersLoading || advancesLoading || entriesLoading
  const error = workersError || advancesError

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/labour"
        backLabel={
          <>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Labour Entries
          </>
        }
        description="Select a labour, then give advance — amount is saved only for that Labour ID. Deductions (−) apply on labour payments."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSyncFromEntries}
              disabled={syncing || !entries.length}
              title="Create labour master rows from names used in labour entries"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync from Entries
            </button>
            <button type="button" className="btn-secondary" onClick={() => openGiveAdvance()}>
              <Wallet className="h-4 w-4" />
              Give Advance
            </button>
            <button type="button" className="btn-primary" onClick={openCreateWorker}>
              <Plus className="h-4 w-4" />
              Add Labour
            </button>
          </>
        }
      />

      <StatGrid
        items={[
          { label: 'Active Labour', value: totals.labourCount },
          { label: 'Outstanding Advance', value: formatINR(totals.outstanding), colorClass: 'text-amber-700' },
          { label: 'Given this FY', value: formatINR(totals.given) },
          { label: 'Deducted (−) this FY', value: formatINR(totals.deducted), colorClass: 'text-rose-700' },
        ]}
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load advances data. {error.message || 'Check Firebase configuration.'}
        </div>
      )}

      {loading ? (
        <div className="card flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      ) : (
        <>
          <SectionCard
            title={`All Labour (${workers.length})`}
            subtitle="Master list — click Advance on a row to give advance to that labour only"
          >
            <SearchFilterBar
              search={search}
              onSearchChange={setSearch}
              placeholder="Search name, ID, dept…"
              filters={[
                {
                  id: 'status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'all', label: 'All status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ],
                },
              ]}
            />
            <div className="mt-4">
              <Table
                columns={workerColumns}
                data={workersPage.pageData}
                emptyMessage={
                  workers.length
                    ? 'No workers match your search.'
                    : 'No labour yet. Click Add Labour, or Sync from Entries.'
                }
              />
              <Pagination
                page={workersPage.page}
                pageSize={workersPage.pageSize}
                total={workersPage.total}
                totalPages={workersPage.totalPages}
                from={workersPage.from}
                to={workersPage.to}
                onPageChange={workersPage.setPage}
                onPageSizeChange={workersPage.setPageSize}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={`Advance Ledger (${financialYear})`}
            subtitle="Given (+), deducted (−) from payments, and reversals"
          >
            <SearchFilterBar
              search={ledgerSearch}
              onSearchChange={setLedgerSearch}
              placeholder="Search labour ID, name, notes…"
              filters={[
                {
                  id: 'type',
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: [
                    { value: 'all', label: 'All types' },
                    { value: 'given', label: 'Given (+)' },
                    { value: 'deduction', label: 'Deducted (−)' },
                    { value: 'reversal', label: 'Reversal' },
                  ],
                },
              ]}
            />
            <div className="mt-4">
              <Table
                columns={ledgerColumns}
                data={ledgerPage.pageData}
                emptyMessage={
                  advances.length
                    ? 'No ledger rows match your search.'
                    : 'No advance movements for this FY.'
                }
              />
              <Pagination
                page={ledgerPage.page}
                pageSize={ledgerPage.pageSize}
                total={ledgerPage.total}
                totalPages={ledgerPage.totalPages}
                from={ledgerPage.from}
                to={ledgerPage.to}
                onPageChange={ledgerPage.setPage}
                onPageSizeChange={ledgerPage.setPageSize}
              />
            </div>
          </SectionCard>
        </>
      )}

      <Modal
        open={workerOpen}
        onClose={() => !saving && setWorkerOpen(false)}
        title={editingWorker ? 'Edit Labour Worker' : 'New Labour Worker'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setWorkerOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="worker-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingWorker ? 'Update' : 'Save'}
            </button>
          </>
        }
      >
        <form id="worker-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSaveWorker}>
          {formError && workerOpen && (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <div>
            <label className="label">Labour ID / Code</label>
            <input
              className="input-field font-mono uppercase"
              placeholder="e.g. LAB-001"
              value={workerForm.code}
              onChange={(e) => setWorkerForm((p) => ({ ...p, code: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Name</label>
            <input
              className="input-field"
              required
              value={workerForm.name}
              onChange={(e) => setWorkerForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="input-field"
              value={workerForm.department}
              onChange={(e) => setWorkerForm((p) => ({ ...p, department: e.target.value }))}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input-field"
              value={workerForm.phone}
              onChange={(e) => setWorkerForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          {editingWorker && (
            <div className="sm:col-span-2">
              <label className="label">Status</label>
              <select
                className="input-field"
                value={workerForm.status}
                onChange={(e) => setWorkerForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={advanceOpen}
        onClose={() => {
          if (saving) return
          setAdvanceOpen(false)
          setLabourLocked(false)
          setDropdownSearch('')
        }}
        title="Give Advance to Labour"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAdvanceOpen(false)
                setLabourLocked(false)
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="advance-form"
              className="btn-primary"
              disabled={saving || !advanceForm.labourId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Advance for Labour'}
            </button>
          </>
        }
      >
        <form id="advance-form" className="grid gap-4" onSubmit={handleGiveAdvance}>
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Select Labour (all labour)</label>
            {!labourLocked && (
              <input
                type="search"
                className="input-field mb-2"
                placeholder="Type to filter labour by ID or name…"
                value={dropdownSearch}
                onChange={(e) => setDropdownSearch(e.target.value)}
              />
            )}
            <select
              className="input-field"
              required
              disabled={labourLocked}
              value={advanceForm.labourId}
              onChange={(e) => handleSelectLabour(e.target.value)}
            >
              <option value="">— Select labour —</option>
              {dropdownLabour.map((w) => (
                <option key={w.id} value={w.id}>
                  {labourLabel(w)} · Outstanding {formatINR(w.advanceBalance)}
                </option>
              ))}
              {/* Keep locked selection visible even if filtered out */}
              {labourLocked &&
                selectedLabour &&
                !dropdownLabour.some((w) => w.id === selectedLabour.id) && (
                  <option value={selectedLabour.id}>{labourLabel(selectedLabour)}</option>
                )}
            </select>
            {workers.filter(isActiveWorker).length === 0 && (
              <p className="mt-2 text-xs text-amber-800">
                No labour in master list.{' '}
                <button
                  type="button"
                  className="font-semibold text-teal-700 underline"
                  onClick={() => {
                    setAdvanceOpen(false)
                    openCreateWorker()
                  }}
                >
                  Add Labour
                </button>
                {' '}
                or use Sync from Entries.
              </p>
            )}
            {!labourLocked && dropdownSearch && dropdownLabour.length === 0 && (
              <p className="mt-1 text-xs text-ink-500">No labour match “{dropdownSearch}”.</p>
            )}
            {labourLocked && (
              <p className="mt-1 text-xs text-ink-500">
                Labour locked from row action. Close and open Give Advance to choose another.
              </p>
            )}
          </div>

          {selectedLabour && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink-950">
                  Advance will be set for:{' '}
                  <span className="font-mono text-amber-900">{selectedLabour.code || '—'}</span>
                  {' — '}
                  {selectedLabour.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  {selectedLabour.department || 'No dept'}
                  {' · '}
                  Current outstanding:{' '}
                  <strong className="font-mono text-amber-800">
                    {formatINR(selectedLabour.advanceBalance)}
                  </strong>
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input-field"
                required
                value={advanceForm.date}
                onChange={(e) => setAdvanceForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Advance Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className="input-field"
                required
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field min-h-[70px]"
              value={advanceForm.notes}
              onChange={(e) => setAdvanceForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
