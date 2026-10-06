import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  query,
  where,
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore'
import { Download, Printer, Loader2 } from 'lucide-react'
import { db } from '../../services/firebase'
import { useFinancialYear } from '../../context/FinancialYearContext'
import { useFirestoreQuery } from '../../hooks/useFirestoreQuery'
import { FY_MONTHS } from '../../utils/financialYearHelper'
import { formatINR } from '../../utils/currencyFormatter'
import { downloadCSV } from '../../utils/csvExporter'
import { parseAmount } from '../../utils/currencyFormatter'

const monthKeys = FY_MONTHS.map((m) => m.key)

function emptyMonths() {
  return Object.fromEntries(monthKeys.map((k) => [k, 0]))
}

export default function ExcelSheetMatrix() {
  const { financialYear, label } = useFinancialYear()
  const catsQuery = useMemo(
    () => query(collection(db, 'categories'), where('status', '==', 'active')),
    [],
  )
  const { data: categories, loading: catLoading } = useFirestoreQuery(catsQuery)

  const incomeCats = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  )
  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  const [matrix, setMatrix] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingCell, setSavingCell] = useState('')

  useEffect(() => {
    setLoading(true)
    const ref = collection(db, 'fy_matrix')
    const q = query(ref, where('financialYear', '==', financialYear))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = {}
        snap.forEach((d) => {
          const data = d.data()
          next[data.categoryId] = { ...emptyMonths(), ...data.months }
        })
        setMatrix(next)
        setLoading(false)
      },
      () => {
        setMatrix({})
        setLoading(false)
      },
    )
    return unsub
  }, [financialYear])

  const getValue = (categoryId, monthKey) =>
    Number(matrix[categoryId]?.[monthKey]) || 0

  const rowTotal = (categoryId) =>
    monthKeys.reduce((sum, m) => sum + getValue(categoryId, m), 0)

  const columnSum = (monthKey, cats) =>
    cats.reduce((sum, c) => sum + getValue(c.id, monthKey), 0)

  const handleCellChange = async (category, monthKey, raw) => {
    const value = parseAmount(raw)
    const cellId = `${category.id}_${monthKey}`
    setSavingCell(cellId)
    const months = { ...emptyMonths(), ...(matrix[category.id] || {}), [monthKey]: value }
    setMatrix((prev) => ({ ...prev, [category.id]: months }))

    try {
      const docId = `${financialYear}_${category.id}`
      await setDoc(
        doc(db, 'fy_matrix', docId),
        {
          financialYear,
          categoryId: category.id,
          categoryName: category.name,
          type: category.type,
          months,
        },
        { merge: true },
      )
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCell('')
    }
  }

  const handleExport = () => {
    const header = ['Type', 'Category', ...FY_MONTHS.map((m) => m.label), 'Total']
    const rows = [header]

    ;[
      ['Income', incomeCats],
      ['Expense', expenseCats],
    ].forEach(([type, cats]) => {
      cats.forEach((c) => {
        rows.push([
          type,
          c.name,
          ...monthKeys.map((m) => getValue(c.id, m)),
          rowTotal(c.id),
        ])
      })
    })

    rows.push([])
    rows.push([
      'Summary',
      'Total Income',
      ...monthKeys.map((m) => columnSum(m, incomeCats)),
      monthKeys.reduce((s, m) => s + columnSum(m, incomeCats), 0),
    ])
    rows.push([
      'Summary',
      'Total Expense',
      ...monthKeys.map((m) => columnSum(m, expenseCats)),
      monthKeys.reduce((s, m) => s + columnSum(m, expenseCats), 0),
    ])
    rows.push([
      'Summary',
      'Net Profit / Loss',
      ...monthKeys.map((m) => columnSum(m, incomeCats) - columnSum(m, expenseCats)),
      monthKeys.reduce(
        (s, m) => s + columnSum(m, incomeCats) - columnSum(m, expenseCats),
        0,
      ),
    ])

    downloadCSV(`TexFin_${financialYear}_matrix.csv`, rows)
  }

  if (catLoading || loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        Loading matrix…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Live 12-month grid for {label}. Click any cell to edit — totals recalculate instantly.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {!incomeCats.length && !expenseCats.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add active Income and Expense categories to populate this matrix.
        </div>
      )}

      <div className="card print-sheet overflow-hidden">
        <div className="print-only hidden border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold">TexFin Pro — {label} Financial Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-10 bg-slate-900 px-3 py-3 text-left font-semibold">
                  Category
                </th>
                {FY_MONTHS.map((m) => (
                  <th key={m.key} className="px-2 py-3 text-right font-semibold">
                    {m.label}
                  </th>
                ))}
                <th className="bg-indigo-700 px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {incomeCats.length > 0 && (
                <SectionHeader label="Income" tone="emerald" colSpan={14} />
              )}
              {incomeCats.map((c) => (
                <MatrixRow
                  key={c.id}
                  category={c}
                  getValue={getValue}
                  rowTotal={rowTotal}
                  onChange={handleCellChange}
                  savingCell={savingCell}
                  tone="emerald"
                />
              ))}
              <TotalsRow
                label="Total Income"
                cats={incomeCats}
                columnSum={columnSum}
                tone="emerald"
              />

              {expenseCats.length > 0 && (
                <SectionHeader label="Expense" tone="rose" colSpan={14} />
              )}
              {expenseCats.map((c) => (
                <MatrixRow
                  key={c.id}
                  category={c}
                  getValue={getValue}
                  rowTotal={rowTotal}
                  onChange={handleCellChange}
                  savingCell={savingCell}
                  tone="rose"
                />
              ))}
              <TotalsRow
                label="Total Expense"
                cats={expenseCats}
                columnSum={columnSum}
                tone="rose"
              />

              <tr className="bg-slate-900 text-white">
                <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 font-bold">
                  Net Profit / Loss
                </td>
                {monthKeys.map((m) => {
                  const net = columnSum(m, incomeCats) - columnSum(m, expenseCats)
                  return (
                    <td
                      key={m}
                      className={`px-2 py-3 text-right tabular-nums font-semibold ${
                        net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {formatINR(net)}
                    </td>
                  )
                })}
                <td
                  className={`bg-indigo-700 px-3 py-3 text-right tabular-nums font-bold ${
                    monthKeys.reduce(
                      (s, m) => s + columnSum(m, incomeCats) - columnSum(m, expenseCats),
                      0,
                    ) >= 0
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}
                >
                  {formatINR(
                    monthKeys.reduce(
                      (s, m) => s + columnSum(m, incomeCats) - columnSum(m, expenseCats),
                      0,
                    ),
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, tone, colSpan }) {
  return (
    <tr className={tone === 'emerald' ? 'bg-emerald-50' : 'bg-rose-50'}>
      <td
        colSpan={colSpan}
        className={`px-3 py-2 text-xs font-bold uppercase tracking-wide ${
          tone === 'emerald' ? 'text-emerald-800' : 'text-rose-800'
        }`}
      >
        {label}
      </td>
    </tr>
  )
}

function MatrixRow({ category, getValue, rowTotal, onChange, savingCell, tone }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80">
      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-800 shadow-[1px_0_0_#e2e8f0]">
        {category.name}
      </td>
      {monthKeys.map((m) => {
        const cellId = `${category.id}_${m}`
        return (
          <td key={m} className="px-1 py-1">
            <input
              type="number"
              className={`w-full min-w-[4.5rem] rounded-lg border border-transparent bg-transparent px-1.5 py-1.5 text-right tabular-nums text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${
                savingCell === cellId ? 'opacity-60' : ''
              } ${tone === 'emerald' ? 'focus:text-emerald-700' : 'focus:text-rose-700'}`}
              value={getValue(category.id, m) || ''}
              placeholder="0"
              onChange={(e) => onChange(category, m, e.target.value)}
            />
          </td>
        )
      })}
      <td className="bg-slate-50 px-3 py-2 text-right tabular-nums font-bold text-slate-900">
        {formatINR(rowTotal(category.id))}
      </td>
    </tr>
  )
}

function TotalsRow({ label, cats, columnSum, tone }) {
  const grand = monthKeys.reduce((s, m) => s + columnSum(m, cats), 0)
  return (
    <tr className={tone === 'emerald' ? 'bg-emerald-100/70' : 'bg-rose-100/70'}>
      <td className="sticky left-0 z-10 px-3 py-2.5 font-bold text-slate-900 shadow-[1px_0_0_#e2e8f0] bg-inherit">
        {label}
      </td>
      {monthKeys.map((m) => (
        <td key={m} className="px-2 py-2.5 text-right tabular-nums font-semibold text-slate-800">
          {formatINR(columnSum(m, cats))}
        </td>
      ))}
      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">
        {formatINR(grand)}
      </td>
    </tr>
  )
}
