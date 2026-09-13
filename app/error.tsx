'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

// Chunk-load failures are transient: in dev they happen constantly during
// Turbopack HMR / fast refresh, and in production they happen when a user has
// an old tab open after a deploy invalidates the previously hashed chunks.
// Neither is a real application bug, so we don't want them polluting error
// tracking — a reload fetches the fresh chunks instead.
function isChunkLoadError(error: Error): boolean {
  const name = error.name ?? ''
  const message = error.message ?? ''
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to load chunk/i.test(message) ||
    /Loading CSS chunk/i.test(message)
  )
}

// Guard against reload loops: if a reload doesn't resolve the chunk error
// (i.e. the chunk is genuinely gone, not just stale), don't keep reloading.
// A timestamp lets the guard self-heal so a later, unrelated stale chunk in
// the same tab session can still trigger a fresh reload.
const RELOAD_GUARD_KEY = 'rms:chunk-reload-at'
const RELOAD_GUARD_WINDOW_MS = 10_000

function shouldReloadForChunkError(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY))
    if (last && Date.now() - last < RELOAD_GUARD_WINDOW_MS) {
      return false
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // sessionStorage can throw (private mode / disabled storage); reload anyway.
  }
  return true
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      // Attempt a one-time reload to pick up fresh chunks (handles the
      // genuine post-deploy case in production) instead of stranding the
      // user on the error screen. Don't report it as an exception.
      if (shouldReloadForChunkError()) {
        window.location.reload()
      }
      return
    }

    // Only report genuine errors, and only from production builds — dev-mode
    // noise (Turbopack chunk hiccups, fast-refresh churn) shouldn't reach
    // error tracking.
    if (process.env.NODE_ENV === 'production') {
      posthog.captureException(error)
    }
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
