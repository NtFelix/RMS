/**
 * Helpers for keeping local development noise out of PostHog.
 *
 * Next.js Fast Refresh / HMR frequently throws transient errors while a dev
 * session is mid-edit (e.g. `ReferenceError: <identifier> is not defined` for
 * identifiers that are actually imported). These are not real bugs and only
 * occur on a developer's machine, but they were being captured into production
 * error tracking, burying genuine issues in noise.
 *
 * We treat any event originating from a localhost-style host as local dev and
 * drop it before it leaves the browser.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0'])

/** Returns true when the given hostname looks like a local dev host. */
export function isLocalDevHostname(hostname: string | undefined | null): boolean {
  if (!hostname) return false
  const host = hostname.toLowerCase()
  if (LOCAL_HOSTNAMES.has(host)) return true
  // Cover *.localhost and *.local (e.g. myapp.localhost, foo.local)
  return host.endsWith('.localhost') || host.endsWith('.local')
}

/**
 * Returns true when we're running in a local development environment and should
 * not send events to PostHog. Combines the build-time NODE_ENV signal with a
 * runtime hostname check so it works whether or not env vars are set correctly.
 */
export function isLocalDevEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  if (typeof window !== 'undefined') {
    return isLocalDevHostname(window.location?.hostname)
  }
  return false
}
