import { headers } from "next/headers"
import { unstable_rethrow } from "next/navigation"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import { redirectAuthenticatedAuthRoute } from "@/lib/server/route-access"

// Request-time reads (headers, cookies, Supabase session) must live below a
// Suspense boundary so that app/auth/layout.tsx can stay a static shell that
// prerenders. The redirect for already-authenticated users therefore happens as
// a streamed redirect after the static shell, not before it.

export async function AuthRequestGate() {
  const requestHeaders = await headers()

  try {
    await redirectAuthenticatedAuthRoute(requestHeaders)
  } catch (error) {
    // Redirects must propagate. Any other failure (e.g. Supabase unreachable) must not replace
    // the auth page with an error screen: the gate is only a convenience for signed-in users.
    unstable_rethrow(error)
    console.error("[AuthRequestGate] Session check failed, rendering auth page:", error)
  }

  return <CSPNonceSync nonce={requestHeaders.get("x-nonce")} />
}
