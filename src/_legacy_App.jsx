import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FinancialYearProvider } from './context/FinancialYearContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import CategoriesPage from './pages/CategoriesPage'
import TransactionsPage from './pages/TransactionsPage'
import LabourPage from './pages/LabourPage'
import ProductionPage from './pages/ProductionPage'
import ExcelSheetPage from './pages/ExcelSheetPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FinancialYearProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="labour" element={<LabourPage />} />
              <Route path="production" element={<ProductionPage />} />
              <Route path="excel-sheet" element={<ExcelSheetPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FinancialYearProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
