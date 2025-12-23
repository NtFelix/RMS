import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFeatureFlagsForSEO } from '@/lib/posthog-feature-flags'

// Required for Cloudflare Pages deployment
export const runtime = 'edge'

const BASE_URL = 'https://mietevo.de'

// Static last modified date for pages that don't change frequently
// Update this when making significant content changes to static pages
const STATIC_PAGES_LAST_MODIFIED = new Date('2024-12-23')

// Create an anonymous Supabase client for sitemap generation
// This doesn't require cookies/auth since Dokumentation is public
// Uses server-side env vars for explicit configuration
function getAnonymousSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supabase environment variables (SUPABASE_URL and SUPABASE_ANON_KEY) are not set for sitemap generation. ' +
            'Please ensure these server-side environment variables are available in the build environment.'
        )
    }

    return createClient(supabaseUrl, supabaseAnonKey)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch feature flags from PostHog at build time
    // This ensures sitemap content matches what's visible in the UI
    const featureFlags = await getFeatureFlagsForSEO()

    // Static pages with their priorities and change frequencies
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/preise`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        // Funktionen (Features) - Always visible
        {
            url: `${BASE_URL}/funktionen/betriebskosten`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/funktionen/wohnungsverwaltung`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/funktionen/finanzverwaltung`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        // Lösungen (Solutions) - Controlled by 'show-loesungen-dropdown' PostHog feature flag
        ...(featureFlags.showLoesungen ? [
            {
                url: `${BASE_URL}/loesungen/privatvermieter`,
                lastModified: STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
            {
                url: `${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen`,
                lastModified: STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
            {
                url: `${BASE_URL}/loesungen/grosse-hausverwaltungen`,
                lastModified: STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
        ] : []),
        // Hilfe & Dokumentation - Always visible
        {
            url: `${BASE_URL}/hilfe/dokumentation`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        // Warteliste - Controlled by 'show-produkte-dropdown' PostHog feature flag
        ...(featureFlags.showProdukte ? [
            {
                url: `${BASE_URL}/warteliste/browser-erweiterung`,
                lastModified: STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'monthly' as const,
                priority: 0.5,
            },
            {
                url: `${BASE_URL}/warteliste/mobile-app`,
                lastModified: STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'monthly' as const,
                priority: 0.5,
            },
        ] : []),
        // Legal pages (always indexed)
        {
            url: `${BASE_URL}/datenschutz`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/agb`,
            lastModified: STATIC_PAGES_LAST_MODIFIED,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ]

    // Fetch dynamic documentation articles from Supabase
    let documentationPages: MetadataRoute.Sitemap = []

    try {
        const supabase = getAnonymousSupabaseClient()
        const { data: articles } = await supabase
            .from('Dokumentation')
            .select('id, meta')
            .order('id')

        if (articles && articles.length > 0) {
            documentationPages = articles.map((article) => ({
                url: `${BASE_URL}/hilfe/dokumentation/${article.id}`,
                lastModified: article.meta?.last_edited_time
                    ? new Date(article.meta.last_edited_time)
                    : STATIC_PAGES_LAST_MODIFIED,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }))
        }
    } catch (error) {
        console.error('Error fetching documentation articles for sitemap:', error)
    }

    return [...staticPages, ...documentationPages]
}
