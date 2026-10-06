'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandLogo from '@/components/brand/BrandLogo'

export default function LoginForm() {
  const { login, isAuthenticated, loading, authError, setAuthError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(searchParams.get('next') || '/')
    }
  }, [loading, isAuthenticated, router, searchParams])

  if (!loading && isAuthenticated) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) router.replace(searchParams.get('next') || '/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-black">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-gold-700/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,175,55,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,.35) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        <div className="mb-10 max-w-xl text-white lg:mb-0 lg:flex-1">
          <div className="mb-6 inline-flex rounded-2xl bg-black/60 p-3 ring-1 ring-gold-500/40 backdrop-blur">
            <BrandLogo size="lg" textClassName="text-white" />
          </div>
          <div className="mb-6 overflow-hidden rounded-2xl border border-gold-500/30 bg-black shadow-2xl shadow-gold-900/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.jpeg"
              alt="RKT Fabrics Manufactured"
              className="h-auto w-full max-w-md object-contain"
            />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Finance control for premium fabric manufacturing.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-300 sm:text-xl">
            Costing, stock, labour and FY reports — branded for RKT Fabrics Manufactured.
          </p>
        </div>

        <div className="w-full max-w-md lg:flex-none">
          <div className="rounded-3xl border border-gold-500/25 bg-white p-6 shadow-2xl shadow-black/40 sm:p-8">
            <h2 className="font-display text-3xl font-semibold text-ink-950">Sign in</h2>
            <p className="mt-1 text-base text-ink-500">RKT Fabrics · secure staff access</p>

            {authError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@rktfabrics.com"
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
                  <label className="label mb-0" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-gold-700 hover:text-gold-800">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in to RKT'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500">
              No account yet?{' '}
              <Link href="/signup" className="font-semibold text-gold-700 hover:text-gold-800">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
