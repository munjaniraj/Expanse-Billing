'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
    }
  }, [loading, isAuthenticated, router, pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-ink-600">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Loading RKT Fabrics…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null
  return children
}
