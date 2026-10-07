import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Next.js only inlines env vars when accessed as static strings.
// Dynamic keys like process.env[`NEXT_PUBLIC_${name}`] are always empty on the client.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    '',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    '',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    '',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    '',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    '',
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
  if (getFirebaseConfigIssues().length) {
    console.error(
      `[TexFin Pro] Missing Firebase env keys: ${getFirebaseConfigIssues().join(', ')}. ` +
        'Set NEXT_PUBLIC_FIREBASE_* in .env.local and restart the dev server.',
    )
    return null
  }
  try {
    return initializeApp(firebaseConfig)
  } catch (err) {
    console.error('[TexFin Pro] Firebase init failed:', err)
    return null
  }
}

const app = createFirebaseApp()

let auth = null
let db = null
if (app) {
  try {
    auth = getAuth(app)
    db = getFirestore(app)
  } catch {
    auth = null
    db = null
  }
}

export { auth, db }
export default app
