import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

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
  if (pathname.startsWith('/assets/v2')) {
    return NextResponse.next()
  }
  const needsManagedHeaders = MANAGED_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix),
  )
  const nonce = needsManagedHeaders ? crypto.randomUUID() : null

  // Content Security Policy
  // Note: We use 'unsafe-inline' without a nonce for scripts because Next.js 
  // root-level hydration scripts don't support nonces in a static-root architecture.
  // This is the standard way to support Next.js on Cloudflare Pages without breaking hydration.
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

  // Clone request headers so layouts and server components can read request context
  const requestHeaders = new Headers(request.headers)
  if (nonce) {
    requestHeaders.set('x-nonce', nonce)
  }
  if (needsManagedHeaders) {
    requestHeaders.set('x-current-pathname', pathname)
    requestHeaders.set('x-current-search', request.nextUrl.search)
  }
  // Pre-emptively clear any potentially spoofed user data headers from external client requests
  requestHeaders.delete('x-user-data')
  requestHeaders.delete('x-user-signature')

  // Set CSP on request headers so Server Components can read it (e.g., for nonces)
  requestHeaders.set('Content-Security-Policy', csp)

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

        requestHeaders.set('x-user-data', btoa(encodeURIComponent(userData)))
        requestHeaders.set('x-user-signature', signature)
      } else {
        // Fallback to unsigned if secret is missing (only for development/testing safety)
        requestHeaders.set('x-user-data', btoa(encodeURIComponent(userData)))
      }
    }
  }

  // Re-initialize final response with the mutated requestHeaders payload
  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Transfer all accrued cookie mutations into the final response
  // We strictly only transfer Set-Cookie to prevent header duplication issues
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      finalResponse.headers.append(key, value)
    }
  }
  response = finalResponse

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // Set CSP on response headers so the browser enforces it
  response.headers.set('Content-Security-Policy', csp);

  return response
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/dashboard/:path*",
    "/betriebskosten/:path*",
    "/finanzen/:path*",
    "/haeuser/:path*",
    "/wohnungen/:path*",
    "/mieter/:path*",
    "/todos/:path*",
    "/mails/:path*",
    "/dateien/:path*",
    "/checkout/success",
    "/oauth/:path*",
  ],
}
