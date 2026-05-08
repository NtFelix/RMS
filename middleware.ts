import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"
import posthogProxyConfig from "@/lib/posthog-proxy"

const { POSTHOG_PROXY_PATH } = posthogProxyConfig

const MANAGED_ROUTE_PREFIXES = [
  "/auth",
  "/dashboard",
  "/betriebskosten",
  "/finanzen",
  "/haeuser",
  "/wohnungen",
  "/mieter",
  "/todos",
  "/mails",
  "/dateien",
  "/oauth",
  "/checkout/success",
]

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip PostHog proxy traffic entirely (no auth, no CSP, no redirects)
  if (pathname.startsWith(POSTHOG_PROXY_PATH)) {
    return NextResponse.next()
  }
  const needsManagedHeaders = MANAGED_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix),
  )
  const nonce = needsManagedHeaders ? crypto.randomUUID() : null

  // Content Security Policy
  const scriptSrc = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.stripe.com https://*.posthog.com`

  const csp = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.posthog.com`,
    "img-src 'self' data: https://*.supabase.co https://*.stripe.com https://*.posthog.com",
    "connect-src 'self' https://*.supabase.co https://*.stripe.com https://api.stripe.com https://*.posthog.com https://backend.mietevo.de",
    "font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai",
    "frame-src 'self' https://*.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');

  // Update request headers directly so they are passed downstream
  if (nonce) {
    request.headers.set('x-nonce', nonce)
  }
  if (needsManagedHeaders) {
    request.headers.set('x-current-pathname', pathname)
    request.headers.set('x-current-search', request.nextUrl.search)
  }
  
  // Pre-emptively clear any potentially spoofed user data headers from external client requests
  request.headers.delete('x-user-data')
  request.headers.delete('x-user-signature')

  // Set CSP on request headers so Server Components can read it (e.g., for nonces)
  request.headers.set('Content-Security-Policy', csp)

  // Initialize empty response to collect cookie mutations from updateSession
  let response = NextResponse.next()

  // Ensure Supabase session cookies are refreshed for prolonged client-side idling
  // Only execute logic for non-auth paths to avoid token churn on login flows
  if (!matchesRoutePrefix(pathname, '/auth') && !matchesRoutePrefix(pathname, '/oauth')) {
    const user = await updateSession(request, response)

    if (user && needsManagedHeaders) {
      // Serialize and forward verified local user metadata to save downstream roundtrips.
      // We sign this data with a secret to prevent spoofing if middleware is bypassed.
      const userData = JSON.stringify(user)
      const secret = process.env.USER_HEADER_SECRET

      if (secret) {
        // Use standard Web Crypto API (available in Cloudflare Edge) for HMAC
        const encoder = new TextEncoder()
        const keyData = encoder.encode(secret)
        const msgData = encoder.encode(userData)

        // This is async in Web Crypto, but middleware allows awaiting
        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, msgData)
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        request.headers.set('x-user-data', btoa(encodeURIComponent(userData)))
        request.headers.set('x-user-signature', signature)
      } else {
        // Fallback to unsigned if secret is missing (only for development/testing safety)
        request.headers.set('x-user-data', btoa(encodeURIComponent(userData)))
      }
    }
  }

  // Create final response from modified request
  const finalResponse = NextResponse.next({
    request,
  })

  // Transfer all accrued cookie mutations into the final response
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      finalResponse.headers.append(key, value)
    }
  }

  // Add security headers to the response sent to the browser
  finalResponse.headers.set('X-Frame-Options', 'DENY')
  finalResponse.headers.set('X-Content-Type-Options', 'nosniff')
  finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  finalResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  finalResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // Set CSP on response headers so the browser enforces it
  finalResponse.headers.set('Content-Security-Policy', csp);

  return finalResponse
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/betriebskosten",
    "/betriebskosten/:path*",
    "/finanzen",
    "/finanzen/:path*",
    "/haeuser",
    "/haeuser/:path*",
    "/wohnungen",
    "/wohnungen/:path*",
    "/mieter",
    "/mieter/:path*",
    "/todos",
    "/todos/:path*",
    "/mails",
    "/mails/:path*",
    "/dateien",
    "/dateien/:path*",
    "/checkout/success",
    "/oauth/:path*",
  ],
}
