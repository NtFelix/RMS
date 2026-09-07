import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { getSupabasePublicEnv, getOrgCookieHeader } from "@/lib/supabase-env"

export type SessionUser = Pick<User, 'id' | 'email' | 'role' | 'app_metadata' | 'user_metadata' | 'aud'>

export async function updateSession(request: NextRequest, response: NextResponse): Promise<SessionUser | null> {
  const rawOrgId = request.cookies.get('current_organisation_id')?.value
  const globalHeaders = getOrgCookieHeader(rawOrgId, 'updateSession')

  const { url, anonKey } = getSupabasePublicEnv()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      global: {
        headers: globalHeaders
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
          
          // Force update the Cookie header for downstream Server Actions/Components
          // in the current request lifecycle.
          const allCookies = request.cookies.getAll()
          const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
          request.headers.set('cookie', cookieString)
        },
      },
    },
  )

  // getClaims() verifies the JWT locally against cached JWKS (asymmetric keys)
  // instead of a per-request roundtrip to the auth server — the official Supabase
  // recommendation for Next.js. For HS256/legacy JWT secrets it transparently falls
  // back to a network getUser(). __loadSession() still triggers token refresh via
  // the cookie adapter above when the access token has expired.
  // We use a try-catch to avoid crashing the middleware on malformed sessions,
  // but we still log the error for debugging.
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (error && !error.message.includes('Auth session missing')) {
      console.error('[updateSession] Error refreshing session:', error.message)
    }
    if (!data?.claims?.sub) {
      return null
    }
    // Map JWT claims to SessionUser interface for downstream consumers (proxy.ts and route-access.ts)
    const claims = data.claims
    const audString = typeof claims.aud === 'string'
      ? claims.aud
      : Array.isArray(claims.aud)
        ? (claims.aud[0] ?? '')
        : ''

    return {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
      aud: audString,
      app_metadata: (claims.app_metadata as Record<string, unknown>) ?? {},
      user_metadata: (claims.user_metadata as Record<string, unknown>) ?? {},
    }
  } catch (e) {
    console.error('[updateSession] Unexpected error in getClaims():', e)
    return null
  }
}
