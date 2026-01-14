import { cache } from 'react';
import { Metadata } from 'next';
import { createDocumentationService } from '@/lib/documentation-service';
import type { ArticleSEO } from '@/types/documentation';
import ArticlePageClient from './article-page-client';
import { DocumentationArticleJsonLd } from '@/components/documentation/documentation-json-ld';
import { BASE_URL } from '@/lib/constants';

export const runtime = 'edge';

// Deduplicate database requests using cache
const getArticle = cache(async (id: string) => {
  const documentationService = createDocumentationService(true);
  return await documentationService.getArticleById(id);
});

interface ArticlePageProps {
  params: Promise<{ articleId: string }>;
}

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { articleId } = await params;

  try {
    const article = await getArticle(articleId);

    if (!article) {
      return {
        title: 'Artikel nicht gefunden | Mietevo Dokumentation',
        description: 'Der angeforderte Artikel konnte nicht gefunden werden.',
      };
    }

    const seo = article.seo as ArticleSEO | null;

    // Generate preview text from content
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

    const title = seo?.title || `${article.titel} | Mietevo Dokumentation`;
    const description = seo?.description || getPreviewText(article.seiteninhalt) || `Erfahren Sie mehr über ${article.titel} in der Mietevo Dokumentation.`;
    const canonicalUrl = `${BASE_URL}/hilfe/dokumentation/${article.id}`;

    return {
      title,
      description,
      keywords: seo?.keywords || ['Mietevo', 'Hausverwaltung', 'Dokumentation', article.kategorie || 'Hilfe'],
      openGraph: {
        title: seo?.og?.title || title,
        description: seo?.og?.description || description,
        url: canonicalUrl,
        type: 'article',
        siteName: 'Mietevo',
        locale: 'de_DE',
        images: seo?.og?.image ? [{ url: seo.og.image }] : undefined,
        publishedTime: article.meta?.created_time,
        modifiedTime: article.meta?.last_edited_time || article.meta?.created_time,
        section: article.kategorie || undefined,
        authors: ['Mietevo'],
      },
      twitter: {
        card: 'summary_large_image',
        title: seo?.og?.title || title,
        description: seo?.og?.description || description,
        images: seo?.og?.image ? [seo.og.image] : undefined,
      },
      robots: {
        index: !seo?.noIndex,
        follow: !seo?.noIndex,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Dokumentation | Mietevo',
      description: 'Mietevo Dokumentation',
    };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { articleId } = await params;
  const article = await getArticle(articleId);

  if (!article) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold">Artikel nicht gefunden</h1>
        <p className="mt-4 text-muted-foreground">Der angeforderte Artikel konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <>
      <DocumentationArticleJsonLd article={article} />
      <ArticlePageClient article={article} />
    </>
  );
}