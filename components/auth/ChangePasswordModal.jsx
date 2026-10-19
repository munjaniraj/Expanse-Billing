'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
import Modal from '@/components/common/Modal'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

/**
 * Note: Firebase never returns the user's old password (security).
 * Current Password uses browser autofill (password manager) when available.
 * Values are uncontrolled so the browser can fill them without React clearing them.
 */
export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword, user } = useAuth()
  const toast = useToast()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const currentPasswordRef = useRef(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return
    setError('')
    setSaving(false)
    // Remount inputs each open so fields start empty, then browser may autofill
    setFormKey((k) => k + 1)
    const timer = window.setTimeout(() => {
      currentPasswordRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const currentPassword = String(data.get('current-password') || '')
    const newPassword = String(data.get('new-password') || '')
    const confirmPassword = String(data.get('confirm-password') || '')

    if (!currentPassword) {
      setError('Enter your current password (or let the browser autofill it).')
      currentPasswordRef.current?.focus()
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.')
      return
    }

    setSaving(true)
    setError('')
    const result = await changePassword(currentPassword, newPassword)
    setSaving(false)

    if (!result.ok) {
      setError(result.message || 'Could not change password.')
      currentPasswordRef.current?.focus()
      return
    }

    toast.success('Password changed successfully')
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Change Password"
      subtitle={user?.email ? `Account: ${user.email}` : 'Update your login password'}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className="btn-primary w-full sm:w-auto"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </>
      }
    >
      <form
        key={formKey}
        id={formId}
        className="space-y-4"
        onSubmit={handleSubmit}
        autoComplete="on"
        method="post"
      >
        <div className="flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50/70 px-3 py-3 text-sm text-ink-700">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
          <p>
            Current password can be filled by your browser password manager. Firebase does not store
            or return your old password in the app.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Username for password-manager autofill of current password */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          defaultValue={user?.email || ''}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <div>
          <label className="label" htmlFor="current-password">
            Current Password
          </label>
          <input
            ref={currentPasswordRef}
            id="current-password"
            name="current-password"
            type="password"
            className="input-field"
            autoComplete="current-password"
            autoFocus
            required
            defaultValue=""
            placeholder="Autofill or type current password"
          />
          <p className="mt-1 text-xs text-ink-400">
            If saved in the browser, current password may fill automatically.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="new-password">
            New Password
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            className="input-field"
            autoComplete="new-password"
            required
            minLength={6}
            defaultValue=""
            placeholder="Enter new password"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm-password">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            className="input-field"
            autoComplete="new-password"
            required
            minLength={6}
            defaultValue=""
            placeholder="Re-enter new password"
          />
        </div>
      </form>
    </Modal>
  )
}
