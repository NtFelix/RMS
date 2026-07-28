import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabasePublicEnv } from "@/lib/supabase-env"

export async function createClient(orgIdOverride?: string) {
  const cookieStore = await cookies()
  const currentOrgId = orgIdOverride || cookieStore.get('current_organisation_id')?.value

  const globalHeaders: Record<string, string> = {}
  if (currentOrgId) {
    globalHeaders['Cookie'] = `current_organisation_id=${currentOrgId}`
  }

  const { url, anonKey } = getSupabasePublicEnv()

  return createServerClient(url, anonKey, {
    global: {
      headers: globalHeaders
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
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
