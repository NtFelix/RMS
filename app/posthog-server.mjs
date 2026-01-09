import { PostHog } from 'posthog-node'

let posthogInstance = null

export function getPostHogServer() {
  if (!posthogInstance) {
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

    if (!apiKey) {
      console.warn('[PostHog Server] No API key found. Events will not be captured.')
    }

    posthogInstance = new PostHog(apiKey, {
      host: apiHost,
      flushAt: 1,
      flushInterval: 0
    })

    // Add error handler
    posthogInstance.on('error', (err) => {
      console.error('[PostHog Server] Error:', err)
    })
  }
  return posthogInstance
}
