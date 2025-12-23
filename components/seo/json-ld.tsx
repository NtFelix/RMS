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

/**
 * Combined Schema for Feature Pages
 * Includes Organization and SoftwareApplication schemas
 */
export function FeaturePageJsonLd() {
    return (
        <>
            <OrganizationJsonLd />
            <SoftwareApplicationJsonLd />
        </>
    )
}
