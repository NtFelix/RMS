'use client'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

// Next.js hashes Server Action IDs per build. When a deploy lands while a user is
// still on an older page, submitting a form references an action ID the new
// deployment no longer knows about and Next throws:
//   "Failed to find Server Action \"...\". This request might be from an older or
//    newer deployment."
// A pinned encryption key (next.config.mjs) keeps IDs stable across most deploys,
// but a client can still be mid-transition. In that case the freshest fix is to
// reload so the browser fetches the current page with valid action IDs.
function isStaleDeploymentError(error: Error): boolean {
  const message = `${error?.message ?? ''}`
  return (
    message.includes('Failed to find Server Action') ||
    message.includes('An unexpected response was received from the server')
  )
}

// Guard against reload loops: only auto-reload once per browser session so a
// genuinely broken deploy doesn't trap the user in an infinite refresh.
const RELOAD_GUARD_KEY = 'mietevo:server-action-reload'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (isStaleDeploymentError(error)) {
      let alreadyReloaded = false
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === '1'
      } catch {
        // sessionStorage can be unavailable (private mode, blocked); fall through.
      }

      if (!alreadyReloaded) {
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
        } catch {
          // Ignore storage failures; worst case we reload again next time.
        }
        setRecovering(true)
        window.location.reload()
        return
      }
    }

    posthog.captureException(error)
  }, [error])

  if (recovering) {
    return (
      <div>
        <h2>Aktualisiere die Seite …</h2>
        <p>Eine neue Version ist verfügbar. Die Seite wird neu geladen.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
