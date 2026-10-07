import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

function readEnv(name) {
  // Prefer Next.js public vars; fall back to legacy Vite names if mapped in next.config.
  return (
    process.env[`NEXT_PUBLIC_${name}`] ||
    process.env[`VITE_${name}`] ||
    ''
  )
}

const firebaseConfig = {
  apiKey: readEnv('FIREBASE_API_KEY'),
  authDomain: readEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('FIREBASE_APP_ID'),
}

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

export function getFirebaseConfigIssues() {
  return requiredKeys.filter((key) => {
    const value = firebaseConfig[key]
    return !value || String(value).startsWith('your_')
  })
}

function createFirebaseApp() {
  if (getApps().length) return getApp()
  if (getFirebaseConfigIssues().length) return null
  return initializeApp(firebaseConfig)
}

const app = createFirebaseApp()

// Avoid crashing Next/Vercel prerender when Firebase env vars are missing.
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export default app
