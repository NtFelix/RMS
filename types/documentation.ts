/**
 * TypeScript interfaces for the Dokumentation table and related types
 */

export interface ArticleSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  og?: {
    title?: string;
    description?: string;
    image?: string;
  };
  structuredData?: {
    type: 'Article' | 'HowTo' | 'FAQ';
    steps?: Array<{ name: string; text: string }>;
    faqs?: Array<{ question: string; answer: string }>;
  };
  noIndex?: boolean;
}

export interface DokumentationRecord {
  id: string;
  titel: string;
  kategorie: string | null;
  seiteninhalt: string | null;
  meta: Record<string, any> | null;
  seo: ArticleSEO | null;
}

export interface Category {
  name: string;
  articleCount: number;
}

export interface Article {
  id: string;
  titel: string;
  kategorie: string | null;
  seiteninhalt: string | null;
  meta: Record<string, any> | null;
  seo?: ArticleSEO | null;
}

export interface SearchResult extends Article {
  relevanceScore?: number;
  highlightedTitle?: string;
  highlightedContent?: string;
}

export interface DocumentationFilters {
  kategorie?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
  lastSyncTime: string;
}