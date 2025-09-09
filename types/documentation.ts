/**
 * TypeScript interfaces for the Dokumentation table and related types
 */

export interface DokumentationRecord {
  id: string;
  titel: string;
  kategorie: string | null;
  seiteninhalt: string | null;
  meta: Record<string, any> | null;
}

export interface Category {
  name: string;
  articleCount: number;
}

export interface Article {
  id: string;
  titel: string;
  kategorie: string;
  seiteninhalt: string;
  meta: Record<string, any>;
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