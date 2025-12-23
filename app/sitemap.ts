import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFeatureFlagsForSEO } from '@/lib/posthog-feature-flags'

const BASE_URL = 'https://mietevo.de'

// Create an anonymous Supabase client for sitemap generation
// This doesn't require cookies/auth since Dokumentation is public
function getAnonymousSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch feature flags from PostHog at build time
    // This ensures sitemap content matches what's visible in the UI
    const featureFlags = await getFeatureFlagsForSEO()

    // Static pages with their priorities and change frequencies
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/preise`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        // Funktionen (Features) - Always visible
        {
            url: `${BASE_URL}/funktionen/betriebskosten`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/funktionen/wohnungsverwaltung`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/funktionen/finanzverwaltung`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        // Lösungen (Solutions) - Controlled by 'show-loesungen-dropdown' PostHog feature flag
        ...(featureFlags.showLoesungen ? [
            {
                url: `${BASE_URL}/loesungen/privatvermieter`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
            {
                url: `${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
            {
                url: `${BASE_URL}/loesungen/grosse-hausverwaltungen`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            },
        ] : []),
        // Hilfe & Dokumentation - Always visible
        {
            url: `${BASE_URL}/hilfe/dokumentation`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        // Warteliste - Controlled by 'show-produkte-dropdown' PostHog feature flag
        ...(featureFlags.showProdukte ? [
            {
                url: `${BASE_URL}/warteliste/browser-erweiterung`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.5,
            },
            {
                url: `${BASE_URL}/warteliste/mobile-app`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.5,
            },
        ] : []),
        // Legal pages (always indexed)
        {
            url: `${BASE_URL}/datenschutz`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/agb`,
            lastModified: new Date(),
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
                    : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }))
        }
    } catch (error) {
        console.error('Error fetching documentation articles for sitemap:', error)
    }

    return [...staticPages, ...documentationPages]
}


