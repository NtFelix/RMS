import { NextResponse, type NextRequest } from "next/server"

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
  "/checkout/success",
  "/hilfe/dokumentation",
]

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
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
  requestHeaders.set('Content-Security-Policy', csp)

  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
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
    "/hilfe/dokumentation/:path*",
    "/oauth/:path*",
  ],
}
