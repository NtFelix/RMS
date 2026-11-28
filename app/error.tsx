'use client'
import { useErrorBoundaryReporting } from '@/hooks/use-error-boundary-reporting'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useErrorBoundaryReporting(error)

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
