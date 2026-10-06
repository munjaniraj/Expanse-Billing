'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { Download, Loader2, Printer, Calculator } from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { FY_MONTHS } from '@/utils/financialYearHelper'
import { formatINR, parseAmount } from '@/utils/currencyFormatter'
import { downloadCSV } from '@/utils/csvExporter'
import {
  COSTING_COLUMNS,
  avgPerMtr,
  computeCostingSummary,
  emptyCostRow,
  formatAvg,
  rowTotalCost,
} from '@/utils/costingSheet'

function buildEmptyRows() {
  return Object.fromEntries(FY_MONTHS.map((m) => [m.key, emptyCostRow()]))
}

function cloneRows(source) {
  const next = buildEmptyRows()
  FY_MONTHS.forEach((m) => {
    next[m.key] = { ...emptyCostRow(), ...(source?.[m.key] || {}) }
  })
  return next
}

export default function ExcelSheetMatrix() {
  const { financialYear, label } = useFinancialYear()
  const [companyName, setCompanyName] = useState('RKT FABRICS MANUFACTURED')
  const [totalAavak, setTotalAavak] = useState(0)
  const [rows, setRows] = useState(buildEmptyRows)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [saveError, setSaveError] = useState('')

  const dirtyRef = useRef(false)
  const saveTimerRef = useRef(null)
  const latestRef = useRef({ companyName, totalAavak, rows })

  useEffect(() => {
    latestRef.current = { companyName, totalAavak, rows }
  }, [companyName, totalAavak, rows])

  const persistNow = useCallback(async (payload) => {
    setSaving(true)
    setSaveError('')
    try {
      await setDoc(
        doc(db, 'fy_costing', financialYear),
        {
          financialYear,
          companyName: payload.companyName,
          totalAavak: Number(payload.totalAavak) || 0,
          rows: payload.rows,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      dirtyRef.current = false
      setSavedAt(new Date())
    } catch (err) {
      console.error(err)
      setSaveError(err.message || 'Failed to save. Check Firestore rules / login.')
    } finally {
      setSaving(false)
    }
  }, [financialYear])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistNow(latestRef.current)
    }, 450)
  }, [persistNow])

  useEffect(() => {
    setLoading(true)
    setSaveError('')
    dirtyRef.current = false
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    const ref = doc(db, 'fy_costing', financialYear)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // Don't overwrite while user is typing / pending save
        if (dirtyRef.current) {
          setLoading(false)
          return
        }
        if (snap.exists()) {
          const data = snap.data()
          setCompanyName(data.companyName || 'RKT FABRICS MANUFACTURED')
          setTotalAavak(Number(data.totalAavak) || 0)
          setRows(cloneRows(data.rows))
        } else {
          setCompanyName('RKT FABRICS MANUFACTURED')
          setTotalAavak(0)
          setRows(buildEmptyRows())
        }
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setSaveError(err.message || 'Could not load costing sheet.')
        setRows(buildEmptyRows())
        setLoading(false)
      },
    )

    return () => {
      unsub()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [financialYear])

  const summary = useMemo(
    () => computeCostingSummary(rows, totalAavak),
    [rows, totalAavak],
  )

  const updateCell = (monthKey, field, raw) => {
    const value = parseAmount(raw)
    setRows((prev) => {
      const nextRows = cloneRows(prev)
      nextRows[monthKey] = {
        ...emptyCostRow(),
        ...nextRows[monthKey],
        [field]: value,
      }
      latestRef.current = {
        ...latestRef.current,
        rows: nextRows,
      }
      return nextRows
    })
    scheduleSave()
  }

  const updateCompany = (value) => {
    setCompanyName(value)
    latestRef.current = { ...latestRef.current, companyName: value }
    scheduleSave()
  }

  const updateAavak = (raw) => {
    const value = parseAmount(raw)
    setTotalAavak(value)
    latestRef.current = { ...latestRef.current, totalAavak: value }
    scheduleSave()
  }

  const handleExport = () => {
    const header = [
      'Month',
      ...COSTING_COLUMNS.flatMap((c) => [c.label, 'AVG']),
      'MTR',
      'Month Total',
      'Month ₹/Mtr',
    ]
    const body = FY_MONTHS.map((m) => {
      const row = rows[m.key] || emptyCostRow()
      const mtr = Number(row.mtr) || 0
      const total = rowTotalCost(row)
      return [
        m.label,
        ...COSTING_COLUMNS.flatMap((c) => [
          Number(row[c.key]) || 0,
          Number(avgPerMtr(row[c.key], mtr).toFixed(2)),
        ]),
        mtr,
        total,
        Number(avgPerMtr(total, mtr).toFixed(2)),
      ]
    })

    const totals = summary.totals
    body.push([
      'TOTAL',
      ...COSTING_COLUMNS.flatMap((c) => [
        totals[c.key],
        Number(avgPerMtr(totals[c.key], totals.mtr).toFixed(2)),
      ]),
      totals.mtr,
      summary.allCost,
      Number(summary.withEmiAndAll.toFixed(2)),
    ])
    body.push([])
    body.push(['Company', companyName])
    body.push(['FY', label])
    body.push(['Total Aavak', summary.aavak, 'AVG ₹/Mtr', Number(summary.aavakAvg.toFixed(4))])
    body.push(['NET', Number(summary.net.toFixed(2))])
    body.push(['WITH C.C Int & Yarn INT', Number(summary.withInterest.toFixed(2))])
    body.push(['net With Emi', Number(summary.netWithEmi.toFixed(2))])
    body.push(['WITH EMI AND ALL', Number(summary.withEmiAndAll.toFixed(2))])

    downloadCSV(`Costing_${financialYear}.csv`, [header, ...body])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-ink-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        Loading costing sheet…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-ink-500">
            Type amounts in any cell — <strong>AVG</strong>, month totals, and summary ₹/Mtr
            update automatically. Changes save to Firebase after you pause typing.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label className="label">Company</label>
              <input
                className="input-field font-display font-semibold"
                value={companyName}
                onChange={(e) => updateCompany(e.target.value)}
              />
            </div>
            <div className="sm:w-52">
              <label className="label">Total Aavak (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input-field font-mono tabular-nums"
                value={totalAavak === 0 ? '' : totalAavak}
                placeholder="0"
                onChange={(e) => updateAavak(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-500">
            <Calculator className="h-3.5 w-3.5 text-teal-700" />
            {saving
              ? 'Saving…'
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString('en-IN')}`
                : 'Ready for entry'}
          </span>
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

      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {saveError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Total Aavak" value={formatINR(summary.aavak)} sub={`${formatAvg(summary.aavakAvg)} ₹/Mtr`} tone="teal" />
        <SummaryCard title="NET" value={formatAvg(summary.net)} sub="(All − EMI − INT) ÷ MTR" tone="emerald" />
        <SummaryCard title="WITH C.C Int" value={formatAvg(summary.withInterest)} sub="(All − EMI) ÷ MTR" tone="ink" />
        <SummaryCard title="net With Emi" value={formatAvg(summary.netWithEmi)} sub="(All − Other EX) ÷ MTR" tone="amber" />
        <SummaryCard title="WITH EMI AND ALL" value={formatAvg(summary.withEmiAndAll)} sub="All cost ÷ MTR" tone="rose" />
      </div>

      <div className="card print-sheet overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-ink-950">
            {companyName} · {label}
          </h2>
          <p className="text-xs text-ink-500">
            Enter Amount + MTR → AVG calculates instantly · Month Total = sum of all cost heads
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-ink-950 text-white">
                <th className="sticky left-0 z-20 bg-ink-950 px-2 py-2 text-left font-semibold">MONTH</th>
                {COSTING_COLUMNS.map((col) => (
                  <th key={col.key} colSpan={2} className="border-l border-white/10 px-1 py-2 text-center font-semibold">
                    {col.label}
                  </th>
                ))}
                <th className="border-l border-teal-500 bg-teal-800 px-2 py-2 text-right font-semibold">MTR</th>
                <th className="border-l border-amber-400 bg-amber-700 px-2 py-2 text-right font-semibold">Month Total</th>
                <th className="bg-amber-800 px-2 py-2 text-right font-semibold">₹/Mtr</th>
              </tr>
              <tr className="bg-ink-800 text-ink-100">
                <th className="sticky left-0 z-20 bg-ink-800 px-2 py-1.5" />
                {COSTING_COLUMNS.map((col) => (
                  <FragmentPair key={col.key} />
                ))}
                <th className="border-l border-teal-500/40 bg-teal-700 px-2 py-1.5" />
                <th className="border-l border-amber-300/30 bg-amber-700 px-2 py-1.5" />
                <th className="bg-amber-800 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {FY_MONTHS.map((month) => {
                const row = rows[month.key] || emptyCostRow()
                const mtr = Number(row.mtr) || 0
                const monthTotal = rowTotalCost(row)
                const monthAvg = avgPerMtr(monthTotal, mtr)
                return (
                  <tr key={month.key} className="border-b border-ink-100 hover:bg-sand-50/80">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-semibold text-ink-900 shadow-[1px_0_0_#cddce5]">
                      {month.label}
                    </td>
                    {COSTING_COLUMNS.map((col) => (
                      <AmountAvgCells
                        key={col.key}
                        amount={row[col.key]}
                        avg={avgPerMtr(row[col.key], mtr)}
                        onChange={(raw) => updateCell(month.key, col.key, raw)}
                      />
                    ))}
                    <td className="border-l border-teal-100 bg-teal-50/50 px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-full min-w-[4.5rem] rounded-lg border border-transparent bg-transparent px-1 py-1.5 text-right font-mono tabular-nums font-semibold text-teal-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                        value={mtr === 0 ? '' : mtr}
                        placeholder="0"
                        onChange={(e) => updateCell(month.key, 'mtr', e.target.value)}
                      />
                    </td>
                    <td className="border-l border-amber-100 bg-amber-50/60 px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-ink-900">
                      {monthTotal ? formatINR(monthTotal) : '—'}
                    </td>
                    <td className="bg-amber-50/40 px-2 py-1.5 text-right font-mono tabular-nums font-bold text-amber-900">
                      {monthAvg > 0 ? formatAvg(monthAvg) : '—'}
                    </td>
                  </tr>
                )
              })}

              <tr className="bg-ink-950 text-white">
                <td className="sticky left-0 z-10 bg-ink-950 px-2 py-2.5 font-bold">TOTAL</td>
                {COSTING_COLUMNS.map((col) => (
                  <td key={col.key} colSpan={2} className="border-l border-white/10 px-2 py-2.5 text-center">
                    <div className="font-mono tabular-nums font-semibold">
                      {formatINR(summary.totals[col.key])}
                    </div>
                    <div className="text-xs text-teal-200">
                      AVG {formatAvg(avgPerMtr(summary.totals[col.key], summary.mtr))}
                    </div>
                  </td>
                ))}
                <td className="border-l border-teal-400 bg-teal-800 px-2 py-2.5 text-right font-mono tabular-nums font-bold">
                  {summary.mtr.toLocaleString('en-IN')}
                </td>
                <td className="border-l border-amber-300 bg-amber-700 px-2 py-2.5 text-right font-mono tabular-nums font-bold">
                  {formatINR(summary.allCost)}
                </td>
                <td className="bg-amber-800 px-2 py-2.5 text-right font-mono tabular-nums font-bold">
                  {formatAvg(summary.withEmiAndAll)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 border-t border-ink-100 bg-sand-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FooterStat label="Total cost" value={formatINR(summary.allCost)} />
          <FooterStat label="Total MTR" value={summary.mtr.toLocaleString('en-IN')} />
          <FooterStat label="Aavak AVG" value={`${formatAvg(summary.aavakAvg)} ₹/Mtr`} />
          <FooterStat label="Full cost AVG" value={`${formatAvg(summary.withEmiAndAll)} ₹/Mtr`} />
        </div>
      </div>
    </div>
  )
}

function FragmentPair() {
  return (
    <>
      <th className="border-l border-white/10 px-1 py-1.5 text-right font-medium">Amount</th>
      <th className="px-1 py-1.5 text-right font-medium text-teal-200">AVG</th>
    </>
  )
}

function AmountAvgCells({ amount, avg, onChange }) {
  const n = Number(amount) || 0
  return (
    <>
      <td className="border-l border-ink-100 px-0.5 py-1">
        <input
          type="number"
          min="0"
          step="any"
          className="w-full min-w-[4.2rem] rounded-lg border border-transparent bg-transparent px-1 py-1.5 text-right font-mono tabular-nums text-ink-800 outline-none hover:bg-white/80 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          value={n === 0 ? '' : n}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
      </td>
      <td className="bg-ink-50/40 px-1.5 py-1.5 text-right font-mono tabular-nums text-teal-800">
        {avg > 0 ? formatAvg(avg) : '—'}
      </td>
    </>
  )
}

function SummaryCard({ title, value, sub, tone = 'ink' }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50 text-teal-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    ink: 'border-ink-200 bg-white text-ink-950',
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-70 sm:text-sm">{title}</p>
      <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm opacity-70">{sub}</p>
    </div>
  )
}

function FooterStat({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-base font-bold tabular-nums text-ink-900">{value}</p>
    </div>
  )
}
