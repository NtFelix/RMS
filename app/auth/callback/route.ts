import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { logApiRoute } from "@/lib/logging-middleware"
import { capturePostHogEvent } from "@/lib/posthog-helpers"

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
    if (data?.user?.id) {
      // Determine if this was a login or signup based on whether user is new
      const eventName = isNewUser
        ? 'auth_google_signup_complete'
        : 'auth_google_login_complete'

      await capturePostHogEvent(data.user.id, eventName, {
        provider,
        is_new_user: isNewUser,
        auth_method: 'oauth',
      })

      // Also track the general auth success event
      await capturePostHogEvent(data.user.id, 'auth_oauth_success', {
        provider,
        is_new_user: isNewUser,
      })
    }

    // Successful authentication, redirect to subscription onboarding with tracking info
    const redirectUrl = new URL(origin)
    if (data?.user) {
      // Pass user info as URL params for client-side PostHog tracking
      redirectUrl.searchParams.set('login_success', 'true')
      redirectUrl.searchParams.set('provider', provider)
      redirectUrl.searchParams.set('is_new_user', String(isNewUser))
      // Redirect to subscription onboarding
      redirectUrl.pathname = '/onboarding/subscription'
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


