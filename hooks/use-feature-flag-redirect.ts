'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlagEnabled } from 'posthog-js/react';

/**
 * Hook to redirect to a specified path if a feature flag is disabled.
 * Useful for hiding pages that are controlled by PostHog feature flags.
 * 
 * @param featureFlagKey - The PostHog feature flag key to check
 * @param redirectPath - The path to redirect to if the flag is disabled (default: '/')
 * @returns Object with isLoading and isAllowed states
 */
export function useFeatureFlagRedirect(
    featureFlagKey: string,
    redirectPath: string = '/'
): { isLoading: boolean; isAllowed: boolean } {
    const router = useRouter();
    const isEnabled = useFeatureFlagEnabled(featureFlagKey);

    useEffect(() => {
        // PostHog returns undefined while loading, then true/false
        if (isEnabled === false) {
            router.replace(redirectPath);
        }
    }, [isEnabled, router, redirectPath]);

    return {
        // undefined means still loading from PostHog
        isLoading: isEnabled === undefined,
        isAllowed: isEnabled === true,
    };
}
