export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { getPostHogServer } from "../../posthog-server.mjs"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
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

        // Flush the queue to ensure the event is sent
        await posthog.shutdownAsync()
      } catch (error) {
        console.error('Error tracking login in PostHog:', error)
        // Don't fail the auth flow if PostHog tracking fails
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
}
