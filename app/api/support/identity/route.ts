import { NextResponse } from 'next/server'
import { requireAuthenticatedUserForApi } from '@/lib/server/route-access'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'

export const runtime = 'edge'

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function GET() {
  const authResult = await requireAuthenticatedUserForApi()

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const supportSecret = process.env.POSTHOG_SUPPORT_SECRET

  if (!supportSecret) {
    return NextResponse.json(
      { error: 'Support identity is not configured' },
      { status: 503, headers: NO_CACHE_HEADERS },
    )
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(supportSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(user.id))

  return NextResponse.json(
    {
      distinctId: user.id,
      hash: bufferToHex(signature),
    },
    { headers: NO_CACHE_HEADERS },
  )
}

