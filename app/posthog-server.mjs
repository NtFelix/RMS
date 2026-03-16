const dummyPostHog = {
  capture: async () => { },
  flush: async () => { },
  on: () => { },
  identify: async () => { },
  alias: async () => { },
  captureException: async () => { },
}

let posthogInstance = null

export function getPostHogServer() {
  if (!posthogInstance) {
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

    if (!apiKey) {
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        return dummyPostHog
      }
      console.warn('[PostHog Server] No API key found. Events will not be captured.')
      return dummyPostHog
    }

    // Lightweight fetch-based PostHog client to avoid huge posthog-node bundle size on Edge
    const sendEvent = async (event, properties = {}) => {
      try {
        // Send event payload using the API schema from PostHog
        fetch(`${apiHost}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            event,
            properties,
            timestamp: new Date().toISOString()
          }),
          // Dont await so we don't block the running context, handled implicitly
        }).catch(e => {
            console.error('[PostHog Server] fetch capture error:', e)
        });
      } catch (e) {
        console.error('[PostHog Server] capture error:', e)
      }
    }

    posthogInstance = {
      capture: async ({ distinctId, event, properties }) => sendEvent(event, { distinct_id: distinctId, ...properties }),
      flush: async () => { }, // No-op for fetch-based client
      on: () => { },
      identify: async ({ distinctId, properties }) => sendEvent('$identify', { distinct_id: distinctId, $set: properties }),
      alias: async () => { },
      captureException: async (error, distinctId) => sendEvent('exception', {
        distinct_id: distinctId || 'anonymous',
        error_message: error?.message || String(error)
      }),
    }
  }
  return posthogInstance
}
