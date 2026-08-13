import { createClient } from "@/utils/supabase/client"
import { BASE_URL } from "./constants"
import { appendSafeAuthRedirect } from "./auth-redirects"
import { trackGoogleAuthInitiated, trackGoogleAuthFailed, trackSocialAuthInitiated, trackSocialAuthFailed, AuthFlow } from "./posthog-auth-events"

/**
 * Initiates the Google OAuth sign-in flow.
 * 
 * @param flow - The authentication flow type ('login' or 'signup')
 * @param redirect - Optional same-origin path to restore after provider authentication
 * @returns An error object if the sign-in failed, or null if successful
 */
export async function handleGoogleSignIn(flow: AuthFlow, redirect?: string | null): Promise<{ error: string | null }> {
    // Track Google auth initiation (GDPR-compliant - checks consent internally)
    trackGoogleAuthInitiated(flow)

    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : BASE_URL
    const callbackUrl = new URL('/auth/callback', origin)
    callbackUrl.searchParams.set('origin', origin)
    appendSafeAuthRedirect(callbackUrl, redirect)

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: callbackUrl.toString(),
            queryParams: {
                access_type: 'offline',
            },
        },
    })

    if (error) {
        // Track the failure (GDPR-compliant)
        trackGoogleAuthFailed(flow, 'oauth_error', error.message)
        return { error: error.message }
    }

    return { error: null }
}

/**
 * Initiates the Microsoft (Azure AD) OAuth sign-in flow.
 * 
 * @param flow - The authentication flow type ('login' or 'signup')
 * @param redirect - Optional same-origin path to restore after provider authentication
 * @returns An error object if the sign-in failed, or null if successful
 */
export async function handleMicrosoftSignIn(flow: AuthFlow, redirect?: string | null): Promise<{ error: string | null }> {
    // Track Microsoft auth initiation (GDPR-compliant - checks consent internally)
    trackSocialAuthInitiated('microsoft', flow)

    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : BASE_URL
    const callbackUrl = new URL('/auth/callback', origin)
    callbackUrl.searchParams.set('origin', origin)
    appendSafeAuthRedirect(callbackUrl, redirect)

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
            redirectTo: callbackUrl.toString(),
            scopes: 'email profile openid',
        },
    })

    if (error) {
        // Track the failure (GDPR-compliant)
        trackSocialAuthFailed('microsoft', flow, 'oauth_error', error.message)
        return { error: error.message }
    }

    return { error: null }
}
