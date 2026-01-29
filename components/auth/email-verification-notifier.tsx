"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

// Channel name for cross-tab communication
const VERIFICATION_CHANNEL = 'mietevo_email_verified'

/**
 * Component that handles cross-tab communication for email verification.
 * When a user verifies their email via the callback in another tab,
 * this component broadcasts a message that the verify-email page listens for.
 */
export function EmailVerificationNotifier() {
    const searchParams = useSearchParams()

    useEffect(() => {
        // Check if this page load came from a successful auth callback
        const loginSuccess = searchParams.get('login_success')

        if (loginSuccess === 'true') {
            // Use BroadcastChannel for cross-tab communication
            try {
                const channel = new BroadcastChannel(VERIFICATION_CHANNEL)
                channel.postMessage({ verified: true })
                channel.close()
            } catch {
                // Fallback to localStorage for browsers that don't support BroadcastChannel
                localStorage.setItem(VERIFICATION_CHANNEL, Date.now().toString())
            }
        }
    }, [searchParams])

    return null
}
