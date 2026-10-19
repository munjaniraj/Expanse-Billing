import { Suspense } from 'react'
import TransactionsView from '@/components/views/TransactionsView'

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-sm text-ink-500">Loading transactions…</div>
      }
    >
      <TransactionsView />
    </Suspense>
  )
}
