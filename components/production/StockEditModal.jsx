'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/common/Modal'
import { formatINR } from '@/utils/currencyFormatter'

export default function StockEditModal({ open, stock, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({
    openingStock: '0',
    unitCost: '0',
    sellingRate: '0',
    unit: 'Mtr',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !stock) return
    setForm({
      openingStock: String(stock.openingStock ?? 0),
      unitCost: String(stock.unitCost ?? 0),
      sellingRate: String(stock.sellingRate ?? 0),
      unit: stock.unit || 'Mtr',
    })
    setError('')
  }, [open, stock])

  const produced = Number(stock?.totalProduced) || 0
  const sold = Number(stock?.totalSold) || 0
  const wastage = Number(stock?.totalWastage) || 0
  const opening = Number(form.openingStock) || 0
  const netStock = opening + produced - sold - wastage
  const stockValue = netStock * (Number(form.unitCost) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (netStock < 0) {
      setError('Opening stock would make net available negative. Increase opening or reduce sold/wastage via movements.')
      return
    }
    setError('')
    await onSubmit({
      openingStock: opening,
      unitCost: Number(form.unitCost) || 0,
      sellingRate: Number(form.sellingRate) || 0,
      unit: form.unit,
      netStock,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Stock Settings"
      subtitle={stock ? `${stock.categoryName} · adjust opening, unit cost & rate` : ''}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="stock-edit-form" className="btn-primary" disabled={saving || !stock}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Stock'}
          </button>
        </>
      }
    >
      <form id="stock-edit-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Opening Stock</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={form.openingStock}
              onChange={(e) => setForm((p) => ({ ...p, openingStock: e.target.value }))}
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
          <div>
            <label className="label">Unit Cost</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={form.unitCost}
              onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Selling Rate</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={form.sellingRate}
              onChange={(e) => setForm((p) => ({ ...p, sellingRate: e.target.value }))}
            />
          </div>
        </div>
        <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
          <p className="text-ink-500">
            Produced {produced} · Sold {sold} · Wastage {wastage}
          </p>
          <p className="mt-1">
            Net available:{' '}
            <strong className="font-mono tabular-nums text-ink-950">{netStock}</strong>
            {' · '}
            Stock value:{' '}
            <strong className="font-mono tabular-nums text-teal-800">{formatINR(stockValue)}</strong>
          </p>
        </div>
      </form>
    </Modal>
  )
}
