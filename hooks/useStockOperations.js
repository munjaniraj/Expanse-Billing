'use client'

import {
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  collection,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

export async function applyStockMovement({
  financialYear,
  categoryId,
  categoryName,
  unit = 'Mtr',
  actionType,
  operationReason,
  quantity,
  lotNumber = '',
  operator = '',
  notes = '',
  unitCost = 0,
  sellingRate = 0,
}) {
  const qty = Number(quantity)
  if (!categoryId || !financialYear || !qty || qty <= 0) {
    throw new Error('Invalid stock movement payload.')
  }

  const stockId = `${categoryId}_${financialYear}`
  const stockRef = doc(db, 'production_stock', stockId)
  const movementRef = doc(collection(db, 'stock_movements'))

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(stockRef)
    const existing = snap.exists()
      ? snap.data()
      : {
          financialYear,
          categoryId,
          categoryName,
          unit,
          unitCost,
          sellingRate,
          openingStock: 0,
          totalProduced: 0,
          totalSold: 0,
          totalWastage: 0,
          netStock: 0,
        }

    let totalProduced = Number(existing.totalProduced) || 0
    let totalSold = Number(existing.totalSold) || 0
    let totalWastage = Number(existing.totalWastage) || 0
    const openingStock = Number(existing.openingStock) || 0

    if (actionType === 'ADD') {
      totalProduced += qty
    } else if (actionType === 'REDUCE') {
      if (operationReason === 'Sales Dispatch') totalSold += qty
      else totalWastage += qty
    } else {
      throw new Error('actionType must be ADD or REDUCE')
    }

    const netStock = openingStock + totalProduced - totalSold - totalWastage
    if (netStock < 0) throw new Error('Insufficient stock for this reduction.')

    tx.set(
      stockRef,
      {
        financialYear,
        categoryId,
        categoryName: categoryName || existing.categoryName,
        unit: unit || existing.unit || 'Mtr',
        unitCost: existing.unitCost ?? unitCost,
        sellingRate: existing.sellingRate ?? sellingRate,
        openingStock,
        totalProduced,
        totalSold,
        totalWastage,
        netStock,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    tx.set(movementRef, {
      financialYear,
      categoryId,
      categoryName: categoryName || existing.categoryName,
      actionType,
      operationReason,
      quantity: qty,
      lotNumber,
      operator,
      notes,
      balanceAfter: netStock,
      timestamp: serverTimestamp(),
    })
  })

  const updated = await getDoc(stockRef)
  return updated.exists() ? { id: updated.id, ...updated.data() } : null
}

export function useStockOperations() {
  return { applyStockMovement }
}
