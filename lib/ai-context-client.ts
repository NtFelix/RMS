import type { Article, Category } from '@/types/documentation';

/**
 * Client-side AI context utilities
 * These functions help prepare context data for AI requests from the client
 */

export interface AIContextOptions {
  useDocumentationContext?: boolean;
  maxArticles?: number;
  maxContentLength?: number;
  searchQuery?: string;
  currentArticleId?: string;
}

export interface AIRequestPayload {
  message: string;
  context?: {
    articles: Article[];
    categories: Category[];
    currentArticleId?: string;
  };
  contextOptions?: AIContextOptions;
  sessionId?: string;
}

/**
 * Prepares an AI request payload with documentation context options
 */
export function prepareAIRequest(
  message: string,
  options: AIContextOptions = {},
  sessionId?: string
): AIRequestPayload {
  const {
    useDocumentationContext = true,
    maxArticles = 10,
    maxContentLength = 1000,
    searchQuery,
    currentArticleId
  } = options;

  return {
    message: message.trim(),
    contextOptions: {
      useDocumentationContext,
      maxArticles,
      maxContentLength,
      searchQuery: searchQuery || message, // Use message as search query if not provided
      currentArticleId
    },
    sessionId
  };
}

/**
 * Prepares an AI request with explicit context (when context is already available)
 */
export function prepareAIRequestWithContext(
  message: string,
  articles: Article[],
  categories: Category[] = [],
  currentArticleId?: string,
  sessionId?: string
): AIRequestPayload {
  return {
    message: message.trim(),
    context: {
      articles,
      categories,
      currentArticleId
    },
    contextOptions: {
      useDocumentationContext: false // Don't fetch additional context
    },
    sessionId
  };
}

/**
 * Filters articles to most relevant ones for the query
 */
export function filterRelevantArticles(
  articles: Article[],
  query: string,
  maxArticles: number = 10
): Article[] {
  if (!query.trim() || articles.length <= maxArticles) {
    return articles.slice(0, maxArticles);
  }

  const queryLower = query.toLowerCase();
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
 * Validates AI request payload
 */
export function validateAIRequest(payload: AIRequestPayload): string[] {
  const errors: string[] = [];

  if (!payload.message || payload.message.trim().length === 0) {
    errors.push('Message is required');
  }

  if (payload.message && payload.message.length > 4000) {
    errors.push('Message is too long (max 4000 characters)');
  }

  if (payload.contextOptions?.maxArticles !== undefined && (payload.contextOptions.maxArticles < 1 || payload.contextOptions.maxArticles > 50)) {
    errors.push('maxArticles must be between 1 and 50');
  }

  if (payload.contextOptions?.maxContentLength !== undefined && (payload.contextOptions.maxContentLength < 100 || payload.contextOptions.maxContentLength > 2000)) {
    errors.push('maxContentLength must be between 100 and 2000');
  }

  return errors;
}

/**
 * Sends AI request to the API
 */
export async function sendAIRequest(payload: AIRequestPayload): Promise<Response> {
  const errors = validateAIRequest(payload);
  if (errors.length > 0) {
    throw new Error(`Invalid request: ${errors.join(', ')}`);
  }

  const response = await fetch('https://backend.mietevo.de', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

/**
 * Processes streaming AI response
 */
export async function processStreamingResponse(
  response: Response,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, metadata?: any) => void,
  onError: (error: string) => void
): Promise<void> {
  if (!response.body) {
    throw new Error('No response body available');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk' && data.content) {
              fullResponse += data.content;
              onChunk(data.content);
            } else if (data.type === 'complete') {
              onComplete(fullResponse, data.usage);
              return;
            } else if (data.type === 'error') {
              onError(data.error || 'Unknown error occurred');
              return;
            }
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error);
    onError('Error reading response stream');
  } finally {
    reader.releaseLock();
  }
}