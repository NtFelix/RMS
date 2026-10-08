'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'
import { isLocalDevEnvironment } from '@/lib/posthog-local-dev'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Skip local dev errors (e.g. Next.js Fast Refresh / HMR failures) so they
    // don't pollute production error tracking.
    if (isLocalDevEnvironment()) return
    posthog.captureException(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
