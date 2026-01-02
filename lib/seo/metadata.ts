import { Metadata } from 'next'
import { BASE_URL, BRAND_NAME, OG_IMAGE_URL } from '@/lib/constants'

/**
 * Default metadata for the entire application.
 * This serves as a fallback for pages without specific metadata.
 */
export const defaultMetadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: `${BRAND_NAME} | Hausverwaltungssoftware für Vermieter`,
        template: `%s | ${BRAND_NAME}`,
    },
    description: 'Mit Mietevo verwalten Sie Ihre Mietobjekte professionell. Automatische Betriebskostenabrechnungen, Mieterverwaltung und Finanzen - alles in einer Software. 14 Tage kostenlos testen!',
    keywords: [
        'Hausverwaltungssoftware',
        'Nebenkostenabrechnung Software',
        'Mietverwaltung',
        'Betriebskostenabrechnung',
        'Immobilienverwaltung',
        'Vermieter Software',
        'Hausverwaltung',
        'Mieterverwaltung',
        'Wohnungsverwaltung',
    ],
    authors: [{ name: BRAND_NAME }],
    creator: BRAND_NAME,
    publisher: BRAND_NAME,
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'de_DE',
        url: BASE_URL,
        siteName: BRAND_NAME,
        title: `${BRAND_NAME} - Hausverwaltungssoftware für Vermieter`,
        description: 'Die moderne Lösung für Ihre Mietverwaltung und Betriebskostenabrechnung. Einfach, schnell und professionell.',
        images: [
            {
                url: OG_IMAGE_URL,
                width: 1200,
                height: 630,
                alt: `${BRAND_NAME} - Hausverwaltungssoftware`,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: `${BRAND_NAME} - Hausverwaltungssoftware für Vermieter`,
        description: 'Die moderne Lösung für Ihre Mietverwaltung und Betriebskostenabrechnung.',
        site: '@Mietevo',
        creator: '@Mietevo',
        images: [OG_IMAGE_URL],
    },
    alternates: {
        canonical: BASE_URL,
    },
    verification: {
        // Add your verification codes here when available
        // google: 'your-google-verification-code',
        // yandex: 'your-yandex-verification-code',
    },
    category: 'Technology',
}

/**
 * Page-specific metadata configurations.
 * 
 * EXPLANATION (Step 3):
 * ---------------------
 * Each page should have unique, optimized metadata to:
 * 
 * 1. **title**: The page title shown in search results and browser tabs
 *    - Should include primary keyword near the beginning
 *    - Keep under 60 characters to avoid truncation
 *    - Format: "Primary Keyword | Brand Name" or descriptive title
 * 
 * 2. **description**: The meta description shown in search results
 *    - Should be compelling and include a call-to-action
 *    - Keep between 150-160 characters
 *    - Include primary and secondary keywords naturally
 * 
 * 3. **keywords**: Relevant keywords for the page
 *    - Include variations (singular/plural)
 *    - Include long-tail keywords
 *    - Don't stuff - keep it natural
 * 
 * 4. **openGraph/twitter**: Social sharing metadata
 *    - Ensures attractive previews when shared on social media
 *    - Increases click-through rate from social platforms
 * 
 * 5. **alternates.canonical**: The canonical URL
 *    - Prevents duplicate content issues
 *    - Tells search engines which URL is the "main" version
 */

