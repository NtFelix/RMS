import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      async get(name: string) {
        return cookieStore.get(name)?.value;
      },
      async set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      async remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  })
}
