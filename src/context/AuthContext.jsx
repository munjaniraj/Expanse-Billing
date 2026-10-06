import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { auth, getFirebaseConfigIssues } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async (email, password) => {
    setAuthError('')
    const configError = validateFirebaseConfig()
    if (configError) {
      setAuthError(configError)
      return { ok: false, message: configError }
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return { ok: true }
    } catch (err) {
      const message = mapAuthError(err)
      setAuthError(message)
      return { ok: false, message }
    }
  }

  const signup = async (email, password) => {
    setAuthError('')
    const configError = validateFirebaseConfig()
    if (configError) {
      setAuthError(configError)
      return { ok: false, message: configError }
    }
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
      return { ok: true }
    } catch (err) {
      const message = mapAuthError(err)
      setAuthError(message)
      return { ok: false, message }
    }
  }

  const resetPassword = async (email) => {
    setAuthError('')
    const configError = validateFirebaseConfig()
    if (configError) {
      setAuthError(configError)
      return { ok: false, message: configError }
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
      return { ok: true }
    } catch (err) {
      const message = mapAuthError(err)
      setAuthError(message)
      return { ok: false, message }
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      setAuthError,
      login,
      signup,
      resetPassword,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function validateFirebaseConfig() {
  const issues = getFirebaseConfigIssues()
  if (!issues.length) return ''
  return 'Firebase config is incomplete. Check .env keys and restart the app.'
}

function mapAuthError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Email/Password login is not enabled in Firebase. Open Authentication → Sign-in method → enable Email/Password, then try again.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your admin.'
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and Firebase config.'
    case 'auth/missing-email':
      return 'Email address is required.'
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Update VITE_FIREBASE_API_KEY in .env and restart.'
    default:
      return err?.message || 'Something went wrong. Please try again.'
  }
}
