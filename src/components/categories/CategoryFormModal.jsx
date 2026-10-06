import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../common/Modal'

const TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'labour', label: 'Labour' },
  { value: 'production', label: 'Production' },
]

const emptyForm = {
  name: '',
  type: 'income',
  code: '',
  status: 'active',
}

export default function CategoryFormModal({ open, onClose, onSubmit, initial, saving }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name || '',
              type: initial.type || 'income',
              code: initial.code || '',
              status: initial.status || 'active',
            }
          : emptyForm,
      )
      setError('')
    }
  }, [open, initial])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Category name is required.')
      return
    }
    if (!form.code.trim()) {
      setError('Category code is required.')
      return
    }
    setError('')
    await onSubmit(form)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Category' : 'Add Category'}
      subtitle="Reference data for income, expense, labour & production"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="category-form" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : initial ? (
              'Update Category'
            ) : (
              'Create Category'
            )}
          </button>
        </>
      }
    >
      <form id="category-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="cat-name">
            Category Name
          </label>
          <input
            id="cat-name"
            className="input-field"
            placeholder="e.g. Polyester 30D, Factory Power"
            value={form.name}
            onChange={handleChange('name')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cat-type">
              Type
            </label>
            <select
              id="cat-type"
              className="input-field"
              value={form.type}
              onChange={handleChange('type')}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat-status">
              Status
            </label>
            <select
              id="cat-status"
              className="input-field"
              value={form.status}
              onChange={handleChange('status')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cat-code">
            Code
          </label>
          <input
            id="cat-code"
            className="input-field uppercase"
            placeholder="e.g. EXP-PWR-01"
            value={form.code}
            onChange={handleChange('code')}
          />
        </div>
      </form>
    </Modal>
  )
}
