/**
 * PostHog Feature Flag Fetcher for Build-Time and Server-Side Rendering
 * 
 * This utility fetches feature flag values directly from PostHog API
 * during the build process or server-side rendering, enabling:
 * - Conditional sitemap generation based on feature flag state
 * - Server-side rendered landing page features (bypasses adblockers)
 */

import { POSTHOG_FEATURE_FLAGS } from './constants'

// The /decide endpoint is public and requires the public API key (phc_ prefix)
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * Feature flags for SEO/sitemap generation
 */
interface FeatureFlagResult {
    showLoesungen: boolean
    showProdukte: boolean
}

/**
 * Feature flags for landing pages (server-side rendered)
 * These are fetched server-side to ensure visibility even with adblockers
 */
export interface LandingPageFeatureFlags {
    showPricingPreviewLimitNotice: boolean
    showWaitlistButton: boolean
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

/**
 * Fetches feature flag values for landing pages from PostHog API
 * Used at build time to determine which promotional content should
 * be displayed (e.g., pricing page preview limit notice)
 * 
 * This enables the content to be rendered server-side at build time,
 * bypassing client-side adblockers that might block PostHog requests.
 * 
 * The flag values are cached at build time (force-cache) and will
 * remain static until the next deployment.
 */
export async function getLandingPageFeatureFlags(): Promise<LandingPageFeatureFlags> {
    const defaultResult: LandingPageFeatureFlags = {
        showPricingPreviewLimitNotice: false,
        showWaitlistButton: false,
    }

    if (!POSTHOG_API_KEY) {
        console.warn('[Landing] PostHog API key not configured - using default feature flag values')
        return defaultResult
    }

    try {
        // Use PostHog's /decide endpoint to evaluate feature flags
        // Use force-cache for true build-time static generation
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'force-cache',
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                // Use a fixed distinct_id for server-side evaluation
                // This gets the "default" feature flag state for new/anonymous users
                distinct_id: 'landing-page-ssr',
                groups: {},
            }),
        })

        if (!response.ok) {
            console.warn(`[Landing] PostHog API returned ${response.status} - using default feature flag values`)
            return defaultResult
        }

        const data = await response.json()
        const featureFlags = data.featureFlags || {}

        const result: LandingPageFeatureFlags = {
            showPricingPreviewLimitNotice: featureFlags[POSTHOG_FEATURE_FLAGS.PRICING_PAGE_PREVIEW_LIMIT_NOTICE] === true,
            showWaitlistButton: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_WAITLIST_BUTTON] === true,
        }

        console.log('[Landing] Feature flags fetched for SSR:', result)
        return result

    } catch (error) {
        console.error('[Landing] Error fetching feature flags from PostHog:', error)
        return defaultResult
    }
}

