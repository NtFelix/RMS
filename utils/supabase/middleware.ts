import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function updateSession(request: NextRequest, response: NextResponse): Promise<User | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, {
              ...options,
              sameSite: "lax",
            })
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

  // getUser() validates the session and implicitly triggers a token refresh
  // via the cookie adapter above when the access token has expired.
  // We use a try-catch to avoid crashing the middleware on malformed sessions,
  // but we still log the error for debugging.
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error && !error.message.includes('Auth session missing')) {
      console.error('[updateSession] Error refreshing session:', error.message)
    }
    return user
  } catch (e) {
    console.error('[updateSession] Unexpected error in getUser():', e)
    return null
  }
}
