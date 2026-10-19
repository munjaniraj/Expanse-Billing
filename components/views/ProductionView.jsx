'use client'

import { useMemo, useState } from 'react'
import {
  collection,
  query,
  where,
} from 'firebase/firestore'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useToast } from '@/context/ToastContext'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { useStockOperations } from '@/hooks/useStockOperations'
import { sortByDateDesc } from '@/utils/sortByDate'
import StockBalanceTable from '@/components/production/StockBalanceTable'
import StockMovementModal from '@/components/production/StockMovementModal'
import StockEditModal from '@/components/production/StockEditModal'
import MovementHistoryLog from '@/components/production/MovementHistoryLog'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

export default function ProductionView() {
  const toast = useToast()
  const { financialYear } = useFinancialYear()
  const { applyStockMovement, updateStockSettings, deleteStockBalance } = useStockOperations()

  const catsQuery = useMemo(
    () => query(collection(db, 'categories'), where('type', '==', 'production')),
    [],
  )
  const stockQuery = useMemo(
    () => query(collection(db, 'production_stock'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  // Filter by FY only (no orderBy) so Firestore does not require a composite index.
  const movementsQuery = useMemo(
    () => query(collection(db, 'stock_movements'), where('financialYear', '==', financialYear)),
    [financialYear],
  )

  const { data: rawCategories, loading: catLoading } = useFirestoreQuery(catsQuery)
  const categories = useMemo(
    () => rawCategories.filter((c) => c.status === 'active'),
    [rawCategories],
  )
  const { data: stock, loading: stockLoading, error } = useFirestoreQuery(stockQuery)
  const { data: rawMovements, loading: movLoading } = useFirestoreQuery(movementsQuery)
  const movements = useMemo(() => sortByDateDesc(rawMovements, 'timestamp'), [rawMovements])

  const [modalMode, setModalMode] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null)
  const [editStock, setEditStock] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const openModal = (mode, stockRow = null) => {
    setActionError('')
    setSelectedStock(stockRow)
    setModalMode(mode)
  }

  const closeModal = () => {
    if (saving) return
    setModalMode(null)
    setSelectedStock(null)
  }

  const handleSubmit = async (form) => {
    setSaving(true)
    setActionError('')
    try {
      await applyStockMovement({
        financialYear,
        categoryId: form.categoryId,
        categoryName: form.categoryName,
        unit: form.unit,
        actionType: form.actionType,
        operationReason: form.operationReason,
        quantity: form.quantity,
        lotNumber: form.lotNumber,
        operator: form.operator,
        notes: form.notes,
        unitCost: selectedStock?.unitCost || 0,
        sellingRate: selectedStock?.sellingRate || 0,
      })
      toast.success(
        form.actionType === 'ADD'
          ? `Stock added for ${form.categoryName || 'category'}`
          : `Stock reduced for ${form.categoryName || 'category'}`,
      )
      setModalMode(null)
      setSelectedStock(null)
    } catch (err) {
      console.error(err)
      const msg = err.message || 'Stock update failed.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async (payload) => {
    if (!editStock?.id) return
    setSaving(true)
    setActionError('')
    try {
      await updateStockSettings(editStock.id, payload)
      toast.success(`Stock settings updated for ${editStock.categoryName || 'category'}`)
      setEditStock(null)
    } catch (err) {
      const msg = err.message || 'Failed to update stock settings.'
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
      await deleteStockBalance(deleting.id)
      toast.success(`Stock balance deleted for ${deleting.categoryName}`)
      if (selectedStock?.id === deleting.id) setSelectedStock(null)
      setDeleting(null)
    } catch (err) {
      const msg = err.message || 'Failed to delete stock balance.'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setDeletingBusy(false)
    }
  }

  const loading = catLoading || stockLoading || movLoading

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">
          Add / reduce stock, edit unit cost & opening, or delete a balance row.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => openModal('ADD', null)}
            disabled={!categories.length}
          >
            <Plus className="h-4 w-4" />
            Add Stock
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => openModal('REDUCE', selectedStock)}
            disabled={!categories.length && !stock.length}
          >
            <Minus className="h-4 w-4" />
            Reduce Stock
          </button>
        </div>
      </div>

      {(error || actionError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError ||
            'Could not load stock data. Configure Firebase and create a composite index if prompted for stock_movements.'}
        </div>
      )}

      {!categories.length && !catLoading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Create at least one <strong>active production</strong> category before adding stock.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Loading production data…
        </div>
      ) : (
        <>
          <StockBalanceTable
            rows={stock}
            selectedRowId={selectedStock?.id}
            onRowSelect={setSelectedStock}
            onAdd={(row) => openModal('ADD', row)}
            onReduce={(row) => openModal('REDUCE', row)}
            onEdit={(row) => setEditStock(row)}
            onDelete={(row) => setDeleting(row)}
          />
          <MovementHistoryLog movements={movements} />
        </>
      )}

      <StockMovementModal
        open={Boolean(modalMode)}
        mode={modalMode || 'ADD'}
        categories={categories}
        selectedStock={selectedStock}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <StockEditModal
        open={Boolean(editStock)}
        stock={editStock}
        saving={saving}
        onClose={() => !saving && setEditStock(null)}
        onSubmit={handleEditSave}
      />

      <ConfirmDeleteModal
        open={Boolean(deleting)}
        title="Delete stock balance?"
        message="Are you sure you want to delete this record?"
        detail={
          deleting
            ? `${deleting.categoryName || 'Stock'} · Movement history will be kept.`
            : ''
        }
        loading={deletingBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </div>
  )
}
