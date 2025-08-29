export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { getPostHogServer } from "../../posthog-server.mjs"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!code) {
    console.error('No auth code found in callback URL')
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error.message)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }
    
    // If we have a user, identify them in PostHog server-side
    if (data?.user) {
      const posthog = getPostHogServer()
      
      try {
        // Track the login event and set user properties in a single call
        posthog.capture({
          distinctId: data.user.id,
          event: 'user_logged_in',
          properties: {
            provider: data.user.app_metadata?.provider || 'email',
            $set: {
              email: data.user.email,
              name: data.user.user_metadata?.name || '',
              last_sign_in: new Date().toISOString(),
            },
          },
        });

        // Flush the queue to ensure the event is sent without shutting down the client
        await posthog.flush()
      } catch (error) {
        console.error('Error tracking login in PostHog:', error)
        // Don't fail the auth flow if PostHog tracking fails
      }
    }

    // Successful authentication, redirect to home
    return NextResponse.redirect(origin)
  } catch (error) {
    console.error('Unexpected error during authentication:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=unexpected_error`)
  }
}
