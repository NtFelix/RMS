'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * CSPNonceSync is a small component that bridges the server-side generated CSP nonce
 * to client-side libraries that need it to inject sub-scripts (like PostHog).
 */
export function CSPNonceSync({ nonce }: { nonce: string | null | undefined }) {
    useEffect(() => {
        // Only attempt to sync if we have a nonce and PostHog is actually loaded
        if (nonce && typeof window !== 'undefined' && (window as any).posthog) {
            const ph = (window as any).posthog;

            if (ph.__loaded) {
                // If PostHog is already loaded, we don't want to call .init() again with a potentially 
                // missing token. Instead, we just ensure the nonce is updated in the config if supported.
                // PostHog's persistence and capture logic uses the internal config.
                if (ph.config) {
                    ph.config.nonce = nonce;
                    console.log('PostHog CSP nonce synchronized');
                }
            }
        }
    }, [nonce]);

    return null;
}
