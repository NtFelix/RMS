import { createDocumentationService } from '@/lib/documentation-service';
import { getAICache } from '@/lib/ai-cache';
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
 * Fetches documentation context using DocumentationService with caching
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

  // Generate cache key for this context request
  const aiCache = getAICache();
  const contextCacheKey = aiCache.generateContextCacheKey({
    searchQuery,
    articleId: currentArticleId,
    maxArticles,
    maxContentLength,
    includeCategories,
  });

  // Try to get from cache first
  const cachedContext = aiCache.getCachedDocumentationContext(contextCacheKey);
  if (cachedContext) {
    console.log('Using cached documentation context');
    return cachedContext;
  }

  try {
    const startTime = performance.now();
    
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

    const result: DocumentationContextData = {
      articles: processedArticles.articles,
      categories: processedArticles.categories,
      totalArticles: contextArticles.length
    };

    // Cache the result
    const loadTime = performance.now() - startTime;
    aiCache.cacheDocumentationContext(contextCacheKey, result, {
      searchQuery,
      articleId: currentArticleId,
      maxArticles,
      maxContentLength,
    });

    console.log(`Fetched and cached documentation context in ${Math.round(loadTime)}ms`);
    return result;
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
 * Gets context for a specific article and related articles with caching
 */
export async function getArticleContext(
  articleId: string,
  includeRelated: boolean = true
): Promise<DocumentationContextData> {
  // Generate cache key for article context
  const aiCache = getAICache();
  const contextCacheKey = aiCache.generateContextCacheKey({
    articleId,
    maxArticles: includeRelated ? 6 : 1, // Main article + 5 related
    maxContentLength: 1000,
    includeCategories: true,
  });

  // Try to get from cache first
  const cachedContext = aiCache.getCachedDocumentationContext(contextCacheKey);
  if (cachedContext) {
    console.log(`Using cached article context for ${articleId}`);
    return cachedContext;
  }

  try {
    const startTime = performance.now();
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

    const result = extractDocumentationContext(articles, categories);

    // Cache the result
    const loadTime = performance.now() - startTime;
    aiCache.cacheDocumentationContext(contextCacheKey, result, {
      articleId,
      maxArticles: includeRelated ? 6 : 1,
      maxContentLength: 1000,
    });

    console.log(`Fetched and cached article context for ${articleId} in ${Math.round(loadTime)}ms`);
    return result;
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
 * Gets context based on a search query with caching
 */
export async function getSearchContext(
  searchQuery: string,
  maxResults: number = 10
): Promise<DocumentationContextData> {
  try {
    // Use the main fetchDocumentationContext function which already has caching
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

/**
 * Error tracking utilities for AI assistant
 */
export interface AIErrorDetails {
  errorType: string;
  errorCode: string;
  errorMessage: string;
  httpStatus?: number;
  retryable: boolean;
  failureStage: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Categorizes errors for consistent tracking across client and server
 */
export function categorizeAIError(error: Error | string, context?: any): AIErrorDetails {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();
  
  // Network errors
  if (errorLower.includes('network') || errorLower.includes('fetch') || 
      errorLower.includes('econnreset') || errorLower.includes('etimedout')) {
    return {
      errorType: 'network_error',
      errorCode: 'NETWORK_ERROR',
      errorMessage: errorMessage,
      httpStatus: 0,
      retryable: true,
      failureStage: 'network',
      ...context
    };
  }
  
  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('quota') || 
      errorLower.includes('429') || errorMessage.includes('429')) {
    return {
      errorType: 'rate_limit',
      errorCode: 'RATE_LIMIT',
      errorMessage: errorMessage,
      httpStatus: 429,
      retryable: true,
      failureStage: 'api_limit',
      ...context
    };
  }
  
  // Authentication errors
  if (errorLower.includes('api key') || errorLower.includes('authentication') || 
      errorLower.includes('unauthorized') || errorLower.includes('401')) {
    return {
      errorType: 'authentication_error',
      errorCode: 'AUTHENTICATION_ERROR',
      errorMessage: errorMessage,
      httpStatus: 401,
      retryable: false,
      failureStage: 'authentication',
      ...context
    };
  }
  
  // Server errors
  if (errorLower.includes('500') || errorLower.includes('internal server') || 
      errorLower.includes('server error')) {
    return {
      errorType: 'server_error',
      errorCode: 'SERVER_ERROR',
      errorMessage: errorMessage,
      httpStatus: 500,
      retryable: true,
      failureStage: 'server',
      ...context
    };
  }
  
  // Gemini API specific errors
  if (errorLower.includes('safety') || errorLower.includes('content policy')) {
    return {
      errorType: 'content_safety_error',
      errorCode: 'CONTENT_SAFETY_ERROR',
      errorMessage: errorMessage,
      httpStatus: 400,
      retryable: false,
      failureStage: 'content_filter',
      ...context
    };
  }
  
  // Model overloaded
  if (errorLower.includes('overloaded') || errorLower.includes('503')) {
    return {
      errorType: 'model_overloaded',
      errorCode: 'MODEL_OVERLOADED',
      errorMessage: errorMessage,
      httpStatus: 503,
      retryable: true,
      failureStage: 'model_capacity',
      ...context
    };
  }
  
  // Timeout errors
  if (errorLower.includes('timeout')) {
    return {
      errorType: 'timeout_error',
      errorCode: 'TIMEOUT_ERROR',
      errorMessage: errorMessage,
      httpStatus: 408,
      retryable: true,
      failureStage: 'timeout',
      ...context
    };
  }
  
  // Validation errors
  if (errorLower.includes('validation') || errorLower.includes('invalid request')) {
    return {
      errorType: 'validation_error',
      errorCode: 'VALIDATION_ERROR',
      errorMessage: errorMessage,
      httpStatus: 400,
      retryable: false,
      failureStage: 'validation',
      ...context
    };
  }
  
  // Generic API error
  return {
    errorType: 'api_error',
    errorCode: 'GEMINI_API_ERROR',
    errorMessage: errorMessage,
    httpStatus: 500,
    retryable: true,
    failureStage: 'api',
    ...context
  };
}

/**
 * Tracks AI request failures with PostHog (client-side)
 */
export function trackAIRequestFailure(
  posthog: any,
  errorDetails: AIErrorDetails,
  requestContext?: {
    sessionId?: string;
    responseTimeMs?: number;
    questionLength?: number;
    hasContext?: boolean;
    contextArticlesCount?: number;
    messageCount?: number;
  }
) {
  if (!posthog || !posthog.has_opted_in_capturing?.()) {
    return;
  }

  posthog.capture('ai_request_failed', {
    ...errorDetails,
    response_time_ms: requestContext?.responseTimeMs || 0,
    session_id: requestContext?.sessionId || errorDetails.sessionId,
    question_length: requestContext?.questionLength || 0,
    has_context: requestContext?.hasContext || false,
    context_articles_count: requestContext?.contextArticlesCount || 0,
    message_count: requestContext?.messageCount || 0,
    timestamp: new Date().toISOString(),
    ...errorDetails.additionalData
  });
}