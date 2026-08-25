import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { getSupabasePublicEnv } from "@/lib/supabase-env"

export async function updateSession(request: NextRequest, response: NextResponse): Promise<User | null> {
  const currentOrgId = request.cookies.get('current_organisation_id')?.value
  const globalHeaders: Record<string, string> = {}
  if (currentOrgId) {
    globalHeaders['Cookie'] = `current_organisation_id=${currentOrgId}`
  }

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
    // Shim: JWT claims carry sub/email/role/user_metadata/app_metadata — everything
    // proxy.ts (user.id, x-user-data serialization) and route-access.ts (parses
    // x-user-data as User, asserts only .id) consume downstream.
    return { ...data.claims, id: data.claims.sub } as unknown as User
  } catch (e) {
    console.error('[updateSession] Unexpected error in getClaims():', e)
    return null
  }
}
