'use client'

import {
    getOrganizationSchema,
    getSoftwareApplicationSchema,
    getWebsiteSchema,
    getFAQSchema,
    getBreadcrumbSchema,
    getArticleSchema,
    getHowToSchema,
    getProductSchema,
} from '@/lib/seo/schema'
import { ROUTES } from '@/lib/constants'

// Base URL for constructing full URLs
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de'

/**
 * Component to inject JSON-LD structured data into the page
 */
interface JsonLdProps {
    data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    )
}

/**
 * Organization JSON-LD - Use on all pages
 */
export function OrganizationJsonLd() {
    return <JsonLd data={getOrganizationSchema()} />
}

/**
 * Software Application JSON-LD - Use on homepage and feature pages
 */
export function SoftwareApplicationJsonLd() {
    return <JsonLd data={getSoftwareApplicationSchema()} />
}

/**
 * Website JSON-LD - Use on homepage
 */
export function WebsiteJsonLd() {
    return <JsonLd data={getWebsiteSchema()} />
}

/**
 * FAQ JSON-LD - Use on pages with FAQs
 */
interface FAQJsonLdProps {
    faqs: Array<{ question: string; answer: string }>
}

export function FAQJsonLd({ faqs }: FAQJsonLdProps) {
    return <JsonLd data={getFAQSchema(faqs)} />
}

/**
 * Breadcrumb JSON-LD - Use on nested pages
 */
interface BreadcrumbJsonLdProps {
    items: Array<{ name: string; url: string }>
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    return <JsonLd data={getBreadcrumbSchema(items)} />
}

/**
 * Article JSON-LD - Use on documentation/blog articles
 */
interface ArticleJsonLdProps {
    title: string
    description: string
    url: string
    datePublished: string
    dateModified?: string
}

export function ArticleJsonLd({
    title,
    description,
    url,
    datePublished,
    dateModified
}: ArticleJsonLdProps) {
    return (
        <JsonLd
            data={getArticleSchema(title, description, url, datePublished, dateModified)}
        />
    )
}

/**
 * HowTo JSON-LD - Use on tutorial/guide pages
 */
interface HowToJsonLdProps {
    name: string
    description: string
    steps: Array<{ name: string; text: string }>
}

export function HowToJsonLd({ name, description, steps }: HowToJsonLdProps) {
    return <JsonLd data={getHowToSchema(name, description, steps)} />
}

/**
 * Product JSON-LD - Use on pricing page
 */
interface ProductJsonLdProps {
    name: string
    description: string
    price: string
    priceCurrency?: string
}

export function ProductJsonLd({
    name,
    description,
    price,
    priceCurrency = 'EUR'
}: ProductJsonLdProps) {
    return (
        <JsonLd data={getProductSchema(name, description, price, priceCurrency)} />
    )
}

/**
 * Combined Schema for Homepage
 * Includes Organization, Website, and SoftwareApplication schemas
 */
export function HomePageJsonLd() {
    return (
        <>
            <OrganizationJsonLd />
            <WebsiteJsonLd />
            <SoftwareApplicationJsonLd />
        </>
    )
}

export function FeaturePageJsonLd() {
    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
        </>
    )
}

/**
 * Combined Schema for Pricing Page
 * Includes Organization, SoftwareApplication, FAQ, and Breadcrumb schemas
 */
interface PricingPageJsonLdProps {
    faqs: Array<{ question: string; answer: string }>
}

export function PricingPageJsonLd({ faqs }: PricingPageJsonLdProps) {
    const breadcrumbItems = [
        { name: 'Startseite', url: `${BASE_URL}${ROUTES.LANDING}` },
        { name: 'Preise', url: `${BASE_URL}${ROUTES.PRICING}` },
    ]

    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
            <FAQJsonLd faqs={faqs} />
            <BreadcrumbJsonLd items={breadcrumbItems} />
        </>
    )
}

/**
 * Schema for Feature sub-pages with breadcrumbs
 * Use on /funktionen/* pages
 */
interface FeatureSubPageJsonLdProps {
    pageName: string
    pageUrl: string
}

export function FeatureSubPageJsonLd({ pageName, pageUrl }: FeatureSubPageJsonLdProps) {
    // Note: 'Funktionen' points to homepage since there's no /funktionen index page
    const breadcrumbItems = [
        { name: 'Startseite', url: `${BASE_URL}${ROUTES.LANDING}` },
        { name: pageName, url: pageUrl },
    ]

    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={breadcrumbItems} />
        </>
    )
}

/**
 * Schema for Solutions sub-pages with breadcrumbs
 * Use on /loesungen/* pages
 */
interface SolutionSubPageJsonLdProps {
    pageName: string
    pageUrl: string
}

export function SolutionSubPageJsonLd({ pageName, pageUrl }: SolutionSubPageJsonLdProps) {
    // Note: No intermediate 'Lösungen' page exists, so we link directly from homepage
    const breadcrumbItems = [
        { name: 'Startseite', url: `${BASE_URL}${ROUTES.LANDING}` },
        { name: pageName, url: pageUrl },
    ]

    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={breadcrumbItems} />
        </>
    )
}

/**
 * Schema for Documentation pages with breadcrumbs
 */
interface DocsPageJsonLdProps {
    articleTitle?: string
    articleUrl?: string
}

export function DocsPageJsonLd({ articleTitle, articleUrl }: DocsPageJsonLdProps) {
    // Note: No intermediate 'Hilfe' page exists, so we skip it in the breadcrumb
    const breadcrumbItems = [
        { name: 'Startseite', url: `${BASE_URL}${ROUTES.LANDING}` },
        { name: 'Dokumentation', url: `${BASE_URL}/hilfe/dokumentation` },
    ]

    // Add article to breadcrumb if viewing a specific article
    if (articleTitle && articleUrl) {
        breadcrumbItems.push({ name: articleTitle, url: articleUrl })
    }

    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={breadcrumbItems} />
        </>
    )
}
