'use client'
import { useEffect } from 'react'
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
// genuinely broken deploy doesn't trap the user in an infinite refresh. Reads and
// marks the guard in one shot; returns true only when a reload should happen now.
const RELOAD_GUARD_KEY = 'mietevo:server-action-reload'

function shouldAutoReload(error: Error): boolean {
  if (!isStaleDeploymentError(error)) {
    return false
  }
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') {
      return false
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
  } catch {
    // sessionStorage can be unavailable (private mode, blocked). Fall through and
    // still attempt the one-shot reload; the worst case is one extra refresh.
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
    if (shouldAutoReload(error)) {
      window.location.reload()
      return
    }

    posthog.captureException(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
