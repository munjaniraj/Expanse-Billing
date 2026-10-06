'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

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
    title: 'Costing Sheet',
    subtitle: 'Monthly PAGAR / E-Bill / GAS / MTR costing with ₹/Mtr averages',
  },
}

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const meta = titles[pathname] || { title: 'TexFin Pro', subtitle: '' }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            title={meta.title}
            subtitle={meta.subtitle}
          />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
