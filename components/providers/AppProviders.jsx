'use client'

import { AuthProvider } from '@/context/AuthContext'
import { FinancialYearProvider } from '@/context/FinancialYearContext'
import { ToastProvider } from '@/context/ToastContext'

export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <FinancialYearProvider>{children}</FinancialYearProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
