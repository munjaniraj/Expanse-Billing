'use client'

import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

export function useFirestoreQuery(queryRef) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!queryRef) {
      setData([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const unsub = onSnapshot(
      queryRef,
      (snapshot) => {
        if (typeof snapshot.forEach === 'function') {
          const docs = []
          snapshot.forEach((docSnap) => {
            docs.push({ id: docSnap.id, ...docSnap.data() })
          })
          setData(docs)
        } else {
          setData(snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : [])
        }
        setError(null)
        setLoading(false)
      },
      (err) => {
        console.error('Firestore listener error:', err)
        setError(err)
        setLoading(false)
      },
    )

    return unsub
  }, [queryRef])

  return { data, loading, error }
}
