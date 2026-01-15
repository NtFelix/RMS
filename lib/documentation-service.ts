import {
  createDocumentationQueryBuilder,
  getDocumentationClient,
  getDocumentationServerClient,
  getPublicDocumentationClient
} from '@/lib/supabase/documentation-client';
import { naturalSort } from '@/lib/utils';
import type {
  Article,
  Category,
  DokumentationRecord,
  DocumentationFilters,
  SearchResult
} from '@/types/documentation';

/**
 * Service class for documentation operations
 */
export class DocumentationService {
  private queryBuilder: ReturnType<typeof createDocumentationQueryBuilder> | null = null;
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
  }

  private async getQueryBuilder() {
    if (!this.queryBuilder) {
      // For public documentation, we prefer a cookie-less client on the server to avoid SEO issues
      const client = this.isServer ? getPublicDocumentationClient() : getDocumentationClient();
      this.queryBuilder = createDocumentationQueryBuilder(client);
    }
    return this.queryBuilder;
  }

  /**
   * Get all unique categories with article counts
   */
  async getCategories(): Promise<Category[]> {
    try {
      const queryBuilder = await this.getQueryBuilder();
      const { data, error } = await queryBuilder.getCategories();

      if (error) {
        console.error('Database error in getCategories:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Count articles per category
      const categoryMap = new Map<string, number>();

      for (const item of data) {
        if (item.kategorie) {
          categoryMap.set(item.kategorie, (categoryMap.get(item.kategorie) || 0) + 1);
        }
      }

      return Array.from(categoryMap.entries()).map(([name, articleCount]) => ({
        name,
        articleCount
      })).sort((a, b) => naturalSort(a.name, b.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(kategorie: string): Promise<Article[]> {
    try {
      const queryBuilder = await this.getQueryBuilder();
      const { data, error } = await queryBuilder.getByCategory(kategorie);

      if (error) {
        throw new Error(`Failed to fetch articles for category ${kategorie}: ${error.message}`);
      }

      return this.transformRecordsToArticles(data || []);
    } catch (error) {
      console.error(`Error fetching articles for category ${kategorie}:`, error);
      throw error;
    }
  }

  /**
   * Search articles by query string
   */
  async searchArticles(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const queryBuilder = await this.getQueryBuilder();
      // Use the custom search function for better ranking
      const { data, error } = await queryBuilder.searchWithRanking(query.trim());

      if (error) {
        throw new Error(`Failed to search articles: ${error.message}`);
      }

      // Ensure data is an array before mapping
      if (!Array.isArray(data)) {
        console.error('Search returned non-array data:', data);
        return [];
      }

      return data.map(record => ({
        ...this.transformRecordToArticle(record),
        relevanceScore: record.relevance_score,
        highlightedTitle: this.highlightText(record.titel, query),
        highlightedContent: this.highlightText(
          record.seiteninhalt?.substring(0, 200) || '',
          query
        )
      }));
    } catch (error) {
      console.error('Error searching articles:', error);
      // Fallback to basic search if advanced search fails
      return this.fallbackSearch(query);
    }
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: string): Promise<Article | null> {
    // Basic UUID validation to prevent Postgres errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn(`Invalid article search ID skipped: ${id}`);
      return null;
    }

    try {
      const queryBuilder = await this.getQueryBuilder();
      const { data, error } = await queryBuilder.getById(id);

      if (error) {
        // If it's a 406 or similar, it's just not found
        console.error(`Database error fetching article ${id}:`, error.message);
        return null;
      }

      // Ensure data is a valid record before transforming
      if (!data || typeof data !== 'object' || 'Error' in data) {
        return null;
      }

      return this.transformRecordToArticle(data);
    } catch (error) {
      console.error(`Unexpected error fetching article ${id}:`, error);
      return null; // Return null instead of throwing to prevent 500s
    }
  }

  /**
   * Get all articles with optional filtering
   */
  async getAllArticles(filters: DocumentationFilters = {}): Promise<Article[]> {
    try {
      const queryBuilder = await this.getQueryBuilder();
      let query = queryBuilder.getAll();

      // Apply category filter
      if (filters.kategorie) {
        query = queryBuilder.getByCategory(filters.kategorie);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error in getAllArticles:', error);
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }

      let articles = this.transformRecordsToArticles(data || []);

      // Apply search filter if provided
      if (filters.searchQuery) {
        try {
          const searchResults = await this.searchArticles(filters.searchQuery);
          articles = searchResults;
        } catch (searchError) {
          console.error('Search error, falling back to basic filter:', searchError);
          // Fallback to basic text filtering
          articles = articles.filter(article =>
            article.titel.toLowerCase().includes(filters.searchQuery!.toLowerCase()) ||
            (article.seiteninhalt && article.seiteninhalt.toLowerCase().includes(filters.searchQuery!.toLowerCase()))
          );
        }
      }

      // Apply pagination
      if (filters.offset !== undefined || filters.limit !== undefined) {
        const start = filters.offset || 0;
        const end = filters.limit ? start + filters.limit : undefined;
        articles = articles.slice(start, end);
      }

      return articles;
    } catch (error) {
      console.error('Error fetching all articles:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Transform database records to Article objects
   */
  private transformRecordsToArticles(records: DokumentationRecord[]): Article[] {
    return records
      .filter(record => record.titel) // Ensure we have a title
      .map(record => this.transformRecordToArticle(record));
  }

  /**
   * Transform single database record to Article object
   */
  private transformRecordToArticle(record: DokumentationRecord): Article {
    return {
      id: record.id,
      titel: record.titel,
      kategorie: record.kategorie || 'Uncategorized',
      seiteninhalt: record.seiteninhalt || '',
      meta: record.meta || {},
      seo: record.seo || null
    };
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, query: string): string {
    if (!text || !query) return text;

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    let highlightedText = text;

    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }

  /**
   * Fallback search using basic text matching
   */
  private async fallbackSearch(query: string): Promise<SearchResult[]> {
    try {
      const queryBuilder = await this.getQueryBuilder();
      const { data, error } = await queryBuilder.search(query);

      if (error) {
        throw error;
      }

      return (data || []).map(record => ({
        ...this.transformRecordToArticle(record),
        highlightedTitle: this.highlightText(record.titel, query),
        highlightedContent: this.highlightText(
          record.seiteninhalt?.substring(0, 200) || '',
          query
        )
      }));
    } catch (error) {
      console.error('Fallback search failed:', error);
      return [];
    }
  }
}

/**
 * Create a new DocumentationService instance
 */
export function createDocumentationService(isServer = false): DocumentationService {
  return new DocumentationService(isServer);
}

/**
 * Singleton instances for common usage
 */
export const documentationService = new DocumentationService(false);
export const serverDocumentationService = new DocumentationService(true);