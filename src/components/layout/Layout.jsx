import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Income, expense & category-wise performance overview',
  },
  '/categories': {
    title: 'Category Master',
    subtitle: 'Manage income, expense, labour and production categories',
  },
  '/transactions': {
    title: 'Transactions',
    subtitle: 'Track sales, purchases and payment status',
  },
  '/labour': {
    title: 'Labour Entries',
    subtitle: 'Piece rate, daily wage and contract payments',
  },
  '/production': {
    title: 'Production vs Sales',
    subtitle: 'Stock balances, movements and audit trail',
  },
  '/excel-sheet': {
    title: 'Manage Excel Sheet',
    subtitle: '12-month financial matrix with live totals',
  },
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const meta = titles[pathname] || { title: 'TexFin Pro', subtitle: '' }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          title={meta.title}
          subtitle={meta.subtitle}
        />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
