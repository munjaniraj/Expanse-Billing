'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandLogo from '@/components/brand/BrandLogo'

export default function ForgotPasswordForm() {
  const { resetPassword, isAuthenticated, loading, authError, setAuthError } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/')
  }, [loading, isAuthenticated, router])

  if (!loading && isAuthenticated) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSent(false)
    const result = await resetPassword(email)
    setSubmitting(false)
    if (result.ok) setSent(true)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6">
          <BrandLogo size="md" textClassName="text-white" />
        </div>
        <div className="rounded-3xl border border-gold-500/25 bg-white p-6 shadow-2xl sm:p-8">
          <Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Forgot password?</h1>
          <p className="mt-1 text-sm text-ink-500">We&apos;ll email a secure reset link.</p>
          {authError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
          {sent && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Reset email sent to <strong>{email}</strong>.</span>
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="reset-email">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (authError) setAuthError('')
                    if (sent) setSent(false)
                  }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
