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
          try {
            const cookieStore = await cookies()
            const cookie = cookieStore.get(name)
            return cookie?.value
          } catch (error) {
            // Handle case when cookies() is called outside request scope (e.g., during static generation)
            console.warn('Cookies not available outside request scope:', error)
            return undefined
          }
        },
        set(name, value, options: CookieOptions) {
          try {
            // Server components können keine Cookies setzen
            // This is intentionally empty for server components
          } catch (error) {
            console.warn('Cannot set cookies in server component:', error)
          }
        },
        remove(name, options: CookieOptions) {
          try {
            // Server components können keine Cookies entfernen
            // This is intentionally empty for server components
          } catch (error) {
            console.warn('Cannot remove cookies in server component:', error)
          }
        }
      }
    }
  )
}
