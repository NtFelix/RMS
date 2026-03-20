import { captureServerEvent } from '../lib/posthog-server-events'

const dummyPostHog = {
  capture: async () => {},
  flush: async () => {},
  on: () => {},
  identify: async () => {},
  alias: async () => {},
  captureException: async () => {},
}

let posthogInstance = null

function buildEdgeSafeClient() {
  return {
    capture: async ({ distinctId, event, properties = {} }) => {
      if (!distinctId || !event) {
        return
      }

      await captureServerEvent({
        distinctId,
        event,
        properties,
      })
    },
    flush: async () => {},
    on: () => {},
    identify: async (distinctId, properties = {}) => {
      if (!distinctId) {
        return
      }

      await captureServerEvent({
        distinctId,
        event: '$identify',
        properties: {
          $set: properties,
        },
      })
    },
    alias: async (alias, distinctId) => {
      if (!alias || !distinctId) {
        return
      }

      await captureServerEvent({
        distinctId,
        event: '$create_alias',
        properties: {
          alias,
        },
      })
    },
    captureException: async (error, distinctId = 'server-error') => {
      await captureServerEvent({
        distinctId,
        event: '$exception',
        properties: {
          $exception_message: error?.message || 'Unknown error',
          $exception_type: error?.name || 'Error',
        },
      })
    },
  }
}

export function getPostHogServer() {
  if (!posthogInstance) {
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY

    if (!apiKey) {
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        return dummyPostHog
      }
      console.warn('[PostHog Server] No API key found. Events will not be captured.')
    }

    posthogInstance = buildEdgeSafeClient()
  }

  return posthogInstance
}
