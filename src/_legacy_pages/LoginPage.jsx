import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated, loading, authError, setAuthError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        <div className="mb-10 max-w-xl text-white lg:mb-0 lg:flex-1">
          <div className="mb-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">TexFin Pro</p>
              <p className="text-[11px] text-slate-300">Textile Finance OS</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Run your textile books with clarity.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Indian FY dashboards, category-wise P&amp;L, production stock balances,
            and a live 12-month financial matrix — built for mill &amp; garment ops.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['FY Apr–Mar', 'Indian cycle'],
              ['Live stock', 'Audit trail'],
              ['Excel matrix', 'CSV + Print'],
            ].map(([title, sub]) => (
              <div key={title} className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md lg:flex-none">
          <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use your company email and password to continue.
            </p>

            {authError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (authError) setAuthError('')
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0" htmlFor="password">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={6}
                    className="input-field pl-10 pr-11"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (authError) setAuthError('')
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in to TexFin Pro'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              No account yet?{' '}
              <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Create one
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-slate-400">
              Secure access via Firebase Auth · Email &amp; Password
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
