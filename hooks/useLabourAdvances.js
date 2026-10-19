'use client'

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function nextLabourCode(existingWorkers = []) {
  let max = 0
  for (const w of existingWorkers) {
    const m = String(w.code || '').match(/^LAB-(\d+)$/i)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `LAB-${String(max + 1).padStart(3, '0')}`
}

export async function createLabourWorker({ name, code, department = '', phone = '' }) {
  const trimmedName = String(name || '').trim()
  if (!trimmedName) throw new Error('Labour name is required.')
  const payload = {
    name: trimmedName,
    code: String(code || '').trim().toUpperCase() || nextLabourCode(),
    department: department || '',
    phone: String(phone || '').trim(),
    status: 'active',
    advanceBalance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'labour_workers'), payload)
  return { id: ref.id, ...payload }
}

/**
 * Create labour_workers from unique names found on labour_entries
 * (so the Give Advance dropdown is never empty when entries exist).
 */
export async function syncLabourWorkersFromEntries(entries = [], existingWorkers = []) {
  const byId = new Set(existingWorkers.map((w) => w.id))
  const byName = new Map(
    existingWorkers.map((w) => [String(w.name || '').trim().toLowerCase(), w]),
  )
  const byCode = new Map(
    existingWorkers
      .filter((w) => w.code)
      .map((w) => [String(w.code).trim().toUpperCase(), w]),
  )

  const toCreate = new Map()
  for (const entry of entries) {
    if (entry.labourId && byId.has(entry.labourId)) continue
    const name = String(entry.labourName || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (byName.has(key)) continue
    const code = String(entry.labourCode || '').trim().toUpperCase()
    if (code && byCode.has(code)) continue
    if (toCreate.has(key)) continue
    toCreate.set(key, {
      name,
      code: code || '',
      department: entry.department || '',
    })
  }

  const created = []
  const known = [...existingWorkers]
  for (const payload of toCreate.values()) {
    const worker = await createLabourWorker({
      ...payload,
      code: payload.code || nextLabourCode(known),
    })
    created.push(worker)
    known.push(worker)
  }
  return created
}

export async function updateLabourWorker(labourId, { name, code, department, phone, status }) {
  if (!labourId) throw new Error('Missing labour id.')
  await updateDoc(doc(db, 'labour_workers', labourId), {
    name: String(name || '').trim(),
    code: String(code || '').trim().toUpperCase(),
    department: department || '',
    phone: String(phone || '').trim(),
    status: status || 'active',
    updatedAt: serverTimestamp(),
  })
}

/** Give cash advance to a labour worker — increases outstanding balance. */
export async function giveLabourAdvance({
  labourId,
  amount,
  date,
  financialYear,
  notes = '',
}) {
  const amt = roundMoney(amount)
  if (!labourId) throw new Error('Select a labour worker.')
  if (!financialYear) throw new Error('Financial year is required.')
  if (!(amt > 0)) throw new Error('Advance amount must be greater than zero.')

  const workerRef = doc(db, 'labour_workers', labourId)
  const advanceRef = doc(collection(db, 'labour_advances'))

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(workerRef)
    if (!snap.exists()) throw new Error('Labour worker not found.')
    const worker = snap.data()
    if (worker.status === 'inactive') throw new Error('Cannot give advance to inactive labour.')

    const balance = roundMoney(worker.advanceBalance)
    const nextBalance = roundMoney(balance + amt)

    tx.update(workerRef, {
      advanceBalance: nextBalance,
      updatedAt: serverTimestamp(),
    })

    tx.set(advanceRef, {
      labourId,
      labourName: worker.name || '',
      labourCode: worker.code || '',
      financialYear,
      date: Timestamp.fromDate(new Date(date || new Date().toISOString().slice(0, 10))),
      type: 'given',
      amount: amt,
      labourEntryId: null,
      notes: String(notes || '').trim(),
      balanceAfter: nextBalance,
      createdAt: serverTimestamp(),
    })
  })
}

/**
 * Save labour entry and sync advance deduction against labour.advanceBalance.
 * Deduction is capped to outstanding balance for that labourId.
 */
