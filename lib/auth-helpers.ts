import { createClient } from "@/utils/supabase/client"
import { BASE_URL } from "./constants"
import posthog from 'posthog-js'

/**
 * Initiates the Google OAuth sign-in flow.
 * 
 * @param eventName - The name of the PostHog event to track ('login_attempt' or 'signup_attempt')
 * @returns An error object if the sign-in failed, or null if successful
 */
export async function handleGoogleSignIn(eventName: 'login_attempt' | 'signup_attempt'): Promise<{ error: string | null }> {
    // GDPR: Only track if user has consented
    if (posthog.has_opted_in_capturing?.()) {
        posthog.capture(eventName, {
            provider: 'google',
        })
    }

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
        return { error: error.message }
    }

    return { error: null }
}
