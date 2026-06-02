import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { logApiRoute } from "@/lib/logging-middleware"
import { capturePostHogEvent } from "@/lib/posthog-helpers"
import { ROUTES, BASE_URL } from "@/lib/constants"

export const runtime = 'edge'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  
  // Resolve origin robustly supporting:
  // 1. Client-passed query parameter (highest priority, dynamically computed on browser side)
  // 2. Proxies/headers (x-forwarded-host)
  // 3. Request URL fallback
  const clientOrigin = requestUrl.searchParams.get("origin")
  let origin = ""

  if (clientOrigin) {
    try {
      const parsedOrigin = new URL(clientOrigin)
      const hostname = parsedOrigin.hostname
      
      // Security evaluation: By validating against the active request hostname,
      // we securely permit preview environments (e.g. Vercel, Railway, Render)
      // without opening a redirect vulnerability to generic attacker subdomains.
      const isValid = 
        hostname === requestUrl.hostname ||
        hostname === 'mietevo.de' ||
        hostname.endsWith('.mietevo.de') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0'

      if (isValid) {
        origin = parsedOrigin.origin
      }
    } catch {
      // Invalid URL format in search param, ignore and fallback
    }
  }

  if (!origin) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const hostHeader = request.headers.get("host")
    const forwardedProto = request.headers.get("x-forwarded-proto") || (requestUrl.protocol === 'https:' ? 'https' : 'http')
    
    origin = requestUrl.origin
    
    // Helper to safely extract the first host in case of comma-separated proxy headers
    const getFirstHost = (headerValue: string | null) => {
      if (!headerValue) return null
      return headerValue.split(",")[0].trim()
    }

    const activeHost = getFirstHost(forwardedHost) || getFirstHost(hostHeader)
    if (activeHost) {
      origin = `${forwardedProto}://${activeHost}`
    }
  }

  // Handle local meta-address resolving (0.0.0.0 / 127.0.0.1) in docker or dev environments using proper URL parsing
  try {
    const originUrl = new URL(origin)
    const hostname = originUrl.hostname
    
    if (hostname === '0.0.0.0' || hostname === '127.0.0.1') {
      let baseHasLocal = false
      if (BASE_URL) {
        try {
          const baseUrlParsed = new URL(BASE_URL)
          const baseHostname = baseUrlParsed.hostname
          if (baseHostname === '0.0.0.0' || baseHostname === '127.0.0.1' || baseHostname === 'localhost') {
            baseHasLocal = true
          }
        } catch {
          baseHasLocal = true
        }
      }

      if (BASE_URL && !baseHasLocal) {
        origin = BASE_URL
      } else {
        originUrl.hostname = 'localhost'
        origin = originUrl.origin
      }
    }
  } catch {
    // URL parsing failed, leave origin as is
  }

  // Securely enforce HTTPS protocol for public domains using proper URL parsing
  try {
    const originUrl = new URL(origin)
    const hostname = originUrl.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
    
    if (!isLocal && originUrl.protocol === 'http:') {
      originUrl.protocol = 'https:'
      origin = originUrl.origin
    }
  } catch {
    // URL parsing failed, leave origin as is
  }

  if (!code) {
    logApiRoute('/auth/callback', 'GET', 'error', {
      error_message: 'No auth code found in callback URL'
    })
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logApiRoute('/auth/callback', 'GET', 'error', {
        error_message: error.message,
        error_type: 'auth_exchange_failed'
      })
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }

    // Log successful authentication
    const provider = data?.user?.app_metadata?.provider || 'email'
    const isNewUser = data?.user?.created_at === data?.user?.last_sign_in_at

    logApiRoute('/auth/callback', 'GET', 'response', {
      user_id: data?.user?.id,
      provider,
      is_new_user: isNewUser,
      event: 'auth_callback_success'
    })

    // Track the successful OAuth completion in PostHog (server-side)
    // Uses the unified 'auth' event schema with action, status, method properties
    if (data?.user?.id) {
      await capturePostHogEvent(data.user.id, 'auth', {
        action: isNewUser ? 'signup' : 'login',
        status: 'success',
        method: provider,
        is_new_user: isNewUser,
      })
    }

    // Successful authentication, redirect to dashboard
    const redirectUrl = new URL(origin)
    if (data?.user) {
      // Pass user info as URL params for client-side PostHog tracking
      redirectUrl.searchParams.set('login_success', 'true')
      redirectUrl.searchParams.set('provider', provider)
      redirectUrl.searchParams.set('is_new_user', String(isNewUser))
      // All users go to dashboard after authentication
      redirectUrl.pathname = ROUTES.HOME
    }

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logApiRoute('/auth/callback', 'GET', 'error', {
      error_message: errorMessage,
      error_type: 'unexpected_error'
    })
    return NextResponse.redirect(`${origin}/auth/login?error=unexpected_error`)
  }
}


