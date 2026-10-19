'use client'

import { useMemo, useState } from 'react'
import {
  collection,
  query,
  where,
} from 'firebase/firestore'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Factory,
  Loader2,
} from 'lucide-react'
import { db } from '@/services/firebase'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { formatINR, formatINRCompact } from '@/utils/currencyFormatter'
import MetricCard from '@/components/common/MetricCard'
import CategoryBreakdownCard from '@/components/dashboard/CategoryBreakdownCard'
import LabourSummaryTable from '@/components/dashboard/LabourSummaryTable'
import ReceivablesPayablesSummary from '@/components/dashboard/ReceivablesPayablesSummary'
import MetricDrilldownModal from '@/components/dashboard/MetricDrilldownModal'

export default function DashboardView() {
  const { financialYear, label } = useFinancialYear()
  const [drilldown, setDrilldown] = useState(null)

  const txQuery = useMemo(
    () => query(collection(db, 'transactions'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const labourQuery = useMemo(
    () => query(collection(db, 'labour_entries'), where('financialYear', '==', financialYear)),
    [financialYear],
  )
  const stockQuery = useMemo(
    () => query(collection(db, 'production_stock'), where('financialYear', '==', financialYear)),
    [financialYear],
  )

  const { data: transactions, loading: txLoading, error: txError } = useFirestoreQuery(txQuery)
  const { data: labour, loading: labourLoading } = useFirestoreQuery(labourQuery)
  const { data: stock, loading: stockLoading } = useFirestoreQuery(stockQuery)

  const loading = txLoading || labourLoading || stockLoading

  const metrics = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (Number(t.totalAmount) || 0), 0)
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.totalAmount) || 0), 0)
    const labourCost = labour.reduce((s, l) => s + (Number(l.netPayment) || 0), 0)
    const netStockValue = stock.reduce(
      (s, r) => s + (Number(r.netStock) || 0) * (Number(r.unitCost) || 0),
      0,
    )
    return {
      income,
      expense,
      labourCost,
      profit: income - expense - labourCost,
      netStockValue,
      totalExpense: expense + labourCost,
    }
  }, [transactions, labour, stock])

  const incomeRows = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'income')
        .slice()
        .sort(sortByDateDesc),
    [transactions],
  )

  const expenseRows = useMemo(() => {
    const fromTx = transactions
      .filter((t) => t.type === 'expense')
      .map((t) => ({
        id: `tx-${t.id}`,
        date: t.date,
        source: 'Expense',
        name: t.partyName || '—',
        categoryName: t.categoryName || '—',
        totalAmount: t.totalAmount,
      }))
    const fromLabour = labour.map((l) => ({
      id: `lab-${l.id}`,
      date: l.date,
      source: 'Labour',
      name: l.labourName || '—',
      categoryName: l.department || '—',
      totalAmount: l.netPayment,
    }))
    return [...fromTx, ...fromLabour].sort(sortByDateDesc)
  }, [transactions, labour])

  const profitRows = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .map((t) => ({
        id: `inc-${t.id}`,
        date: t.date,
        type: 'income',
        name: t.partyName || '—',
        categoryName: t.categoryName || '—',
        signedAmount: Number(t.totalAmount) || 0,
      }))
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .map((t) => ({
        id: `exp-${t.id}`,
        date: t.date,
        type: 'expense',
        name: t.partyName || '—',
        categoryName: t.categoryName || '—',
        signedAmount: -(Number(t.totalAmount) || 0),
      }))
    const labourRows = labour.map((l) => ({
      id: `lab-${l.id}`,
      date: l.date,
      type: 'labour',
      name: l.labourName || '—',
      categoryName: l.department || '—',
      signedAmount: -(Number(l.netPayment) || 0),
    }))
    return [...income, ...expense, ...labourRows].sort(sortByDateDesc)
  }, [transactions, labour])

  const incomeByCat = useMemo(
    () => aggregateByCategory(transactions.filter((t) => t.type === 'income'), 'totalAmount'),
    [transactions],
  )
  const expenseByCat = useMemo(
    () => aggregateByCategory(transactions.filter((t) => t.type === 'expense'), 'totalAmount'),
    [transactions],
  )
  const profitByCat = useMemo(() => {
    const map = new Map()
    incomeByCat.forEach((i) => map.set(i.name, (map.get(i.name) || 0) + i.amount))
    expenseByCat.forEach((e) => map.set(e.name, (map.get(e.name) || 0) - e.amount))
    return [...map.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [incomeByCat, expenseByCat])

  const labourRows = useMemo(() => {
    const map = new Map()
    labour.forEach((l) => {
      const key = `${l.department || 'General'}|${l.workType || '—'}`
      const prev = map.get(key) || {
        department: l.department || 'General',
        workType: l.workType || '—',
        entries: 0,
        netPayment: 0,
        pendingCount: 0,
      }
      prev.entries += 1
      prev.netPayment += Number(l.netPayment) || 0
      if (l.paymentStatus === 'Pending') prev.pendingCount += 1
      map.set(key, prev)
    })
    return [...map.values()].sort((a, b) => b.netPayment - a.netPayment)
  }, [labour])

  const receivables = useMemo(
    () =>
      aggregateByCategory(
        transactions.filter((t) => t.type === 'income' && (Number(t.pendingAmount) || 0) > 0),
        'pendingAmount',
      ),
    [transactions],
  )
  const payables = useMemo(
    () =>
      aggregateByCategory(
        transactions.filter((t) => t.type === 'expense' && (Number(t.pendingAmount) || 0) > 0),
        'pendingAmount',
      ),
    [transactions],
  )

  const drilldownPayload = useMemo(() => {
    if (!drilldown) return null
    if (drilldown === 'income') {
      return {
        kind: 'income',
        rows: incomeRows,
        totalLabel: 'Total Income',
        totalValue: metrics.income,
      }
    }
    if (drilldown === 'expense') {
      return {
        kind: 'expense',
        rows: expenseRows,
        totalLabel: 'Total Expense (incl. labour)',
        totalValue: metrics.totalExpense,
      }
    }
    if (drilldown === 'profit') {
      return {
        kind: 'profit',
        rows: profitRows,
        totalLabel: 'Net Profit / Loss',
        totalValue: metrics.profit,
      }
    }
    return {
      kind: 'stock',
      rows: stock.slice().sort((a, b) => {
        const va = (Number(a.netStock) || 0) * (Number(a.unitCost) || 0)
        const vb = (Number(b.netStock) || 0) * (Number(b.unitCost) || 0)
        return vb - va
      }),
      totalLabel: 'Stock Value',
      totalValue: metrics.netStockValue,
    }
  }, [drilldown, incomeRows, expenseRows, profitRows, stock, metrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ink-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        Loading {label} dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {txError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live data unavailable until Firebase is configured. Metrics will show zeros for now.
          Update <code className="rounded bg-amber-100 px-1">.env</code> with your project keys.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Income"
          value={formatINRCompact(metrics.income)}
          subtitle={label}
          icon={TrendingUp}
          tone="emerald"
          onClick={() => setDrilldown('income')}
          hint="Click to view all income"
        />
        <MetricCard
          title="Total Expense"
          value={formatINRCompact(metrics.totalExpense)}
          subtitle={`Incl. labour ${formatINRCompact(metrics.labourCost)}`}
          icon={TrendingDown}
          tone="rose"
          onClick={() => setDrilldown('expense')}
          hint="Click to view all expenses"
        />
        <MetricCard
          title="Net Profit / Loss"
          value={formatINRCompact(metrics.profit)}
          subtitle={metrics.profit >= 0 ? 'In the green' : 'Needs attention'}
          icon={Wallet}
          tone={metrics.profit >= 0 ? 'teal' : 'rose'}
          onClick={() => setDrilldown('profit')}
          hint="Click to view P&L breakdown"
        />
        <MetricCard
          title="Stock Value"
          value={formatINRCompact(metrics.netStockValue)}
          subtitle="At unit cost"
          icon={Factory}
          tone="ink"
          onClick={() => setDrilldown('stock')}
          hint="Click to view stock balances"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryBreakdownCard title="Income by Category" items={incomeByCat} tone="emerald" />
        <CategoryBreakdownCard title="Expense by Category" items={expenseByCat} tone="rose" />
        <CategoryBreakdownCard title="Net Profit by Category" items={profitByCat} tone="teal" />
      </div>

      <LabourSummaryTable rows={labourRows} />
      <ReceivablesPayablesSummary receivables={receivables} payables={payables} />

      <div className="card flex items-center gap-3 p-4 text-sm text-ink-500">
        <IndianRupee className="h-4 w-4 text-teal-700" />
        All figures filtered to <strong className="mx-1 text-ink-800">{label}</strong>
        using Indian Rupee formatting (e.g. {formatINR(125000)}).
      </div>

      <MetricDrilldownModal
        open={Boolean(drilldownPayload)}
        kind={drilldownPayload?.kind}
        rows={drilldownPayload?.rows || []}
        totalLabel={drilldownPayload?.totalLabel}
        totalValue={drilldownPayload?.totalValue}
        onClose={() => setDrilldown(null)}
      />
    </div>
  )
}

function sortByDateDesc(a, b) {
  const da = a.date?.toDate?.() || (a.date ? new Date(a.date) : new Date(0))
  const db = b.date?.toDate?.() || (b.date ? new Date(b.date) : new Date(0))
  return db - da
}

function aggregateByCategory(rows, field) {
  const map = new Map()
  rows.forEach((row) => {
    const name = row.categoryName || 'Uncategorised'
    map.set(name, (map.get(name) || 0) + (Number(row[field]) || 0))
  })
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}
