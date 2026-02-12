import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFeatureFlagsForSEO } from '@/lib/posthog-feature-flags'

// Required for Cloudflare Pages deployment
export const runtime = 'edge'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de'

interface DocumentationArticle {
    id: string
    title: string | null
}

// Create an anonymous Supabase client for sitemap generation
// This doesn't require cookies/auth since Dokumentation is public
// Uses server-side env vars for explicit configuration
function getAnonymousSupabaseClient() {
    const serverUrl = process.env.SUPABASE_URL
    const serverKey = process.env.SUPABASE_ANON_KEY
    const useServerVars = serverUrl && serverKey

    const supabaseUrl = useServerVars ? serverUrl : process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = useServerVars ? serverKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        // In some build environments these might not be set, log warning but don't crash
        console.warn('Supabase environment variables missing for llms.txt generation.')
        return null
    }

    return createClient(supabaseUrl, supabaseAnonKey)
}

export async function GET() {
    // 1. Fetch feature flags and documentation in parallel
    const featureFlagsPromise = getFeatureFlagsForSEO()

    // Fetch documentation articles
    const supabase = getAnonymousSupabaseClient()
    const articlesPromise = supabase
        ? supabase.from('Dokumentation').select('id, title').order('id')
        : Promise.resolve({ data: [] })

    const [featureFlags, articlesResult] = await Promise.all([
        featureFlagsPromise,
        articlesPromise
    ])

    const articles = (articlesResult.data || []) as DocumentationArticle[]

    // 2. Construct the Markdown content
    let content = '# Mietevo\n\n'
    content += '> Mietevo ist eine professionelle Hausverwaltungssoftware für private Vermieter und Hausverwaltungen. Sie bietet Funktionen für Betriebskostenabrechnung, Wohnungsverwaltung, Finanzmanagement und Mieterkommunikation.\n\n'

    // Section: Produkt & Funktionen
    content += '## Produkt & Funktionen\n'
    content += `- [Startseite](${BASE_URL}/): Übersicht und Einführung in Mietevo\n`
    content += `- [Betriebskostenabrechnung](${BASE_URL}/funktionen/betriebskosten): Rechtssichere Nebenkostenabrechnung erstellen\n`
    content += `- [Wohnungsverwaltung](${BASE_URL}/funktionen/wohnungsverwaltung): Digitale Verwaltung von Objekten, Einheiten und Mietern\n`
    content += `- [Finanzverwaltung](${BASE_URL}/funktionen/finanzverwaltung): Überwachung von Mieteingängen und Ausgaben\n`
    content += `- [Preise & Pakete](${BASE_URL}/preise): Übersicht der Preismodelle und enthaltenen Funktionen\n\n`

    // Section: Lösungen (Conditional)
    if (featureFlags.showLoesungen) {
        content += '## Lösungen für verschiedene Zielgruppen\n'
        content += `- [Für private Vermieter](${BASE_URL}/loesungen/privatvermieter): Maßgeschneidert für private Immobilienbesitzer\n`
        content += `- [Für kleine & mittlere Hausverwaltungen](${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen): Effiziente Verwaltung für wachsende Portfolios\n`
        content += `- [Für große Hausverwaltungen](${BASE_URL}/loesungen/grosse-hausverwaltungen): Skalierbare Lösungen für professionelle Verwalter\n\n`
    }

    // Section: Hilfe & Ressourcen
    content += '## Hilfe & Ressourcen\n'
    content += `- [Kostenlos testen](${BASE_URL}/auth/register): 14 Tage kostenlos testen, keine Kreditkarte erforderlich\n`
    content += `- [Login](${BASE_URL}/auth/login): Anmeldung für bestehende Nutzer\n`
    content += `- [Handbuch & Dokumentation](${BASE_URL}/hilfe/dokumentation): Übersicht aller Hilfethemen\n`

    // Add individual documentation articles if available
    if (articles.length > 0) {
        articles.forEach((article) => {
            // Use title if available, otherwise fallback to ID or generic name
            const title = article.title || article.id
            content += `  - [${title}](${BASE_URL}/hilfe/dokumentation/${article.id})\n`
        })
    }
    content += '\n'

    // Section: Warteliste (Conditional)
    if (featureFlags.showProdukte) {
        content += '## Kommende Produkte (Warteliste)\n'
        content += `- [Browser-Erweiterung](${BASE_URL}/warteliste/browser-erweiterung): Mietevo direkt im Browser nutzen\n`
        content += `- [Mobile App](${BASE_URL}/warteliste/mobile-app): Verwaltung von unterwegs per Smartphone\n\n`
    }

    // Section: Rechtliches
    content += '## Rechtliches\n'
    content += `- [Impressum](${BASE_URL}/impressum)\n`
    content += `- [Datenschutz](${BASE_URL}/datenschutz)\n`
    content += `- [AGB](${BASE_URL}/agb)\n`

    // 3. Return the response
    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            // Cache for 1 hour on CDN, revalidate after that
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
    })
}
