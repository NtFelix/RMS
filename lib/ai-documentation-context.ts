import { createDocumentationService } from '@/lib/documentation-service';
import type { Article, Category } from '@/types/documentation';

/**
 * Documentation context data structure for AI assistant
 */
export interface DocumentationContextData {
  articles: {
    id: string;
    titel: string;
    kategorie: string | null;
    seiteninhalt: string | null;
  }[];
  categories: Category[];
  totalArticles: number;
}

/**
 * AI request context structure
 */
export interface AIDocumentationContext {
  articles: Article[];
  categories: Category[];
  currentArticleId?: string;
}

/**
 * Context extraction options
 */
export interface ContextExtractionOptions {
  maxArticles?: number;
  maxContentLength?: number;
  includeCategories?: boolean;
  searchQuery?: string;
  currentArticleId?: string;
}

/**
 * Fetches documentation context using DocumentationService
 * This function retrieves all articles and categories from Supabase
 */
export async function fetchDocumentationContext(
  options: ContextExtractionOptions = {}
): Promise<DocumentationContextData> {
  const {
    maxArticles = 50,
    maxContentLength = 1000,
    includeCategories = true,
    searchQuery,
    currentArticleId
  } = options;

  try {
    // Create documentation service instance for server-side usage
    const documentationService = createDocumentationService(true);

    // Fetch articles and categories in parallel
    const [articles, categories] = await Promise.all([
      searchQuery 
        ? documentationService.searchArticles(searchQuery)
        : documentationService.getAllArticles({ limit: maxArticles }),
      includeCategories ? documentationService.getCategories() : Promise.resolve([])
    ]);

    // If we have a current article ID, ensure it's included in the context
    let contextArticles = articles;
    if (currentArticleId) {
      const currentArticle = await documentationService.getArticleById(currentArticleId);
      if (currentArticle && !articles.find(a => a.id === currentArticleId)) {
        contextArticles = [currentArticle, ...articles.slice(0, maxArticles - 1)];
      }
    }

    // Process articles for context extraction
    const processedArticles = extractDocumentationContext(
      contextArticles,
      categories,
      { maxContentLength }
    );

    return {
      articles: processedArticles.articles,
      categories: processedArticles.categories,
      totalArticles: contextArticles.length
    };
  } catch (error) {
    console.error('Error fetching documentation context:', error);
    
    // Return empty context on error to prevent AI assistant from failing
    return {
      articles: [],
      categories: [],
      totalArticles: 0
    };
  }
}

/**
 * Extracts and processes documentation context from Supabase Article and Category data
 * This function transforms the raw data into a format suitable for AI processing
 */
export function extractDocumentationContext(
  articles: Article[],
  categories: Category[],
  options: { maxContentLength?: number } = {}
): DocumentationContextData {
  const { maxContentLength = 1000 } = options;

  // Process articles for AI context
  const processedArticles = articles.map(article => ({
    id: article.id,
    titel: article.titel,
    kategorie: article.kategorie,
    seiteninhalt: article.seiteninhalt 
      ? truncateContent(article.seiteninhalt, maxContentLength)
      : null
  }));

  return {
    articles: processedArticles,
    categories: categories,
    totalArticles: articles.length
  };
}

/**
 * Processes documentation context for inclusion in AI requests
 * This function formats the context data for optimal AI understanding
 */
export function processContextForAI(
  contextData: DocumentationContextData,
  userQuery: string
): AIDocumentationContext {
  // Filter articles based on relevance to user query
  const relevantArticles = filterRelevantArticles(contextData.articles, userQuery);
  
  // Convert to AI context format
  const aiContext: AIDocumentationContext = {
    articles: relevantArticles.map(article => ({
      id: article.id,
      titel: article.titel,
      kategorie: article.kategorie,
      seiteninhalt: article.seiteninhalt,
      meta: {} // Add empty meta object to match Article interface
    })),
    categories: contextData.categories
  };

  return aiContext;
}

/**
 * Filters articles based on relevance to the user query
 */
function filterRelevantArticles(
  articles: DocumentationContextData['articles'],
  userQuery: string,
  maxArticles: number = 10
): DocumentationContextData['articles'] {
  if (!userQuery.trim()) {
    return articles.slice(0, maxArticles);
  }

  const queryLower = userQuery.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);

  // Score articles based on relevance
  const scoredArticles = articles.map(article => {
    let score = 0;
    const titleLower = article.titel.toLowerCase();
    const contentLower = (article.seiteninhalt || '').toLowerCase();
    const categoryLower = (article.kategorie || '').toLowerCase();

    // Title matches get highest score
    queryTerms.forEach(term => {
      if (titleLower.includes(term)) {
        score += 10;
      }
      if (categoryLower.includes(term)) {
        score += 5;
      }
      if (contentLower.includes(term)) {
        score += 2;
      }
    });

    // Exact phrase matches get bonus points
    if (titleLower.includes(queryLower)) {
      score += 20;
    }
    if (contentLower.includes(queryLower)) {
      score += 10;
    }

    return { article, score };
  });

  // Sort by score and return top articles
  return scoredArticles
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxArticles)
    .map(item => item.article);
}

/**
 * Truncates content to specified length while preserving word boundaries
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Find the last space before the max length to avoid cutting words
  const truncated = content.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * Gets context for a specific article and related articles
 */
export async function getArticleContext(
  articleId: string,
  includeRelated: boolean = true
): Promise<DocumentationContextData> {
  try {
    const documentationService = createDocumentationService(true);
    
    // Get the main article
    const article = await documentationService.getArticleById(articleId);
    if (!article) {
      return {
        articles: [],
        categories: [],
        totalArticles: 0
      };
    }

    let articles = [article];
    
    // Get related articles from the same category
    if (includeRelated && article.kategorie) {
      const relatedArticles = await documentationService.getArticlesByCategory(article.kategorie);
      // Add related articles (excluding the main article)
      const otherArticles = relatedArticles.filter(a => a.id !== articleId).slice(0, 5);
      articles = [article, ...otherArticles];
    }

    // Get categories
    const categories = await documentationService.getCategories();

    return extractDocumentationContext(articles, categories);
  } catch (error) {
    console.error('Error getting article context:', error);
    return {
      articles: [],
      categories: [],
      totalArticles: 0
    };
  }
}

/**
 * Gets context based on a search query
 */
export async function getSearchContext(
  searchQuery: string,
  maxResults: number = 10
): Promise<DocumentationContextData> {
  try {
    const contextData = await fetchDocumentationContext({
      maxArticles: maxResults,
      searchQuery: searchQuery,
      includeCategories: true
    });

    return contextData;
  } catch (error) {
    console.error('Error getting search context:', error);
    return {
      articles: [],
      categories: [],
      totalArticles: 0
    };
  }
}