import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  // Return PostHog configuration from server-side environment variables
  // Use the exact names from Cloudflare: POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_ENV_ID
  const config = {
    key: process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    envId: process.env.POSTHOG_ENV_ID
  }

  // Only return config if we have a valid key
  if (!config.key || config.key === 'phc_placeholder_key') {
    return NextResponse.json({ error: 'PostHog not configured' }, { status: 404 })
  }

  return NextResponse.json(config)
}