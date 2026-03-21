import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import resolvePostHogHost from '../lib/posthog-host.js';

/**
 * llms.txt Generation Script
 * 
 * Note: Some constants and logic are intentionally duplicated from lib/ to keep
 * this script as a standalone build tool that runs in Node.js without requiring
 * complex TypeScript execution environments during the CI/CD process.
 */

// Load environment variables locally if dotenv is available
async function loadEnv() {
    try {
        const dotenv = await import('dotenv');
        dotenv.config({ path: '.env.local' });
        dotenv.config({ path: '.env' });
    } catch (e) {
        // dotenv not found, assuming variables are already in environment (e.g., CI/CD)
    }
}

// Duplicated from lib/constants.ts for standalone compatibility
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de';
const POSTHOG_HOST = resolvePostHogHost();
const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

const FEATURE_FLAGS = {
    SHOW_LOESUNGEN_DROPDOWN: 'show-loesungen-dropdown',
    SHOW_PRODUKTE_DROPDOWN: 'show-produkte-dropdown',
};

async function getFeatureFlags() {
    const defaultResult = {
        showLoesungen: false,
        showProdukte: false,
    };

    if (!POSTHOG_API_KEY) {
        console.warn('[llms.txt] PostHog API key not configured - using default values');
        return defaultResult;
    }

    try {
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                distinct_id: 'llms-txt-build-time-check',
                groups: {},
            }),
        });

        if (!response.ok) {
            console.warn(`[llms.txt] PostHog API returned ${response.status}`);
            return defaultResult;
        }

        const data = await response.json();
        const flags = data.featureFlags || {};

        return {
            showLoesungen: flags[FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN] === true,
            showProdukte: flags[FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN] === true,
        };
    } catch (error) {
        console.error('[llms.txt] Error fetching feature flags:', error.message);
        return defaultResult;
    }
}

async function getDocumentationArticles() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[llms.txt] Supabase environment variables missing.');
        return [];
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
        .from('Dokumentation')
        .select('id, title')
        .order('id');

    if (error) {
        console.error('[llms.txt] Error fetching documentation:', error.message);
        return [];
    }

    return data || [];
}

async function generate() {
    await loadEnv();
    console.log('Generating llms.txt...');

    const [featureFlags, articles] = await Promise.all([
        getFeatureFlags(),
        getDocumentationArticles(),
    ]);

    const articlesContent = articles.length > 0
        ? articles.map(article => `  - [${article.title || article.id}](${BASE_URL}/hilfe/dokumentation/${article.id})`).join('\n')
        : '';

    const loesungenSection = featureFlags.showLoesungen ? `
## Lösungen für verschiedene Zielgruppen
- [Für private Vermieter](${BASE_URL}/loesungen/privatvermieter): Maßgeschneidert für private Immobilienbesitzer
- [Für kleine & mittlere Hausverwaltungen](${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen): Effiziente Verwaltung für wachsende Portfolios
- [Für große Hausverwaltungen](${BASE_URL}/loesungen/grosse-hausverwaltungen): Skalierbare Lösungen für professionelle Verwalter
` : '';

    const produkteSection = featureFlags.showProdukte ? `
## Kommende Produkte (Warteliste)
- [Browser-Erweiterung](${BASE_URL}/warteliste/browser-erweiterung): Mietevo direkt im Browser nutzen
- [Mobile App](${BASE_URL}/warteliste/mobile-app): Verwaltung von unterwegs per Smartphone
` : '';

    const content = `# Mietevo

> Mietevo ist eine professionelle Hausverwaltungssoftware für private Vermieter und Hausverwaltungen. Sie bietet Funktionen für Betriebskostenabrechnung, Wohnungsverwaltung, Finanzmanagement und Mieterkommunikation.

## Produkt & Funktionen
- [Startseite](${BASE_URL}/): Übersicht und Einführung in Mietevo
- [Betriebskostenabrechnung](${BASE_URL}/funktionen/betriebskosten): Nebenkostenabrechnung erstellen
- [Wohnungsverwaltung](${BASE_URL}/funktionen/wohnungsverwaltung): Digitale Verwaltung von Objekten, Einheiten und Mietern
- [Finanzverwaltung](${BASE_URL}/funktionen/finanzverwaltung): Überwachung von Mieteingängen und Ausgaben
- [Preise & Pakete](${BASE_URL}/preise): Übersicht der Preismodelle und enthaltenen Funktionen
${loesungenSection}
## Hilfe & Ressourcen
- [Kostenlos testen](${BASE_URL}/auth/register): 14 Tage kostenlos testen, keine Kreditkarte erforderlich
- [Login](${BASE_URL}/auth/login): Anmeldung für bestehende Nutzer
- [Handbuch & Dokumentation](${BASE_URL}/hilfe/dokumentation): Übersicht aller Hilfethemen
${articlesContent}
${produkteSection}
## Rechtliches
- [Impressum](${BASE_URL}/impressum)
- [Datenschutz](${BASE_URL}/datenschutz)
- [AGB](${BASE_URL}/agb)
`;

    const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
    fs.writeFileSync(outputPath, content.trim() + '\n');
    console.log(`Successfully generated llms.txt at ${outputPath}`);
}

generate().catch(console.error);
