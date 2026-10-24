/**
 * PostHog Feature Flag Fetcher for SEO
 *
 * This utility fetches feature flag values directly from PostHog API
 * (at build time and again on every cache revalidation at runtime), enabling
 * conditional sitemap generation and indexability based on feature flag state.
 */

import { cacheLife, cacheTag } from 'next/cache'
import { POSTHOG_FEATURE_FLAGS } from './constants'
import resolvePostHogHost from './posthog-host'

// The /decide endpoint is public and requires the public API key (phc_ prefix)
const POSTHOG_HOST = resolvePostHogHost()
const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

interface FeatureFlagResult {
    showLoesungen: boolean
    showProdukte: boolean
}

// Upper bound for the PostHog request so a hanging connection can't stall prerendering
const POSTHOG_TIMEOUT_MS = 5000

const DEFAULT_FLAGS: FeatureFlagResult = {
    showLoesungen: false,
    showProdukte: false,
}

// Last successfully fetched flags of this server instance. Used as stale-on-error fallback so a
// transient PostHog failure doesn't flip an enabled feature to noindex / out of the sitemap.
let lastKnownFlags: FeatureFlagResult | null = null

// Cached for minutes only so the failure is retried soon instead of being pinned for hours
function fallbackFlags(): FeatureFlagResult {
    cacheLife('minutes')
    return { ...(lastKnownFlags ?? DEFAULT_FLAGS) }
}

/**
 * Cached fetch of the SEO feature flags.
 *
 * This function must never throw: an error inside a `use cache` scope is reported as a
 * prerender error and fails `next build`, even when the caller catches it. On failure it
 * returns the last known flags of this instance (all-false defaults if there are none) with a
 * short cache lifetime, so the fallback is retried soon rather than pinned for hours.
 */
async function fetchFeatureFlagsForSEO(): Promise<FeatureFlagResult> {
    'use cache'
    cacheTag('posthog:flags:seo')

    try {
        // Use PostHog's /decide endpoint to evaluate feature flags
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                // Use a fixed distinct_id for build-time evaluation
                // This gets the "default" feature flag state for new users
                distinct_id: 'seo-build-time-check',
                groups: {},
            }),
            signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
        })

        if (!response.ok) {
            console.warn(`[SEO] PostHog /decide returned HTTP ${response.status} - using fallback flags`)
            return fallbackFlags()
        }

        const data = await response.json()
        const featureFlags = data.featureFlags || {}

        const result: FeatureFlagResult = {
            showLoesungen: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN] === true,
            showProdukte: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN] === true,
        }

        console.log('[SEO] Feature flags fetched for sitemap:', result)
        lastKnownFlags = result
        cacheLife('hours')
        return result
    } catch (error) {
        console.warn('[SEO] Error fetching feature flags from PostHog - using fallback flags:', error)
        return fallbackFlags()
    }
}

/**
 * Fetches feature flag values from PostHog API for a generic/anonymous user
 * Used to determine which pages should be in the sitemap and which pages
 * are indexable.
 *
 * The result is cached via `use cache` (see fetchFeatureFlagsForSEO) under the tag
 * `posthog:flags:seo`: hours on success, minutes when the request failed and the fallback
 * (last known flags, else all-false) is returned. The tag is not revalidated anywhere yet, so
 * flag changes only show up once the cache lifetime has elapsed. Without an API key the
 * all-false defaults are returned directly.
 *
 * Note: This uses an anonymous distinct_id since we want to check the
 * default/public state of the feature flags, not user-specific overrides.
 */
export async function getFeatureFlagsForSEO(): Promise<FeatureFlagResult> {
    if (!POSTHOG_API_KEY) {
        console.warn('[SEO] PostHog API key not configured - feature-flag-controlled pages will not be indexed')
        return { ...DEFAULT_FLAGS }
    }

    return fetchFeatureFlagsForSEO()
}