export async function saveLabourEntryWithAdvance({
  entryId = null,
  previousEntry = null,
  payload,
}) {
  if (!payload?.labourId) throw new Error('Select a labour worker.')
  if (!payload?.financialYear) throw new Error('Financial year is required.')

  const workerRef = doc(db, 'labour_workers', payload.labourId)
  const entryRef = entryId
    ? doc(db, 'labour_entries', entryId)
    : doc(collection(db, 'labour_entries'))

  let result = { entryId: entryRef.id, advanceDeduction: 0, netPayment: 0 }

  await runTransaction(db, async (tx) => {
    // All reads first (Firestore transaction rule)
    const workerSnap = await tx.get(workerRef)
    if (!workerSnap.exists()) throw new Error('Labour worker not found.')
    const worker = workerSnap.data()

    const prevLabourId = previousEntry?.labourId || null
    const prevDeduction = roundMoney(previousEntry?.advanceDeduction)
    const changingWorker =
      Boolean(entryId && prevLabourId && prevLabourId !== payload.labourId && prevDeduction > 0)

    let prevWorkerSnap = null
    let prevWorkerRef = null
    if (changingWorker) {
      prevWorkerRef = doc(db, 'labour_workers', prevLabourId)
      prevWorkerSnap = await tx.get(prevWorkerRef)
    }

    let balance = roundMoney(worker.advanceBalance)
    if (entryId && prevLabourId === payload.labourId && prevDeduction > 0) {
      balance = roundMoney(balance + prevDeduction)
    }

    const gross = roundMoney(
      (Number(payload.quantity) || 0) * (Number(payload.rate) || 0) +
        (Number(payload.overtimeAmount) || 0),
    )
    const requested = roundMoney(payload.advanceDeduction)
    if (requested < 0) throw new Error('Advance deduction cannot be negative.')

    const advanceDeduction = roundMoney(Math.min(requested, balance, Math.max(gross, 0)))
    const netPayment = roundMoney(gross - advanceDeduction)
    const nextBalance = roundMoney(balance - advanceDeduction)

    const entryData = {
      financialYear: payload.financialYear,
      date: payload.date,
      labourId: payload.labourId,
      labourCode: worker.code || '',
      labourName: worker.name || payload.labourName || '',
      department: payload.department,
      workType: payload.workType,
      quantity: Number(payload.quantity) || 0,
      rate: Number(payload.rate) || 0,
      overtimeAmount: Number(payload.overtimeAmount) || 0,
      advanceDeduction,
      netPayment,
      paymentStatus: payload.paymentStatus || 'Pending',
      updatedAt: serverTimestamp(),
    }

    // Writes
    if (changingWorker && prevWorkerSnap?.exists() && prevWorkerRef) {
      const prevBal = roundMoney(prevWorkerSnap.data().advanceBalance)
      const restored = roundMoney(prevBal + prevDeduction)
      tx.update(prevWorkerRef, {
        advanceBalance: restored,
        updatedAt: serverTimestamp(),
      })
      const revRef = doc(collection(db, 'labour_advances'))
      tx.set(revRef, {
        labourId: prevLabourId,
        labourName: prevWorkerSnap.data().name || previousEntry.labourName || '',
        labourCode: prevWorkerSnap.data().code || previousEntry.labourCode || '',
        financialYear: payload.financialYear,
        date: payload.date,
        type: 'reversal',
        amount: prevDeduction,
        labourEntryId: entryId,
        notes: 'Reversed on labour entry edit',
        balanceAfter: restored,
        createdAt: serverTimestamp(),
      })
    }

    if (entryId) {
      tx.update(entryRef, entryData)
    } else {
      tx.set(entryRef, { ...entryData, createdAt: serverTimestamp() })
    }

    tx.update(workerRef, {
      advanceBalance: nextBalance,
      updatedAt: serverTimestamp(),
    })

    if (entryId && prevLabourId === payload.labourId && prevDeduction > 0) {
      const revRef = doc(collection(db, 'labour_advances'))
      tx.set(revRef, {
        labourId: payload.labourId,
        labourName: worker.name || '',
        labourCode: worker.code || '',
        financialYear: payload.financialYear,
        date: payload.date,
        type: 'reversal',
        amount: prevDeduction,
        labourEntryId: entryRef.id,
        notes: 'Reversed previous deduction on edit',
        balanceAfter: balance,
        createdAt: serverTimestamp(),
      })
    }

    if (advanceDeduction > 0) {
      const dedRef = doc(collection(db, 'labour_advances'))
      tx.set(dedRef, {
        labourId: payload.labourId,
        labourName: worker.name || '',
        labourCode: worker.code || '',
        financialYear: payload.financialYear,
        date: payload.date,
        type: 'deduction',
        amount: advanceDeduction,
        labourEntryId: entryRef.id,
        notes: payload.notes || 'Deducted from labour payment',
        balanceAfter: nextBalance,
        createdAt: serverTimestamp(),
      })
    }

    result = { entryId: entryRef.id, advanceDeduction, netPayment, advanceBalance: nextBalance }
  })

  return result
}

/** Delete labour entry and restore any advance deduction to the worker balance. */
export async function deleteLabourEntryWithAdvance(entry) {
  if (!entry?.id) throw new Error('Missing labour entry.')
  const entryRef = doc(db, 'labour_entries', entry.id)
  const deduction = roundMoney(entry.advanceDeduction)

  if (!entry.labourId || !(deduction > 0)) {
    await deleteDoc(entryRef)
    return
  }

  const workerRef = doc(db, 'labour_workers', entry.labourId)
  await runTransaction(db, async (tx) => {
    const workerSnap = await tx.get(workerRef)
    if (workerSnap.exists()) {
      const balance = roundMoney(workerSnap.data().advanceBalance)
      const nextBalance = roundMoney(balance + deduction)
      tx.update(workerRef, {
        advanceBalance: nextBalance,
        updatedAt: serverTimestamp(),
      })
      const revRef = doc(collection(db, 'labour_advances'))
      tx.set(revRef, {
        labourId: entry.labourId,
        labourName: workerSnap.data().name || entry.labourName || '',
        labourCode: workerSnap.data().code || entry.labourCode || '',
        financialYear: entry.financialYear || '',
        date: entry.date || Timestamp.now(),
        type: 'reversal',
        amount: deduction,
        labourEntryId: entry.id,
        notes: 'Restored on labour entry delete',
        balanceAfter: nextBalance,
        createdAt: serverTimestamp(),
      })
    }
    tx.delete(entryRef)
  })
}

/**
 * Available advance to deduct for a worker.
 * When editing an entry for the same worker, current entry's deduction is added back.
 */
export function availableAdvanceBalance(worker, editingEntry = null) {
  if (!worker) return 0
  let bal = roundMoney(worker.advanceBalance)
  if (
    editingEntry?.labourId &&
    editingEntry.labourId === worker.id &&
    Number(editingEntry.advanceDeduction) > 0
  ) {
    bal = roundMoney(bal + Number(editingEntry.advanceDeduction))
  }
  return Math.max(bal, 0)
}

export function suggestAdvanceDeduction(gross, availableBalance) {
  const g = roundMoney(gross)
  const a = roundMoney(availableBalance)
  if (!(g > 0) || !(a > 0)) return 0
  return roundMoney(Math.min(g, a))
}
