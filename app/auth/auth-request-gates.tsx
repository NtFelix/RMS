import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import { redirectAuthenticatedAuthRoute } from "@/lib/server/route-access"

// Request-time reads (headers, cookies, Supabase session) must live below a
// Suspense boundary so that app/auth/layout.tsx can stay a static shell that
// prerenders. The redirect for already-authenticated users therefore happens as
// a streamed redirect after the static shell, not before it.

export async function AuthRedirectGate() {
  await redirectAuthenticatedAuthRoute()
  return null
}

export async function AuthNonceSync() {
  const nonce = (await headers()).get("x-nonce")
  return <CSPNonceSync nonce={nonce} />
}
