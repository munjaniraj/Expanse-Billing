'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LogOut,
  Menu,
  CalendarRange,
  ChevronDown,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useFinancialYear } from '@/context/FinancialYearContext'
import { useToast } from '@/context/ToastContext'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'

export default function Topbar({ onMenuClick, title, subtitle }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const { financialYear, setFinancialYear, options } = useFinancialYear()
  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const menuRef = useRef(null)

  const initial = (user?.email?.[0] || 'U').toUpperCase()

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointer = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    toast.success('Signed out successfully')
  }

  return (
    <>
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
                onChange={(e) => {
                  setFinancialYear(e.target.value)
                  toast.info(`Financial year set to FY ${e.target.value}`)
                }}
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink-800"
              >
                {options.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-left transition hover:bg-sand-50 sm:px-3 sm:py-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-800 ring-1 ring-gold-300">
                  {initial}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-[160px] truncate text-sm font-semibold text-ink-900">
                    {user?.email || 'Account'}
                  </span>
                  <span className="block text-xs text-ink-400">Profile</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-400 transition ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg shadow-ink-900/10"
                >
                  <div className="border-b border-ink-100 bg-sand-50/80 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-800 ring-1 ring-gold-300">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-950">
                          {user?.email || 'Account'}
                        </p>
                        <p className="text-xs text-ink-500">Signed in</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                      onClick={() => {
                        setMenuOpen(false)
                        setPasswordOpen(true)
                      }}
                    >
                      <KeyRound className="h-4 w-4 text-ink-500" />
                      Change Password
                    </button>
                    <div className="my-1 border-t border-ink-100" />
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}
