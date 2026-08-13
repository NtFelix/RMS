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
          } catch (error: any) {
            // In Next.js 15, cookies().set() throws if called during Server Component rendering.
            // This is expected. However, we log other types of errors to aid debugging.
            const isReadOnlyError = error?.message?.includes('readonly') || error?.digest?.includes('NEXT_REDIRECT');
            
            if (!isReadOnlyError && process.env.NODE_ENV === 'development') {
              console.warn('[Supabase Server] setAll encountered an unexpected error:', error.message);
            }
          }
        },
      }
    }
  )
}
