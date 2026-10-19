'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '@/components/common/Modal'

export default function ConfirmDeleteModal({
  open,
  title = 'Delete record?',
  message = 'Are you sure you want to delete this record?',
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose?.()}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-ink-800 sm:text-base">{message}</p>
          {detail && (
            <p className="text-sm text-ink-500">
              {detail}
            </p>
          )}
          <p className="text-xs text-ink-400">This action cannot be undone.</p>
        </div>
      </div>
    </Modal>
  )
}
