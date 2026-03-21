import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  // Return PostHog configuration for the browser without leaking server-only host.
  // Use the exact names from Cloudflare: POSTHOG_API_KEY, POSTHOG_ENV_ID
  const config = {
    key: process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/assets/v2',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com',
    envId: process.env.POSTHOG_ENV_ID
  }

  // Only return config if we have a valid key
  if (!config.key || config.key === 'phc_placeholder_key') {
    return NextResponse.json({ error: 'PostHog not configured' }, { status: 404 })
  }

  return NextResponse.json(config)
}
