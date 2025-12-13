import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { logApiRoute } from "@/lib/logging-middleware"

export const runtime = 'edge'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!code) {
    logApiRoute('/auth/callback', 'GET', 'error', {
      error_message: 'No auth code found in callback URL'
    })
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`)
  }

  try {
    const supabase = await createSupabaseServerClient()
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
    logApiRoute('/auth/callback', 'GET', 'response', {
      user_id: data?.user?.id,
      provider,
      event: 'auth_callback_success'
    })

    // Successful authentication, redirect to home with user info for client-side PostHog tracking
    const redirectUrl = new URL(origin)
    if (data?.user) {
      // Pass user info as URL params for client-side PostHog tracking
      redirectUrl.searchParams.set('login_success', 'true')
      redirectUrl.searchParams.set('provider', provider)
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

