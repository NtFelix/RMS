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

const FEATURE_FLAGS = {
    SHOW_LOESUNGEN_DROPDOWN: 'show-loesungen-dropdown',
    SHOW_PRODUKTE_DROPDOWN: 'show-produkte-dropdown',
};

function getBuildConfig() {
    return {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de',
        posthogHost: resolvePostHogHost(),
        posthogProjectApiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    };
}

async function getFeatureFlags({ posthogHost, posthogProjectApiKey }) {
    const defaultResult = {
        showLoesungen: false,
        showProdukte: false,
    };

    if (!posthogProjectApiKey) {
        console.warn('[llms.txt] PostHog API key not configured - using default values');
        return defaultResult;
    }

    try {
        const response = await fetch(`${posthogHost}/decide?v=3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
                api_key: posthogProjectApiKey,
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

async function generate() {
    await loadEnv();
    console.log('Generating llms.txt...');

    const { baseUrl, posthogHost, posthogProjectApiKey } = getBuildConfig();
    const featureFlags = await getFeatureFlags({ posthogHost, posthogProjectApiKey });

    const loesungenSection = featureFlags.showLoesungen ? `
## Lösungen für verschiedene Zielgruppen
- [Für private Vermieter](${baseUrl}/loesungen/privatvermieter): Maßgeschneidert für private Immobilienbesitzer
- [Für kleine & mittlere Hausverwaltungen](${baseUrl}/loesungen/kleine-mittlere-hausverwaltungen): Effiziente Verwaltung für wachsende Portfolios
- [Für große Hausverwaltungen](${baseUrl}/loesungen/grosse-hausverwaltungen): Skalierbare Lösungen für professionelle Verwalter
` : '';

    const produkteSection = featureFlags.showProdukte ? `
## Kommende Produkte (Warteliste)
- [Browser-Erweiterung](${baseUrl}/warteliste/browser-erweiterung): Mietevo direkt im Browser nutzen
- [Mobile App](${baseUrl}/warteliste/mobile-app): Verwaltung von unterwegs per Smartphone
` : '';

    const content = `# Mietevo

> Mietevo ist eine professionelle Hausverwaltungssoftware für private Vermieter und Hausverwaltungen. Sie bietet Funktionen für Betriebskostenabrechnung, Wohnungsverwaltung, Finanzmanagement und Mieterkommunikation.

## Produkt & Funktionen
- [Startseite](${baseUrl}/): Übersicht und Einführung in Mietevo
- [Betriebskostenabrechnung](${baseUrl}/funktionen/betriebskosten): Nebenkostenabrechnung erstellen
- [Wohnungsverwaltung](${baseUrl}/funktionen/wohnungsverwaltung): Digitale Verwaltung von Objekten, Einheiten und Mietern
- [Finanzverwaltung](${baseUrl}/funktionen/finanzverwaltung): Überwachung von Mieteingängen und Ausgaben
- [Preise & Pakete](${baseUrl}/preise): Übersicht der Preismodelle und enthaltenen Funktionen
${loesungenSection}
## Hilfe & Ressourcen
- [Kostenlos testen](${baseUrl}/auth/register): 14 Tage kostenlos testen, keine Kreditkarte erforderlich
- [Login](${baseUrl}/auth/login): Anmeldung für bestehende Nutzer
- [Handbuch & Dokumentation](https://docs.mietevo.de): Übersicht aller Hilfethemen
${produkteSection}
## Rechtliches
- [Impressum](${baseUrl}/impressum)
- [Datenschutz](${baseUrl}/datenschutz)
- [AGB](${baseUrl}/agb)
`;

    const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
    fs.writeFileSync(outputPath, content.trim() + '\n');
    console.log(`Successfully generated llms.txt at ${outputPath}`);
}

generate().catch(console.error);
