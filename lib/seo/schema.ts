/**
 * JSON-LD Structured Data Schemas for SEO
 * 
 * These schemas help search engines understand the content and context of pages,
 * potentially enabling rich snippets in search results.
 */

const BASE_URL = 'https://mietevo.de'
const BRAND_NAME = 'Mietevo'
const LOGO_URL = `${BASE_URL}/favicon.png`
const SUPPORT_EMAIL = 'support@mietevo.de'

/**
 * Organization Schema
 * Helps Google understand your brand/company
 */
export function getOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: BRAND_NAME,
        url: BASE_URL,
        logo: LOGO_URL,
        description: 'Moderne Hausverwaltungssoftware für Vermieter und Hausverwaltungen in Deutschland.',
        foundingDate: '2024',
        founders: [
            {
                '@type': 'Person',
                name: 'Felix Plant',
            },
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            email: SUPPORT_EMAIL,
            contactType: 'customer service',
            availableLanguage: ['German'],
        },
        sameAs: [
            'https://x.com/Mietevo',
            // Add other social media profiles here
        ],
        address: {
            '@type': 'PostalAddress',
            addressCountry: 'DE',
        },
    }
}

/**
 * SoftwareApplication Schema
 * Specifically for software products - helps with rich snippets
 */
export function getSoftwareApplicationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: BRAND_NAME,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Property Management Software',
        operatingSystem: 'Web Browser',
        description: 'Hausverwaltungssoftware für Nebenkostenabrechnungen, Mieterverwaltung und Finanzen. Die moderne Lösung für Vermieter in Deutschland.',
        url: BASE_URL,
        screenshot: `${BASE_URL}/og-image.png`,
        featureList: [
            'Nebenkostenabrechnung erstellen',
            'Mieterverwaltung',
            'Finanzverwaltung',
            'Dokumentenmanagement',
            'Zählerstandserfassung',
            'PDF-Export',
        ],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'EUR',
            description: '14 Tage kostenlos testen',
            availability: 'https://schema.org/OnlineOnly',
        },
        provider: {
            '@type': 'Organization',
            name: BRAND_NAME,
            url: BASE_URL,
        },
        inLanguage: 'de-DE',
    }
}

/**
 * WebSite Schema
 * Helps with sitelinks search box in Google
 */
export function getWebsiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND_NAME,
        url: BASE_URL,
        description: 'Hausverwaltungssoftware für Vermieter und Hausverwaltungen',
        inLanguage: 'de-DE',
        publisher: {
            '@type': 'Organization',
            name: BRAND_NAME,
            url: BASE_URL,
            logo: LOGO_URL,
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BASE_URL}/hilfe/dokumentation?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    }
}

/**
 * FAQ Schema for pricing/features pages
 * Can trigger FAQ rich snippets in search results
 */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    }
}

/**
 * Breadcrumb Schema
 * Shows breadcrumb trail in search results
 */
export function getBreadcrumbSchema(
    items: Array<{ name: string; url: string }>
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }
}

/**
 * Product Schema (for pricing page)
 * Helps with price display in search results
 */
export function getProductSchema(
    name: string,
    description: string,
    price: string,
    priceCurrency = 'EUR'
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        brand: {
            '@type': 'Brand',
            name: BRAND_NAME,
        },
        offers: {
            '@type': 'Offer',
            price,
            priceCurrency,
            availability: 'https://schema.org/OnlineOnly',
            url: `${BASE_URL}/preise`,
            seller: {
                '@type': 'Organization',
                name: BRAND_NAME,
            },
        },
    }
}

/**
 * Article Schema for documentation/blog pages
 */
export function getArticleSchema(
    title: string,
    description: string,
    url: string,
    datePublished: string,
    dateModified?: string
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
            '@type': 'Organization',
            name: BRAND_NAME,
            url: BASE_URL,
        },
        publisher: {
            '@type': 'Organization',
            name: BRAND_NAME,
            url: BASE_URL,
            logo: {
                '@type': 'ImageObject',
                url: LOGO_URL,
            },
        },
        inLanguage: 'de-DE',
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
    }
}

/**
 * HowTo Schema for tutorial/guide pages
 */
export function getHowToSchema(
    name: string,
    description: string,
    steps: Array<{ name: string; text: string }>
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name,
        description,
        step: steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.name,
            text: step.text,
        })),
        inLanguage: 'de-DE',
    }
}

/**
 * Default FAQs for pricing page
 */
export const pricingPageFAQs = [
    {
        question: 'Kann ich Mietevo kostenlos testen?',
        answer: 'Ja, Sie können Mietevo 14 Tage lang kostenlos und unverbindlich testen. Keine Kreditkarte erforderlich.',
    },
    {
        question: 'Gibt es eine Mindestvertragslaufzeit?',
        answer: 'Nein, Sie können monatlich kündigen. Es gibt keine Mindestvertragslaufzeit.',
    },
    {
        question: 'Für wie viele Wohnungen kann ich Mietevo nutzen?',
        answer: 'Die Anzahl der Wohnungen hängt von Ihrem gewählten Tarif ab. Kontaktieren Sie uns für individuelle Lösungen bei größeren Portfolios.',
    },
    {
        question: 'Ist meine Nebenkostenabrechnung rechtssicher?',
        answer: 'Ja, unsere Nebenkostenabrechnungen entsprechen den aktuellen gesetzlichen Anforderungen in Deutschland.',
    },
    {
        question: 'Kann ich meine bestehenden Daten importieren?',
        answer: 'Ja, Sie können Ihre Daten aus Excel oder anderen Systemen importieren. Unser Support hilft Ihnen dabei.',
    },
]
