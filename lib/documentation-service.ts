import { 
  createDocumentationQueryBuilder, 
  getDocumentationClient, 
  getDocumentationServerClient 
} from '@/lib/supabase/documentation-client';
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
  private queryBuilder: ReturnType<typeof createDocumentationQueryBuilder>;

  constructor(isServer = false) {
    const client = isServer ? getDocumentationServerClient() : getDocumentationClient();
    this.queryBuilder = createDocumentationQueryBuilder(client);
  }

  /**
   * Get all unique categories with article counts
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await this.queryBuilder.getCategories();
      
      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
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
      })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(kategorie: string): Promise<Article[]> {
    try {
      const { data, error } = await this.queryBuilder.getByCategory(kategorie);
      
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
      // Use the custom search function for better ranking
      const { data, error } = await this.queryBuilder.searchWithRanking(query.trim());
      
      if (error) {
        throw new Error(`Failed to search articles: ${error.message}`);
      }

      return (data || []).map(record => ({
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
    try {
      const { data, error } = await this.queryBuilder.getById(id);
      
      if (error) {
        throw new Error(`Failed to fetch article ${id}: ${error.message}`);
      }

      return data ? this.transformRecordToArticle(data) : null;
    } catch (error) {
      console.error(`Error fetching article ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all articles with optional filtering
   */
  async getAllArticles(filters: DocumentationFilters = {}): Promise<Article[]> {
    try {
      let query = this.queryBuilder.getAll();

      // Apply category filter
      if (filters.kategorie) {
        query = this.queryBuilder.getByCategory(filters.kategorie);
      }

      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      let articles = this.transformRecordsToArticles(data || []);

      // Apply search filter if provided
      if (filters.searchQuery) {
        const searchResults = await this.searchArticles(filters.searchQuery);
        articles = searchResults;
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
      throw error;
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
      meta: record.meta || {}
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
      const { data, error } = await this.queryBuilder.search(query);
      
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