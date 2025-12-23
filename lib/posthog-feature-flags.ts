/**
 * PostHog Feature Flag Fetcher for Build-Time SEO
 * 
 * This utility fetches feature flag values directly from PostHog API
 * during the build process, enabling conditional sitemap generation
 * based on feature flag state.
 */

import { POSTHOG_FEATURE_FLAGS } from './constants'

const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY

interface FeatureFlagResult {
    showLoesungen: boolean
    showProdukte: boolean
}

/**
 * Fetches feature flag values from PostHog API for a generic/anonymous user
 * Used during build time to determine which pages should be in the sitemap
 * 
 * Note: This uses an anonymous distinct_id since we want to check the
 * default/public state of the feature flags, not user-specific overrides.
 */
export async function getFeatureFlagsForSEO(): Promise<FeatureFlagResult> {
    const defaultResult: FeatureFlagResult = {
        showLoesungen: false,
        showProdukte: false,
    }

    if (!POSTHOG_API_KEY) {
        console.warn('[SEO] PostHog API key not configured - feature-flag-controlled pages will not be indexed')
        return defaultResult
    }

    try {
        // Use PostHog's /decide endpoint to evaluate feature flags
        // Use cache: 'no-store' to ensure fresh flags on each build
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                // Use a fixed distinct_id for build-time evaluation
                // This gets the "default" feature flag state for new users
                distinct_id: 'seo-build-time-check',
                groups: {},
            }),
        })

        if (!response.ok) {
            console.warn(`[SEO] PostHog API returned ${response.status} - using default feature flag values`)
            return defaultResult
        }

        const data = await response.json()
        const featureFlags = data.featureFlags || {}

        const result: FeatureFlagResult = {
            showLoesungen: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN] === true,
            showProdukte: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN] === true,
        }

        console.log('[SEO] Feature flags fetched for sitemap:', result)
        return result

    } catch (error) {
        console.error('[SEO] Error fetching feature flags from PostHog:', error)
        return defaultResult
    }
}

/**
 * Cached version that fetches flags once and reuses the result
 * Useful when multiple pages need to check the same flags during a single build
 */
let cachedFlags: FeatureFlagResult | null = null

export async function getFeatureFlagsForSEOCached(): Promise<FeatureFlagResult> {
    if (cachedFlags) {
        return cachedFlags
    }

    cachedFlags = await getFeatureFlagsForSEO()
    return cachedFlags
}

/**
 * Clears the cached flags - useful for testing
 */
export function clearFeatureFlagCache(): void {
    cachedFlags = null
}
