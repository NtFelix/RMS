import { NextResponse } from 'next/server'
import posthogProxyConfig from '@/lib/posthog-proxy'

export const runtime = 'edge'

const { POSTHOG_PROXY_PATH, POSTHOG_UI_HOST } = posthogProxyConfig

export async function GET() {
  // Return PostHog configuration for the browser without leaking server-only keys.
  // The browser SDK must use the public project token, not any server-side credential.
  const config = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_PROXY_PATH,
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || POSTHOG_UI_HOST,
    envId: process.env.POSTHOG_ENV_ID
  }

  // Only return config if we have a valid key
  if (!config.key || config.key === 'phc_placeholder_key') {
    return NextResponse.json({ error: 'PostHog not configured' }, { status: 404 })
  }

  return NextResponse.json(config)
}