export const pageMetadata = {
    // Homepage
    home: {
        title: 'Hausverwaltungssoftware für Vermieter | Betriebskostenabrechnung einfach gemacht',
        description: 'Mit Mietevo verwalten Sie Ihre Mietobjekte professionell. Automatische Betriebskostenabrechnungen, Mieterverwaltung und Finanzen - alles in einer Software. 14 Tage kostenlos testen!',
        keywords: [
            'Hausverwaltungssoftware',
            'Nebenkostenabrechnung erstellen',
            'Mietverwaltung Software',
            'Betriebskostenabrechnung Software',
            'Immobilienverwaltung',
            'Vermieter Software',
            'Hausverwaltung online',
        ],
        openGraph: {
            title: 'Mietevo - Hausverwaltungssoftware für Vermieter',
            description: 'Die moderne Lösung für Ihre Mietverwaltung und Betriebskostenabrechnung. Einfach, schnell und professionell.',
        },
        alternates: {
            canonical: BASE_URL,
        },
    } satisfies Metadata,

    // Preise (Pricing)
    preise: {
        title: 'Preise & Tarife | Hausverwaltungssoftware',
        description: 'Transparente Preismodelle für Privatvermieter und Hausverwaltungen. Keine versteckten Kosten. 14 Tage kostenlos testen. Jetzt Tarif wählen!',
        keywords: [
            'Hausverwaltungssoftware Kosten',
            'Mietverwaltung Preise',
            'Nebenkostenabrechnung Software Preis',
            'Hausverwaltung Software günstig',
            'Immobilienverwaltung Kosten',
        ],
        openGraph: {
            title: 'Preise & Tarife | Mietevo Hausverwaltungssoftware',
            description: 'Transparente Preismodelle für Privatvermieter und Hausverwaltungen. Keine versteckten Kosten.',
            url: `${BASE_URL}/preise`,
        },
        alternates: {
            canonical: `${BASE_URL}/preise`,
        },
    } satisfies Metadata,

    // Funktionen - Betriebskosten
    funktionenBetriebskosten: {
        title: 'Betriebskostenabrechnung erstellen | Nebenkostenabrechnung Software',
        description: 'Erstellen Sie professionelle Betriebskostenabrechnungen in Minuten. Automatische Verteilung nach Umlageschlüssel. Zählerstände erfassen. PDF-Export für Mieter.',
        keywords: [
            'Nebenkostenabrechnung erstellen',
            'Betriebskostenabrechnung Software',
            'Nebenkostenabrechnung Vorlage',
            'Betriebskosten abrechnen',
            'Nebenkostenabrechnung Programm',
            //'Heizkostenabrechnung',
            'Wasserkostenabrechnung',
            'Umlageschlüssel berechnen',
        ],
        openGraph: {
            title: 'Betriebskostenabrechnung erstellen | Mietevo',
            description: 'Erstellen Sie professionelle Betriebskostenabrechnungen in Minuten. Automatische Verteilung, Zählerstände, PDF-Export.',
            url: `${BASE_URL}/funktionen/betriebskosten`,
        },
        alternates: {
            canonical: `${BASE_URL}/funktionen/betriebskosten`,
        },
    } satisfies Metadata,

    // Funktionen - Wohnungsverwaltung
    funktionenWohnungsverwaltung: {
        title: 'Wohnungsverwaltung Software | Immobilienverwaltung online',
        description: 'Verwalten Sie Ihre Mietwohnungen zentral. Mieter, Mietverträge, Dokumente und Übergabeprotokolle - alles an einem Ort. Für Privatvermieter und Hausverwaltungen.',
        keywords: [
            'Wohnungsverwaltung Software',
            'Immobilienverwaltung online',
            'Mietobjekte verwalten',
            'Hausverwaltung digital',
            'Wohnungen verwalten Software',
            'Mietvertragsverwaltung',
            'Dokumentenverwaltung Immobilien',
        ],
        openGraph: {
            title: 'Wohnungsverwaltung Software | Mietevo',
            description: 'Verwalten Sie Ihre Mietwohnungen zentral. Mieter, Verträge, Dokumente - alles an einem Ort.',
            url: `${BASE_URL}/funktionen/wohnungsverwaltung`,
        },
        alternates: {
            canonical: `${BASE_URL}/funktionen/wohnungsverwaltung`,
        },
    } satisfies Metadata,

    // Funktionen - Finanzverwaltung
    funktionenFinanzverwaltung: {
        title: 'Finanzverwaltung für Vermieter | Mieteinnahmen & Ausgaben',
        description: 'Behalten Sie Ihre Mieteinnahmen und Ausgaben im Blick. Automatische Buchungen, Finanzberichte und steuerrelevante Auswertungen für Ihre Immobilien.',
        keywords: [
            'Finanzverwaltung Vermieter',
            'Mieteinnahmen verwalten',
            'Immobilien Buchhaltung',
            'Vermieter Steuererklärung',
            'Mieteinnahmen erfassen',
            'Ausgaben Immobilien',
            'Rendite Berechnung Immobilie',
        ],
        openGraph: {
            title: 'Finanzverwaltung für Vermieter | Mietevo',
            description: 'Behalten Sie Ihre Mieteinnahmen und Ausgaben im Blick. Automatische Buchungen und Finanzberichte.',
            url: `${BASE_URL}/funktionen/finanzverwaltung`,
        },
        alternates: {
            canonical: `${BASE_URL}/funktionen/finanzverwaltung`,
        },
    } satisfies Metadata,

    // Lösungen - Privatvermieter
    loesungenPrivatvermieter: {
        title: 'Hausverwaltungssoftware für Privatvermieter | Einfach & Günstig',
        description: 'Die einfache Lösung für private Vermieter. Betriebskostenabrechnung, Mieterverwaltung, Finanzen. Ohne Vorkenntnisse sofort loslegen. Ideal für 1-10 Wohnungen.',
        keywords: [
            'Hausverwaltung Privatvermieter',
            'Software für private Vermieter',
            'Betriebskostenabrechnung Privatvermieter',
            'Mietverwaltung privat',
            'Vermieter Software einfach',
            'kleine Vermietung Software',
        ],
        openGraph: {
            title: 'Hausverwaltungssoftware für Privatvermieter | Mietevo',
            description: 'Die einfache Lösung für private Vermieter. Ohne Vorkenntnisse sofort loslegen.',
            url: `${BASE_URL}/loesungen/privatvermieter`,
        },
        alternates: {
            canonical: `${BASE_URL}/loesungen/privatvermieter`,
        },
    } satisfies Metadata,

    // Lösungen - Kleine/Mittlere Hausverwaltungen
    loesungenKleineMittlere: {
        title: 'Software für kleine & mittlere Hausverwaltungen',
        description: 'Professionelle Hausverwaltungssoftware für wachsende Portfolios. Skalierbar, effizient und bezahlbar. Ideal für 10-100 Einheiten.',
        keywords: [
            'Hausverwaltung Software mittelstand',
            'Hausverwaltungsprogramm',
            'WEG Verwaltung Software',
            'Immobilienverwaltung mittelstand',
            'professionelle Hausverwaltung',
        ],
        openGraph: {
            title: 'Software für kleine & mittlere Hausverwaltungen | Mietevo',
            description: 'Professionelle Hausverwaltungssoftware für wachsende Portfolios. Skalierbar und effizient.',
            url: `${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen`,
        },
        alternates: {
            canonical: `${BASE_URL}/loesungen/kleine-mittlere-hausverwaltungen`,
        },
    } satisfies Metadata,

    // Lösungen - Große Hausverwaltungen
    loesungenGrosse: {
        title: 'Enterprise Hausverwaltungssoftware | Große Portfolios',
        description: 'Enterprise-Lösung für große Hausverwaltungen. Umfassende Funktionen, Multi-User, API-Zugang. Für Portfolios ab 100 Einheiten.',
        keywords: [
            'Enterprise Hausverwaltung',
            'Hausverwaltung große Portfolios',
            'professionelle Immobilienverwaltung',
            'Hausverwaltung Multi-User',
            'Hausverwaltung API',
        ],
        openGraph: {
            title: 'Enterprise Hausverwaltungssoftware | Mietevo',
            description: 'Enterprise-Lösung für große Hausverwaltungen. Umfassende Funktionen für große Portfolios.',
            url: `${BASE_URL}/loesungen/grosse-hausverwaltungen`,
        },
        alternates: {
            canonical: `${BASE_URL}/loesungen/grosse-hausverwaltungen`,
        },
    } satisfies Metadata,

    // Dokumentation
    dokumentation: {
        title: 'Dokumentation & Hilfe | Anleitungen für Mietevo',
        description: 'Ausführliche Anleitungen und Hilfe zur Nutzung von Mietevo. Schritt-für-Schritt Tutorials, FAQ und Best Practices für Ihre Hausverwaltung.',
        keywords: [
            'Mietevo Anleitung',
            'Hausverwaltung Tutorial',
            'Nebenkostenabrechnung Hilfe',
            'Mietevo Dokumentation',
            'Hausverwaltung Hilfe',
        ],
        openGraph: {
            title: 'Dokumentation & Hilfe | Mietevo',
            description: 'Ausführliche Anleitungen und Hilfe zur Nutzung von Mietevo.',
            url: `${BASE_URL}/hilfe/dokumentation`,
        },
        alternates: {
            canonical: `${BASE_URL}/hilfe/dokumentation`,
        },
    } satisfies Metadata,

    // Datenschutz
    datenschutz: {
        title: 'Datenschutzerklärung',
        description: 'Datenschutzerklärung von Mietevo. Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.',
        robots: {
            index: true,
            follow: true,
        },
        alternates: {
            canonical: `${BASE_URL}/datenschutz`,
        },
    } satisfies Metadata,

    // AGB
    agb: {
        title: 'Allgemeine Geschäftsbedingungen (AGB)',
        description: 'Allgemeine Geschäftsbedingungen für die Nutzung von Mietevo. Rechtliche Rahmenbedingungen für unsere Hausverwaltungssoftware.',
        robots: {
            index: true,
            follow: true,
        },
        alternates: {
            canonical: `${BASE_URL}/agb`,
        },
    } satisfies Metadata,

    // =====================
    // AUTH PAGES
    // =====================

    // Login page - indexed with optimized metadata
    authLogin: {
        title: 'Anmelden | Login zur Hausverwaltungssoftware',
        description: 'Melden Sie sich bei Mietevo an und verwalten Sie Ihre Immobilien. Zugriff auf Betriebskostenabrechnungen, Mieterverwaltung und Finanzen.',
        keywords: [
            'Mietevo Login',
            'Hausverwaltung anmelden',
            'Mietverwaltung Login',
            'Vermieter Software Login',
        ],
        openGraph: {
            title: 'Anmelden | Mietevo Hausverwaltungssoftware',
            description: 'Melden Sie sich an und verwalten Sie Ihre Immobilien professionell.',
            url: `${BASE_URL}/auth/login`,
        },
        alternates: {
            canonical: `${BASE_URL}/auth/login`,
        },
    } satisfies Metadata,

    // Register page - indexed with optimized metadata
    authRegister: {
        title: 'Kostenlos registrieren | Account erstellen',
        description: 'Erstellen Sie Ihr kostenloses Mietevo-Konto. 14 Tage kostenlos testen, keine Kreditkarte erforderlich. Starten Sie jetzt mit der professionellen Immobilienverwaltung.',
        keywords: [
            'Mietevo registrieren',
            'Hausverwaltungssoftware kostenlos',
            'Mietverwaltung testen',
            'Vermieter Software kostenlos testen',
            'Nebenkostenabrechnung kostenlos',
        ],
        openGraph: {
            title: 'Kostenlos registrieren | Mietevo',
            description: '14 Tage kostenlos testen. Keine Kreditkarte erforderlich. Jederzeit kündbar.',
            url: `${BASE_URL}/auth/register`,
        },
        alternates: {
            canonical: `${BASE_URL}/auth/register`,
        },
    } satisfies Metadata,

    // Reset password page - noindex (sensitive)
    authResetPassword: {
        title: 'Passwort zurücksetzen',
        description: 'Setzen Sie Ihr Mietevo-Passwort zurück. Wir senden Ihnen einen Link per E-Mail.',
        robots: {
            index: false,
            follow: false,
            nocache: true,
        },
    } satisfies Metadata,

    // Verify email page - noindex (transient page)
    authVerifyEmail: {
        title: 'E-Mail bestätigen',
        description: 'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Mietevo-Konto zu aktivieren.',
        robots: {
            index: false,
            follow: false,
            nocache: true,
        },
    } satisfies Metadata,

    // Update password page - noindex (sensitive)
    authUpdatePassword: {
        title: 'Neues Passwort festlegen',
        description: 'Legen Sie ein neues Passwort für Ihr Mietevo-Konto fest.',
        robots: {
            index: false,
            follow: false,
            nocache: true,
        },
    } satisfies Metadata,
}
