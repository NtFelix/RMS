import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function updateSession(request: NextRequest, response: NextResponse): Promise<User | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, "", options)
        },
      },
    },
  )

  // getUser() validates the session and implicitly triggers a token refresh
  // via the cookie adapter above when the access token has expired.
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[updateSession] Failed to refresh session:', error.message)
  }

  return user
}
