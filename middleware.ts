import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"
import posthogProxyConfig from "@/lib/posthog-proxy"
import { createServerClient } from "@supabase/ssr"

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
  "/organisation",
]

const ROUTE_PERMISSIONS: Record<string, string> = {
  "/betriebskosten": "betriebskosten",
  "/finanzen": "finanzen",
  "/haeuser": "haeuser",
  "/wohnungen": "wohnungen",
  "/mieter": "mieter",
  "/zaehler": "zaehler",
  "/todos": "aufgaben",
  "/dateien": "dokumente",
  "/vorlagen": "vorlagen",
  "/einstellungen": "organisation",
  "/organisation": "organisation",
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip PostHog proxy traffic entirely (no auth, no CSP, no redirects)
  if (pathname.startsWith(POSTHOG_PROXY_PATH)) {
    return NextResponse.next()
  }
  
  if (pathname === '/unauthorized') {
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
    `img-src 'self' data: ${process.env.NODE_ENV === 'development' ? "http://127.0.0.1:54321 http://localhost:54321" : ""} https://*.supabase.co https://*.stripe.com https://*.posthog.com`,
    `connect-src 'self' ${process.env.NODE_ENV === 'development' ? "http://127.0.0.1:54321 http://localhost:54321" : ""} https://*.supabase.co https://*.stripe.com https://api.stripe.com https://*.posthog.com https://backend.mietevo.de`,
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

    if (user) {
      const matchedPrefix = Object.keys(ROUTE_PERMISSIONS).find((prefix) =>
        matchesRoutePrefix(pathname, prefix)
      )

      if (matchedPrefix) {
        const modul = ROUTE_PERMISSIONS[matchedPrefix]
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll()
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  request.cookies.set(name, value)
                  response.cookies.set(name, value, options)
                })
              },
            },
          }
        )

        try {
          const { data: hasPerm, error: permError } = await supabase.rpc('check_permission', {
            p_modul: modul,
            p_aktion: 'ansehen',
          })

          if (permError || hasPerm !== true) {
            if (permError) {
              console.error(`[Middleware] Error checking permission for ${modul}:`, permError.message)
            }
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/unauthorized'
            const redirectResponse = NextResponse.redirect(redirectUrl)
            response.headers.forEach((value, key) => {
              redirectResponse.headers.append(key, value)
            })
            return redirectResponse
          }
        } catch (e) {
          console.error(`[Middleware] Exception checking permission for ${modul}:`, e)
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/unauthorized'
          const redirectResponse = NextResponse.redirect(redirectUrl)
          response.headers.forEach((value, key) => {
            redirectResponse.headers.append(key, value)
          })
          return redirectResponse
        }
      }
    }

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
  // We use getSetCookie() if available for better multiple-cookie support
  if (typeof response.headers.getSetCookie === 'function') {
    const cookies = response.headers.getSetCookie()
    cookies.forEach(cookie => {
      finalResponse.headers.append('set-cookie', cookie)
    })
  } else {
    // Fallback for older environments
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') {
        finalResponse.headers.append(key, value)
      }
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
    "/organisation",
    "/organisation/:path*",
  ],
}
