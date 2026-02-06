import { PostHog } from 'posthog-node'

let posthogInstance = null

export function getPostHogServer() {
  if (!posthogInstance) {
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

    if (!apiKey) {
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        // Return a mock object for testing to avoid crashes
        return {
          capture: () => {},
          flush: async () => {},
          on: () => {},
          identify: () => {},
          alias: () => {},
        }
      }
      console.warn('[PostHog Server] No API key found. Events will not be captured.')
    }

    try {
      posthogInstance = new PostHog(apiKey || 'dummy-key', {
        host: apiHost,
        flushAt: 1,
        flushInterval: 0
      })

      // Add error handler
      posthogInstance.on('error', (err) => {
        console.error('[PostHog Server] Error:', err)
      })
    } catch (e) {
      console.error('[PostHog Server] Initialization failed:', e)
      // Fallback to dummy
      return {
        capture: () => {},
        flush: async () => {},
        on: () => {},
        identify: () => {},
        alias: () => {},
      }
    }
  }
  return posthogInstance
}
