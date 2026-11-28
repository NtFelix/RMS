'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-load-recovery'

/**
 * Meldet den Fehler an PostHog und lädt bei einem ChunkLoadError einmal neu.
 * Greift der Reload nicht (z. B. wegen der Schleifensperre), zeigt die Boundary
 * wie gewohnt ihren Fehlerzustand.
 */
export function useErrorBoundaryReporting(error: Error & { digest?: string }): void {
  useEffect(() => {
    const chunkError = isChunkLoadError(error)
    // Zuerst melden, damit die Häufigkeit auch bei automatischem Reload sichtbar bleibt.
    posthog.captureException(error, chunkError ? { chunk_load_error: true } : undefined)
    if (chunkError) reloadOnceForChunkError()
  }, [error])
}
