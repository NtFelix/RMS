'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POSTHOG_FEATURE_FLAGS, ROUTES } from '@/lib/constants';

interface PreviewLimitNoticeBannerProps {
    /**
     * Callback when user clicks "Get Started" and is signed in without active subscription.
     * This should trigger the free plan checkout flow.
     */
    onGetStarted?: () => void;
    /**
     * Whether the user is currently signed in.
     */
    isSignedIn?: boolean;
    /**
     * Server-side evaluated feature flag value.
     * When provided, this bypasses client-side PostHog evaluation,
     * ensuring the banner is visible even with adblockers.
     * 
     * - true: Show the banner (server confirmed flag is enabled)
     * - false: Hide the banner (server confirmed flag is disabled)
     * - undefined: Fall back to client-side PostHog evaluation
     */
    showBannerSSR?: boolean;
}

/**
 * Banner component that displays a preview phase notice.
 * Shows when the 'pricing-page-preview-limit-notice' feature flag is enabled.
 * Informs users that the free plan includes up to 25 apartments during the preview phase.
 * 
 * Supports two modes:
 * 1. **Server-Side (recommended)**: Pass `showBannerSSR` prop from server component
 *    to ensure visibility even with adblockers
 * 2. **Client-Side (fallback)**: Uses PostHog client SDK when `showBannerSSR` is undefined
 * 
 * When clicked:
 * - If user is signed in: calls onGetStarted to trigger free plan checkout
 * - If user is not signed in: redirects to register page
 */
export function PreviewLimitNoticeBanner({
    onGetStarted,
    isSignedIn = false,
    showBannerSSR,
}: PreviewLimitNoticeBannerProps) {
    const [isMounted, setIsMounted] = useState(false);
    // Only use client-side feature flag when SSR value is not provided
    const clientSideFlag = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.PRICING_PAGE_PREVIEW_LIMIT_NOTICE);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Determine if banner should be shown based on SSR or client-side flag
    const shouldShowBanner = showBannerSSR !== undefined
        ? showBannerSSR
        : (isMounted && clientSideFlag);

    // When using SSR mode, we don't need to wait for mount
    // When using client-side mode, we need to wait for mount and flag evaluation
    if (!shouldShowBanner) {
        return null;
    }

    // For client-side mode, wait for mount to prevent hydration mismatch
    if (showBannerSSR === undefined && !isMounted) {
        return null;
    }

    const handleClick = () => {
        if (isSignedIn) {
            // For signed-in users, trigger checkout if available.
            onGetStarted?.();
        } else {
            // For guests, redirect to register.
            router.push(ROUTES.REGISTER);
        }
    };

    return (
        <div className="mb-12 max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 p-6">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="rounded-full bg-primary/20 p-3 ring-1 ring-primary/30">
                                <Gift className="w-6 h-6 text-primary" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                                Vorschau-Bonus: 25 Wohnungen kostenlos
                            </h3>
                            <p className="text-muted-foreground">
                                Während der Vorschau-Phase enthält der kostenlose Plan <span className="font-semibold text-foreground">bis zu 25 Wohnungen.</span> Nutzen Sie diese Gelegenheit!
                            </p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button onClick={handleClick} className="w-full rounded-2xl">
                            Jetzt starten
                            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
