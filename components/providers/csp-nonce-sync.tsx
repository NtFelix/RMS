'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * CSPNonceSync is a small component that bridges the server-side generated CSP nonce
 * to client-side libraries that need it to inject sub-scripts (like PostHog).
 */
export function CSPNonceSync({ nonce }: { nonce: string | null | undefined }) {
    useEffect(() => {
        if (nonce && posthog.__loaded) {
            // Re-initialize or update PostHog with the server-side nonce
            // This ensures that when PostHog injects its session recording or heatmaps
            // they use the correct nonce to avoid being blocked by CSP.
            const config = posthog.config;
            if (config) {
                posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
                    ...config,
                    nonce: nonce,
                } as any);
            }
        }
    }, [nonce]);

    return null;
}
