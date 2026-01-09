'use client';

import Head from 'next/head';
import { Article } from './documentation-article-list';

interface DocumentationMetaTagsProps {
  article?: Article;
  category?: string;
  searchQuery?: string;
}

function getPreviewText(content: string | null, maxLength: number = 160): string {
  if (!content) return '';

  // Remove HTML tags and normalize whitespace
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  if (plainText.length <= maxLength) return plainText;

  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 0
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}

export function DocumentationMetaTags({
  article,
  category,
  searchQuery
}: DocumentationMetaTagsProps) {
  // Generate dynamic meta content based on context
  let title = 'Dokumentation | Mietevo';
  let description = 'Umfassende Dokumentation und Hilfe für die Mietevo Plattform';
  let canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mietevo.de'}/hilfe/dokumentation`;

  if (article) {
    title = `${article.titel} | Mietevo Dokumentation`;
    description = getPreviewText(article.seiteninhalt) || `Erfahren Sie mehr über ${article.titel} in der Mietevo Dokumentation.`;
    canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mietevo.de'}/hilfe/dokumentation/${article.id}`;
  } else if (searchQuery) {
    title = `Suchergebnisse für "${searchQuery}" | Mietevo Dokumentation`;
    description = `Finden Sie Antworten zu "${searchQuery}" in der Mietevo Dokumentation.`;
    canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mietevo.de'}/hilfe/dokumentation?search=${encodeURIComponent(searchQuery)}`;
  } else if (category) {
    title = `${category} | Mietevo Dokumentation`;
    description = `Alle Artikel in der Kategorie "${category}" der Mietevo Dokumentation.`;
    canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mietevo.de'}/hilfe/dokumentation?category=${encodeURIComponent(category)}`;
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:site_name" content="Mietevo" />
      <meta property="og:locale" content="de_DE" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={canonicalUrl} />

      {/* Article-specific meta tags */}
      {article && (
        <>
          <meta property="article:author" content="Mietevo" />
          {article.kategorie && (
            <meta property="article:section" content={article.kategorie} />
          )}
          {article.meta?.created_time && (
            <meta property="article:published_time" content={article.meta.created_time} />
          )}
          {article.meta?.last_edited_time && (
            <meta property="article:modified_time" content={article.meta.last_edited_time} />
          )}
        </>
      )}

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="Mietevo" />
      <meta name="language" content="de" />
    </Head>
  );
}