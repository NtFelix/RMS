import { Metadata } from 'next';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ArticlePageClient from './article-page-client';

export const runtime = 'edge';

interface ArticlePageProps {
  params: Promise<{ articleId: string }>;
}

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { articleId } = await params;
  
  try {
    const supabase = await createSupabaseServerClient();
    const { data: article } = await supabase
      .from('Dokumentation')
      .select('id, titel, kategorie, seiteninhalt, meta')
      .eq('id', articleId)
      .single();

    if (!article) {
      return {
        title: 'Artikel nicht gefunden | Mietfluss Dokumentation',
        description: 'Der angeforderte Artikel konnte nicht gefunden werden.',
      };
    }

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

    const title = `${article.titel} | Mietfluss Dokumentation`;
    const description = getPreviewText(article.seiteninhalt) || `Erfahren Sie mehr über ${article.titel} in der Mietfluss Dokumentation.`;
    const canonicalUrl = `https://mietfluss.de/dokumentation/${article.id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'article',
        siteName: 'Mietfluss',
        locale: 'de_DE',
        publishedTime: article.meta?.created_time,
        modifiedTime: article.meta?.last_edited_time,
        section: article.kategorie || undefined,
        authors: ['Mietfluss'],
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Dokumentation | Mietfluss',
      description: 'Mietfluss Dokumentation',
    };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { articleId } = await params;
  return <ArticlePageClient articleId={articleId} />;
}