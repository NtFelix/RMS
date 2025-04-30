import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type CookieOptions } from '@supabase/ssr'

export function createSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options: CookieOptions) {
          // Server components können keine Cookies setzen
        },
        remove(name, options: CookieOptions) {
          // Server components können keine Cookies entfernen
        }
      }
    }
  )
}
