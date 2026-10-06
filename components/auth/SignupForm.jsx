'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandLogo from '@/components/brand/BrandLogo'

export default function SignupForm() {
  const { signup, isAuthenticated, loading, authError, setAuthError } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/')
  }, [loading, isAuthenticated, router])

  if (!loading && isAuthenticated) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (password.length < 6) return setLocalError('Password must be at least 6 characters.')
    if (password !== confirm) return setLocalError('Passwords do not match.')
    setSubmitting(true)
    const result = await signup(email, password)
    setSubmitting(false)
    if (result.ok) router.replace('/')
  }

  const error = localError || authError

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gold-700/15 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6">
          <BrandLogo size="md" textClassName="text-white" />
        </div>
        <div className="rounded-3xl border border-gold-500/25 bg-white p-6 shadow-2xl sm:p-8">
          <Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Sign up</h1>
          <p className="mt-1 text-sm text-ink-500">Create your RKT Fabrics account.</p>
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="signup-email">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input id="signup-email" type="email" required className="input-field pl-10" value={email} onChange={(e) => { setEmail(e.target.value); setLocalError(''); if (authError) setAuthError('') }} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="signup-password">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input id="signup-password" type={showPassword ? 'text' : 'password'} required minLength={6} className="input-field pl-10 pr-11" value={password} onChange={(e) => { setPassword(e.target.value); setLocalError('') }} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="signup-confirm">Confirm password</label>
              <input id="signup-confirm" type={showPassword ? 'text' : 'password'} required className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><UserPlus className="h-4 w-4" /> Create account</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
