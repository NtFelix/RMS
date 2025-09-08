import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export const runtime = 'edge'

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
    
    // Successful authentication, redirect to home with user info for client-side PostHog tracking
    const redirectUrl = new URL(origin)
    if (data?.user) {
      // Pass user info as URL params for client-side PostHog tracking
      redirectUrl.searchParams.set('login_success', 'true')
      redirectUrl.searchParams.set('provider', data.user.app_metadata?.provider || 'email')
    }
    
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Unexpected error during authentication:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=unexpected_error`)
  }
}
