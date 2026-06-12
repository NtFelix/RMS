import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const globalHeaders: Record<string, string> = {}
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )current_organisation_id=([^;]*)/)
    const currentOrgId = match ? match[1] : null
    if (currentOrgId) {
      globalHeaders['Cookie'] = `current_organisation_id=${currentOrgId}`
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: globalHeaders
      }
    }
  )
}
