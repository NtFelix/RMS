import { createClient } from "@/utils/supabase/client"
import { BASE_URL } from "./constants"
import { trackGoogleAuthInitiated, trackGoogleAuthFailed, AuthFlow } from "./posthog-auth-events"

/**
 * Initiates the Google OAuth sign-in flow.
 * 
 * @param flow - The authentication flow type ('login' or 'signup')
 * @returns An error object if the sign-in failed, or null if successful
 */
export async function handleGoogleSignIn(flow: AuthFlow): Promise<{ error: string | null }> {
    // Track Google auth initiation (GDPR-compliant - checks consent internally)
    trackGoogleAuthInitiated(flow)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${BASE_URL}/auth/callback`,
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
