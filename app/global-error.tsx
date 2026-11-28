'use client'
import { useErrorBoundaryReporting } from '@/hooks/use-error-boundary-reporting'

// Fängt Fehler im Root-Layout ab (z. B. ChunkLoadError nach einem Deploy).
// Ersetzt das Root-Layout und muss daher <html> und <body> selbst rendern.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useErrorBoundaryReporting(error)

  return (
    <html lang="de">
      <body>
        <h2>Ein Fehler ist aufgetreten</h2>
        <button onClick={() => reset()}>Erneut versuchen</button>
      </body>
    </html>
  )
}
