'use client';

import { Article, ArticleSEO } from '@/types/documentation';
import {
    ArticleJsonLd,
    HowToJsonLd,
    FAQJsonLd,
    BreadcrumbJsonLd
} from '@/components/seo/json-ld';
import { BASE_URL } from '@/lib/constants';

interface DocumentationArticleJsonLdProps {
    article: Article;
}

export function DocumentationArticleJsonLd({ article }: DocumentationArticleJsonLdProps) {
    const seo = article.seo as ArticleSEO | undefined;
    const structuredDataType = seo?.structuredData?.type || 'Article';

    // Helper to strip markdown/HTML for plain text description
    const getPreviewText = (content: string | null, maxLength: number = 160): string => {
        if (!content) return '';
        const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainText.length <= maxLength) return plainText;
        const truncated = plainText.substring(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        return lastSpaceIndex > 0
            ? truncated.substring(0, lastSpaceIndex) + '...'
            : truncated + '...';
    };

    const articleUrl = `${BASE_URL}/hilfe/dokumentation/${article.id}`;
    const categoryUrl = `${BASE_URL}/hilfe/dokumentation?category=${encodeURIComponent(article.kategorie || '')}`;

    return (
        <>
            {/* 1. Breadcrumb Schema */}
            <BreadcrumbJsonLd items={[
                { name: 'Startseite', url: BASE_URL },
                { name: 'Dokumentation', url: `${BASE_URL}/hilfe/dokumentation` },
                { name: article.kategorie || 'Allgemein', url: categoryUrl },
                { name: article.titel, url: articleUrl },
            ]} />

            {/* 2. Structured Data based on type */}
            {structuredDataType === 'HowTo' && seo?.structuredData?.steps && (
                <HowToJsonLd
                    name={seo.title || article.titel}
                    description={seo.description || getPreviewText(article.seiteninhalt)}
                    steps={seo.structuredData.steps.map(step => ({
                        name: step.name,
                        text: step.text
                    }))}
                />
            )}

            {structuredDataType === 'FAQ' && seo?.structuredData?.faqs && (
                <FAQJsonLd faqs={seo.structuredData.faqs} />
            )}

            {/* Always include Article schema as a base if not already using a more specific one, 
          or even alongside HowTo for better coverage */}
            {(structuredDataType === 'Article' || structuredDataType === 'HowTo') && (
                <ArticleJsonLd
                    title={seo?.title || article.titel}
                    description={seo?.description || getPreviewText(article.seiteninhalt)}
                    url={articleUrl}
                    datePublished={article.meta?.created_time || new Date().toISOString()}
                    dateModified={article.meta?.last_edited_time || article.meta?.created_time}
                />
            )}
        </>
    );
}
