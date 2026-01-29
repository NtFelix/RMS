import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { logApiRoute } from "@/lib/logging-middleware"
import { capturePostHogEvent } from "@/lib/posthog-helpers"
import { ROUTES } from "@/lib/constants"

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


