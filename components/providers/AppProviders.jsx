'use client'

import { AuthProvider } from '@/context/AuthContext'
import { FinancialYearProvider } from '@/context/FinancialYearContext'

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <FinancialYearProvider>{children}</FinancialYearProvider>
    </AuthProvider>
  )
}
