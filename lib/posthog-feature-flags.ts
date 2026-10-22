/**
 * PostHog Feature Flag Fetcher for Build-Time SEO
 *
 * This utility fetches feature flag values directly from PostHog API
 * during the build process, enabling conditional sitemap generation
 * based on feature flag state.
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

const DEFAULT_FLAGS: FeatureFlagResult = {
    showLoesungen: false,
    showProdukte: false,
}

/**
 * Cached fetch of the SEO feature flags.
 *
 * This function must never throw: an error inside a `use cache` scope is reported as a
 * prerender error and fails `next build`, even when the caller catches it. On failure it
 * returns the all-false defaults instead, with a short cache lifetime so the fallback is
 * retried soon rather than pinned for hours.
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
        })

        if (!response.ok) {
            throw new Error(`PostHog /decide returned HTTP ${response.status}`)
        }

        const data = await response.json()
        const featureFlags = data.featureFlags || {}

        const result: FeatureFlagResult = {
            showLoesungen: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN] === true,
            showProdukte: featureFlags[POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN] === true,
        }

        console.log('[SEO] Feature flags fetched for sitemap:', result)
        cacheLife('hours')
        return result
    } catch (error) {
        console.warn('[SEO] Error fetching feature flags from PostHog - using default values:', error)
        cacheLife('minutes')
        return { ...DEFAULT_FLAGS }
    }
}

/**
 * Fetches feature flag values from PostHog API for a generic/anonymous user
 * Used to determine which pages should be in the sitemap and which pages
 * are indexable.
 *
 * The result is cached via `use cache` (see fetchFeatureFlagsForSEO) under the tag
 * `posthog:flags:seo`: hours on success, minutes when the request failed and the
 * all-false fallback is returned. Without an API key the fallback is returned directly.
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
