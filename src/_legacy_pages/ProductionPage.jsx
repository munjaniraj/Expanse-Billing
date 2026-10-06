import { useMemo, useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { db } from '../services/firebase'
import { useFinancialYear } from '../context/FinancialYearContext'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'
import { useStockOperations } from '../hooks/useStockOperations'
import StockBalanceTable from '../components/production/StockBalanceTable'
import StockMovementModal from '../components/production/StockMovementModal'
import MovementHistoryLog from '../components/production/MovementHistoryLog'

export default function ProductionPage() {
  const { financialYear } = useFinancialYear()
  const { applyStockMovement } = useStockOperations()

  const catsQuery = useMemo(
    () => query(collection(db, 'categories'), where('type', '==', 'production'), where('status', '==', 'active')),
    [],
  )
  const stockQuery = useMemo(
    () => query(collection(db, 'production_stock'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const movementsQuery = useMemo(
    () =>
      query(
        collection(db, 'stock_movements'),
        where('financialYear', '==', financialYear),
        orderBy('timestamp', 'desc'),
      ),
    [financialYear],
  )

  const { data: categories, loading: catLoading } = useFirestoreQuery(catsQuery)
  const { data: stock, loading: stockLoading, error } = useFirestoreQuery(stockQuery)
  const { data: movements, loading: movLoading } = useFirestoreQuery(movementsQuery)

  const [modalMode, setModalMode] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null)
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
      setModalMode(null)
      setSelectedStock(null)
    } catch (err) {
      console.error(err)
      setActionError(err.message || 'Stock update failed.')
    } finally {
      setSaving(false)
    }
  }

  const loading = catLoading || stockLoading || movLoading

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Click a stock row to reduce it (details auto-filled), or use Add / Reduce actions.
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
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
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
    </div>
  )
}
