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
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-gold-600/25 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-gold-700/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_70%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-0">
        {/* Left — brand */}
        <section className="animate-[fadeUp_0.7s_ease-out_both] max-w-xl">
          <div className="mb-8 inline-flex rounded-2xl bg-black/70 p-2.5 ring-1 ring-gold-500/35 backdrop-blur-sm">
            <BrandLogo size="md" textClassName="text-white" />
          </div>

          <div className="mb-8 max-w-md animate-[fadeUp_0.85s_ease-out_0.08s_both]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.jpeg"
              alt="RKT Fabrics Manufactured"
              className="h-auto w-full object-contain drop-shadow-[0_20px_50px_rgba(197,160,89,0.18)]"
            />
          </div>

          <h1 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Finance control for premium fabric manufacturing.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-300 sm:text-lg">
            Costing, stock, labour and FY reports — branded for RKT Fabrics
          </p>
        </section>

        {/* Right — sign-in card */}
        <section className="animate-[fadeUp_0.75s_ease-out_0.12s_both] w-full justify-self-end lg:max-w-[420px]">
          <div className="rounded-2xl bg-white p-7 text-ink-950 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-8">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">RKT Fabrics · secure staff access</p>

            {authError && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field pl-11"
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
                  <label className="label mb-0" htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-gold-700 transition hover:text-gold-800"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={6}
                    className="input-field pl-11 pr-11"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (authError) setAuthError('')
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary mt-1 w-full py-3.5 text-[15px] shadow-md shadow-gold-800/25"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in to RKT'
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-ink-500">
              No account yet?{' '}
              <Link href="/signup" className="font-semibold text-gold-700 transition hover:text-gold-800">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
