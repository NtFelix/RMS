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
 * Global helper to fetch feature flags from PostHog for server-side use.
 */
async function fetchPostHogFlags(distinctId: string, cache: RequestCache = 'no-store'): Promise<Record<string, any>> {
    if (!POSTHOG_API_KEY) {
        return {}
    }

    try {
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache,
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                distinct_id: distinctId,
                groups: {},
            }),
        })

        if (!response.ok) {
            console.warn(`[PostHog] API returned ${response.status}`)
            return {}
        }

        const data = await response.json()
        return data.featureFlags || {}
    } catch (error) {
        console.error('[PostHog] Error fetching feature flags:', error)
        return {}
    }
}

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
    const flags = await fetchPostHogFlags('seo-build-time-check', 'no-store')

    const result: FeatureFlagResult = {
        showLoesungen: flags[POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN] === true,
        showProdukte: flags[POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN] === true,
    }

    console.log('[SEO] Feature flags fetched for sitemap:', result)
    return result
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
    const flags = await fetchPostHogFlags('landing-page-ssr', 'force-cache')

    const result: LandingPageFeatureFlags = {
        showPricingPreviewLimitNotice: flags[POSTHOG_FEATURE_FLAGS.PRICING_PAGE_PREVIEW_LIMIT_NOTICE] === true,
        showWaitlistButton: flags[POSTHOG_FEATURE_FLAGS.SHOW_WAITLIST_BUTTON] === true,
    }

    console.log('[Landing] Feature flags fetched for SSR:', result)
    return result
}
