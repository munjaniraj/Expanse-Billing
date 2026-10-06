import { createContext, useContext, useMemo, useState } from 'react'
import {
  formatFyLabel,
  getCurrentFinancialYear,
  getFinancialYearOptions,
} from '../utils/financialYearHelper'

const FinancialYearContext = createContext(null)

export function FinancialYearProvider({ children }) {
  const options = useMemo(() => getFinancialYearOptions(6), [])
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear())

  const value = useMemo(
    () => ({
      financialYear,
      setFinancialYear,
      options,
      label: formatFyLabel(financialYear),
    }),
    [financialYear, options],
  )

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  )
}

export function useFinancialYear() {
  const ctx = useContext(FinancialYearContext)
  if (!ctx) {
    throw new Error('useFinancialYear must be used within FinancialYearProvider')
  }
  return ctx
}
