'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Tags,
  Factory,
  Sheet,
  Receipt,
  Users,
  X,
} from 'lucide-react'
import BrandLogo from '@/components/brand/BrandLogo'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/labour', label: 'Labour', icon: Users },
  { href: '/production', label: 'Production & Stock', icon: Factory },
  { href: '/excel-sheet', label: 'Costing Sheet', icon: Sheet },
]

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname()

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gold-500/20 bg-black text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gold-500/20 px-4 py-4">
          <BrandLogo size="md" textClassName="text-white" />
          <button type="button" className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-500/80">
            Main Menu
          </p>
          {links.map(({ href, label, icon: Icon, end }) => {
            const active = end ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition ${
                  active
                    ? 'bg-gold-600 text-black shadow-md shadow-gold-900/30'
                    : 'text-ink-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gold-500/20 p-4">
          <div className="rounded-xl bg-white/5 px-3 py-3 text-sm text-ink-300 ring-1 ring-gold-500/15">
            <span className="font-semibold text-gold-500">RKT Fabrics</span>
            <br />
            Indian FY · Apr – Mar
          </div>
        </div>
      </aside>
    </>
  )
}
