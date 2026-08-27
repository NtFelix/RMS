import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from '@/lib/supabase-env'

export async function createSupabaseServerClient(orgIdOverride?: string) {
  const cookieStore = await cookies()
  const currentOrgId = orgIdOverride || cookieStore.get('current_organisation_id')?.value

  const globalHeaders: Record<string, string> = {}
  if (currentOrgId) {
    globalHeaders['Cookie'] = `current_organisation_id=${currentOrgId}`
  }

  const { url, anonKey } = getSupabasePublicEnv()

  return createServerClient(url, anonKey, {
    global: {
      headers: globalHeaders,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch (error: unknown) {
          // In Next.js, cookies().set() throws if called during Server Component rendering.
          // This is expected when middleware refreshes user sessions. However, we log
          // other types of errors to aid debugging.
          const err = error as { message?: string; digest?: string } | undefined
          const isReadOnlyError =
            err?.message?.includes('readonly') || err?.digest?.includes('NEXT_REDIRECT')

          if (!isReadOnlyError && process.env.NODE_ENV === 'development') {
            console.warn('[Supabase Server] setAll encountered an unexpected error:', err?.message ?? String(error))
          }
        }
      },
    },
  })
}
