import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Tags,
  Factory,
  Sheet,
  Receipt,
  Users,
  X,
  Layers,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/labour', label: 'Labour', icon: Users },
  { to: '/production', label: 'Production & Stock', icon: Factory },
  { to: '/excel-sheet', label: 'Manage Excel Sheet', icon: Sheet },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-100 transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-900/40">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">TexFin Pro</p>
              <p className="text-[11px] text-slate-400">Textile Finance OS</p>
            </div>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </p>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/5 px-3 py-3 text-xs text-slate-400">
            Indian FY cycle · Apr – Mar
            <br />
            <span className="text-slate-300">Category-wise P&amp;L ready</span>
          </div>
        </div>
      </aside>
    </>
  )
}
