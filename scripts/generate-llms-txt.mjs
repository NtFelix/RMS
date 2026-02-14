import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env or .env.local
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Feature flag keys from lib/constants.ts
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
        console.warn('[llms.txt] PostHog API key not configured - using default feature flag values');
        return defaultResult;
    }

    try {
        const response = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                distinct_id: 'llms-txt-build-time-check',
                groups: {},
            }),
        });

        if (!response.ok) {
            console.warn(`[llms.txt] PostHog API returned ${response.status} - using default values`);
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
    console.log('Generating llms.txt...');

    const [featureFlags, articles] = await Promise.all([
        getFeatureFlags(),
        getDocumentationArticles(),
    ]);

    let content = `# Mietevo\n\n`;
    content += `> Mietevo ist eine professionelle Hausverwaltungssoftware für private Vermieter und Hausverwaltungen. Sie bietet Funktionen für Betriebskostenabrechnung, Wohnungsverwaltung, Finanzmanagement und Mieterkommunikation.\n\n`;

    content += `## Produkt & Funktionen\n`;
    content += `- [Startseite](${BASE_URL}/): Übersicht und Einführung in Mietevo\n`;
    content += `- [Betriebskostenabrechnung](${BASE_URL}/funktionen/betriebskosten): Nebenkostenabrechnung erstellen\n`;
    content += `- [Wohnungsverwaltung](${BASE_URL}/funktionen/wohnungsverwaltung): Digitale Verwaltung von Objekten, Einheiten und Mietern\n`;
    content += `- [Finanzverwaltung](${BASE_URL}/funktionen/finanzverwaltung): Überwachung von Mieteingängen und Ausgaben\n`;
    content += `- [Preise & Pakete](${BASE_URL}/preise): Übersicht der Preismodelle und enthaltenen Funktionen\n\n`;

    if (featureFlags.showLoesungen) {
        content += `## Lösungen für verschiedene Zielgruppen\n`;
        content += `- [Für private Vermieter](${BASE_URL}/loesungen/privatvermieter): Maßgeschneidert für private Immobilienbesitzer\n`;
        content += `- [Für kleine & mittlere Hausverwaltungen](${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen): Effiziente Verwaltung für wachsende Portfolios\n`;
        content += `- [Für große Hausverwaltungen](${BASE_URL}/loesungen/grosse-hausverwaltungen): Skalierbare Lösungen für professionelle Verwalter\n\n`;
    }

    content += `## Hilfe & Ressourcen\n`;
    content += `- [Kostenlos testen](${BASE_URL}/auth/register): 14 Tage kostenlos testen, keine Kreditkarte erforderlich\n`;
    content += `- [Login](${BASE_URL}/auth/login): Anmeldung für bestehende Nutzer\n`;
    content += `- [Handbuch & Dokumentation](${BASE_URL}/hilfe/dokumentation): Übersicht aller Hilfethemen\n`;

    if (articles.length > 0) {
        articles.forEach((article) => {
            const title = article.title || article.id;
            content += `  - [${title}](${BASE_URL}/hilfe/dokumentation/${article.id})\n`;
        });
    }
    content += `\n`;

    if (featureFlags.showProdukte) {
        content += `## Kommende Produkte (Warteliste)\n`;
        content += `- [Browser-Erweiterung](${BASE_URL}/warteliste/browser-erweiterung): Mietevo direkt im Browser nutzen\n`;
        content += `- [Mobile App](${BASE_URL}/warteliste/mobile-app): Verwaltung von unterwegs per Smartphone\n\n`;
    }

    content += `## Rechtliches\n`;
    content += `- [Impressum](${BASE_URL}/impressum)\n`;
    content += `- [Datenschutz](${BASE_URL}/datenschutz)\n`;
    content += `- [AGB](${BASE_URL}/agb)\n`;

    const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
    fs.writeFileSync(outputPath, content);
    console.log(`Successfully generated llms.txt at ${outputPath}`);
}

generate().catch(console.error);
