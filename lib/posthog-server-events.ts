import { logger } from '@/utils/logger'

interface CaptureServerEventInput {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com'

function normalizeHost(host: string) {
  return host.endsWith('/') ? host.slice(0, -1) : host
}

export async function captureServerEvent({
  distinctId,
  event,
  properties = {},
}: CaptureServerEventInput) {
  const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) {
    return
  }

  const host = normalizeHost(
    process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
  )

  const response = await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: distinctId,
      event,
      properties: {
        distinct_id: distinctId,
        ...properties,
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text()
    logger.error(
      `[PostHog] Failed to capture server event ${event}: ${response.status} ${details}`,
      new Error(`PostHog capture failed with status ${response.status}`),
    )
  }
}
