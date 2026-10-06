import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
  const issues = []
  for (const key of requiredKeys) {
    const value = firebaseConfig[key]
    if (!value || String(value).startsWith('your_')) {
      issues.push(key)
    }
  }
  return issues
}

const configIssues = getFirebaseConfigIssues()
if (configIssues.length) {
  console.error(
    `[TexFin Pro] Missing/invalid Firebase env keys: ${configIssues.join(', ')}. Update .env and restart the dev server.`,
  )
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
