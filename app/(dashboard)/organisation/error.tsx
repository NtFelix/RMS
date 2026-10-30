'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    posthog.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="bg-red-500/10 text-red-500 p-4 rounded-full">
        <AlertTriangle className="size-10" />
      </div>
      <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Ein Fehler ist aufgetreten</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Die Organisationsseite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
      </p>
      <Button onClick={() => reset()} variant="outline" className="rounded-xl mt-2">
        Erneut versuchen
      </Button>
    </div>
  )
}
