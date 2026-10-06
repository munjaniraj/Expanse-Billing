'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Package } from 'lucide-react'
import Modal from '@/components/common/Modal'

const ADD_REASONS = ['Production Output', 'Inward Return']
const REDUCE_REASONS = ['Sales Dispatch', 'Weaving Defect', 'Sampling', 'Godown Damage']

const empty = {
  categoryId: '',
  quantity: '',
  operationReason: '',
  lotNumber: '',
  operator: '',
  notes: '',
  unit: 'Mtr',
}

export default function StockMovementModal({
  open,
  onClose,
  onSubmit,
  mode = 'ADD',
  categories = [],
  selectedStock = null,
  saving,
}) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const reasons = mode === 'ADD' ? ADD_REASONS : REDUCE_REASONS

  const categoryOptions = useMemo(() => {
    const list = [...categories]
    if (
      selectedStock?.categoryId &&
      !list.some((c) => c.id === selectedStock.categoryId)
    ) {
      list.unshift({
        id: selectedStock.categoryId,
        name: selectedStock.categoryName || 'Selected category',
        code: 'STOCK',
      })
    }
    return list
  }, [categories, selectedStock])

  const availableStock = useMemo(() => {
    if (!form.categoryId) return null
    if (selectedStock?.categoryId === form.categoryId) {
      return Number(selectedStock.netStock) || 0
    }
    return null
  }, [form.categoryId, selectedStock])

  useEffect(() => {
    if (!open) return

    const fromStock = Boolean(selectedStock?.categoryId)
    const nextCategoryId =
      selectedStock?.categoryId || categories[0]?.id || ''
    const matchedCat =
      categories.find((c) => c.id === nextCategoryId) ||
      (selectedStock?.categoryId
        ? { id: selectedStock.categoryId, name: selectedStock.categoryName }
        : null)

    setForm({
      ...empty,
      operationReason: mode === 'ADD' ? ADD_REASONS[0] : REDUCE_REASONS[0],
      categoryId: nextCategoryId,
      unit: selectedStock?.unit || matchedCat?.unit || 'Mtr',
      quantity: '',
      lotNumber: '',
      operator: '',
      notes: fromStock
        ? `${mode === 'REDUCE' ? 'Reduce' : 'Add'} for ${selectedStock.categoryName || ''}`
        : '',
    })
    setError('')
    // Prefill only when modal opens / mode or selected row changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, selectedStock?.id, selectedStock?.categoryId])

  const handleCategoryChange = (categoryId) => {
    const cat = categoryOptions.find((c) => c.id === categoryId)
    setForm((p) => ({
      ...p,
      categoryId,
      unit: selectedStock?.categoryId === categoryId
        ? selectedStock.unit || p.unit
        : cat?.unit || p.unit,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.categoryId) {
      setError('Select a production category.')
      return
    }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity greater than zero.')
      return
    }
    if (mode === 'REDUCE' && availableStock != null && qty > availableStock) {
      setError(`Cannot reduce more than available stock (${availableStock}).`)
      return
    }
    setError('')
    const cat = categoryOptions.find((c) => c.id === form.categoryId)
    await onSubmit({
      ...form,
      quantity: qty,
      categoryName: cat?.name || selectedStock?.categoryName || '',
      actionType: mode,
    })
  }

  const lockCategory = Boolean(selectedStock?.categoryId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'ADD' ? 'Add Stock' : 'Reduce Stock'}
      subtitle={
        selectedStock
          ? `${selectedStock.categoryName} · current available ${selectedStock.netStock ?? 0} ${selectedStock.unit || ''}`
          : 'Writes an immutable audit record and updates net available stock'
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="stock-form"
            className={mode === 'ADD' ? 'btn-primary' : 'btn-danger'}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'ADD' ? (
              'Confirm Add'
            ) : (
              'Confirm Reduce'
            )}
          </button>
        </>
      }
    >
      <form id="stock-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {selectedStock && (
          <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-sand-50 px-3 py-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <Package className="h-4 w-4 text-teal-700" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink-950">{selectedStock.categoryName}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Opening {selectedStock.openingStock ?? 0} · Produced {selectedStock.totalProduced ?? 0} ·
                Sold {selectedStock.totalSold ?? 0} · Wastage {selectedStock.totalWastage ?? 0}
              </p>
              <p className="mt-1 font-mono text-sm font-bold tabular-nums text-teal-700">
                Available: {selectedStock.netStock ?? 0} {selectedStock.unit || 'Mtr'}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="label">Production Category</label>
          <select
            className="input-field"
            value={form.categoryId}
            disabled={lockCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categoryOptions.length === 0 && <option value="">No production categories</option>}
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.code ? ` (${c.code})` : ''}
              </option>
            ))}
          </select>
          {lockCategory && (
            <p className="mt-1 text-xs text-ink-400">Category locked from selected stock row.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              Quantity{mode === 'REDUCE' && availableStock != null ? ` (max ${availableStock})` : ''}
            </label>
            <input
              type="number"
              min="0"
              max={mode === 'REDUCE' && availableStock != null ? availableStock : undefined}
              step="any"
              className="input-field"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="Enter quantity"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <select
              className="input-field"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            >
              {['Mtr', 'Kg', 'Pcs', 'Bales'].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Reason</label>
          <select
            className="input-field"
            value={form.operationReason}
            onChange={(e) => setForm((p) => ({ ...p, operationReason: e.target.value }))}
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Lot Number</label>
            <input
              className="input-field"
              value={form.lotNumber}
              onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))}
              placeholder="LOT-…"
            />
          </div>
          <div>
            <label className="label">Operator</label>
            <input
              className="input-field"
              value={form.operator}
              onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
              placeholder="Operator name"
            />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optional remarks"
          />
        </div>
      </form>
    </Modal>
  )
}
