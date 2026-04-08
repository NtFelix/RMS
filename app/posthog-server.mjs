import { PostHog } from 'posthog-node'
import resolvePostHogHost from '../lib/posthog-host.js'

const dummyPostHog = {
  capture: async () => { },
  flush: async () => { },
  on: () => { },
  identify: async () => { },
  alias: async () => { },
  captureException: async () => { },
}

let posthogInstance = null

function resolvePostHogProjectApiKey() {
  const projectApiKey = process.env.POSTHOG_API_KEY

  if (projectApiKey?.startsWith('phx_')) {
    console.warn('[PostHog Server] POSTHOG_API_KEY looks like a personal API key. Falling back to NEXT_PUBLIC_POSTHOG_KEY project token.')
    return process.env.NEXT_PUBLIC_POSTHOG_KEY
  }

  return projectApiKey || process.env.NEXT_PUBLIC_POSTHOG_KEY
}

export function getPostHogServer() {
  if (!posthogInstance) {
    const apiKey = resolvePostHogProjectApiKey()
    const apiHost = resolvePostHogHost()

    if (!apiKey) {
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        // Return a mock object for testing to avoid crashes
        return dummyPostHog
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
      return dummyPostHog
    }
  }
  return posthogInstance
}
