import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type CookieOptions } from '@supabase/ssr'

export function createSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies()
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Only log if it's NOT the expected error when setting cookies in a Server Component
            if (process.env.NODE_ENV === 'development') {
              console.debug('[Supabase Server] setAll called from Server Component/Action:', error);
            }
          }
        },
      }
    }
  )
}
