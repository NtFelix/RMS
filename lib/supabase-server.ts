import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv, UUID_REGEX } from '@/lib/supabase-env'

export async function createSupabaseServerClient(orgIdOverride?: string) {
  const cookieStore = await cookies()
  const rawOrgId = orgIdOverride ?? cookieStore.get('current_organisation_id')?.value
  const currentOrgId = (rawOrgId && UUID_REGEX.test(rawOrgId)) ? rawOrgId : null

  const globalHeaders: Record<string, string> = {}
  if (currentOrgId) {
    globalHeaders['Cookie'] = `current_organisation_id=${encodeURIComponent(currentOrgId)}`
  } else if (rawOrgId && rawOrgId !== 'private' && rawOrgId !== 'null' && process.env.NODE_ENV === 'development') {
    console.warn('[Supabase Server] Invalid current_organisation_id format (expected UUID):', rawOrgId)
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
