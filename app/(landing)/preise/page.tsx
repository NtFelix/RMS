import { getLandingPageFeatureFlags } from '@/lib/posthog-feature-flags';
import PricingPageClient from './pricing-page-client';

/**
 * Pricing Page - Server Component
 * 
 * This page fetches feature flags at build time, ensuring that
 * promotional content (like the preview limit notice) is visible
 * even to users with adblockers.
 * 
 * The feature flag values are baked into the static page at build time
 * and will remain constant until the next deployment.
 */
export default async function PricingPage() {
    // Fetch feature flags at build time
    // This bypasses client-side adblockers that might block PostHog requests
    const serverFeatureFlags = await getLandingPageFeatureFlags();

    return <PricingPageClient serverFeatureFlags={serverFeatureFlags} />;
}
