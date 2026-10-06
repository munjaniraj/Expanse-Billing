'use client'

import { LogOut, Menu, CalendarRange } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useFinancialYear } from '@/context/FinancialYearContext'

export default function Topbar({ onMenuClick, title, subtitle }) {
  const { user, logout } = useAuth()
  const { financialYear, setFinancialYear, options } = useFinancialYear()

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur-md no-print">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl border border-ink-200 p-2 text-ink-600 hover:bg-ink-50 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-sand-50 px-3 py-2 sm:flex-none">
            <CalendarRange className="h-4 w-4 shrink-0 text-gold-600" />
            <label htmlFor="fy-select" className="sr-only">
              Financial Year
            </label>
            <select
              id="fy-select"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink-800"
            >
              {options.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-800 ring-1 ring-gold-300">
              {(user?.email?.[0] || 'R').toUpperCase()}
            </div>
            <p className="max-w-[180px] truncate text-base font-medium text-ink-800">{user?.email}</p>
          </div>

          <button type="button" className="btn-secondary" onClick={logout} title="Sign out">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
