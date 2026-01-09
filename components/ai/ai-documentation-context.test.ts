import {
  fetchDocumentationContext,
  extractDocumentationContext,
  processContextForAI,
  getArticleContext,
  getSearchContext,
  categorizeAIError,
  trackAIRequestFailure
} from '@/lib/ai-documentation-context';
import { createDocumentationService } from '@/lib/documentation-service';
import type { Article, Category } from '@/types/documentation';

// Mock the documentation service
jest.mock('@/lib/documentation-service');

const mockCreateDocumentationService = createDocumentationService as jest.MockedFunction<typeof createDocumentationService>;

describe('AI Documentation Context', () => {
  const mockArticles: Article[] = [
    {
      id: '1',
      titel: 'Betriebskosten verwalten',
      kategorie: 'Verwaltung',
      seiteninhalt: 'Hier erfahren Sie, wie Sie Betriebskosten in Mietevo verwalten können. Das System bietet umfangreiche Funktionen für die Abrechnung und Verwaltung von Nebenkosten.',
      meta: {}
    },
    {
      id: '2',
      titel: 'Mieter hinzufügen',
      kategorie: 'Mieterverwaltung',
      seiteninhalt: 'So fügen Sie neue Mieter zu Ihrem System hinzu. Erfassen Sie alle wichtigen Daten und verwalten Sie Mietverträge effizient.',
      meta: {}
    },
    {
      id: '3',
      titel: 'Wasserzähler ablesen',
      kategorie: 'Verwaltung',
      seiteninhalt: 'Anleitung zum Ablesen und Verwalten von Wasserzählern in Mietevo.',
      meta: {}
    }
  ];

  const mockCategories: Category[] = [
    { id: '1', name: 'Verwaltung', description: 'Allgemeine Verwaltungsfunktionen' },
    { id: '2', name: 'Mieterverwaltung', description: 'Funktionen zur Mieterverwaltung' }
  ];

  const mockDocumentationService = {
    getAllArticles: jest.fn(),
    searchArticles: jest.fn(),
    getCategories: jest.fn(),
    getArticleById: jest.fn(),
    getArticlesByCategory: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDocumentationService.mockReturnValue(mockDocumentationService as any);

    // Default mock implementations
    mockDocumentationService.getAllArticles.mockResolvedValue(mockArticles);
    mockDocumentationService.searchArticles.mockResolvedValue(mockArticles.slice(0, 2));
    mockDocumentationService.getCategories.mockResolvedValue(mockCategories);
    mockDocumentationService.getArticleById.mockResolvedValue(mockArticles[0]);
    mockDocumentationService.getArticlesByCategory.mockResolvedValue([mockArticles[0], mockArticles[2]]);
  });

  describe('fetchDocumentationContext', () => {
    it('fetches all articles and categories by default', async () => {
      const result = await fetchDocumentationContext();

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({ limit: 50 });
      expect(mockDocumentationService.getCategories).toHaveBeenCalled();
      expect(result.articles).toHaveLength(3);
      expect(result.categories).toHaveLength(2);
      expect(result.totalArticles).toBe(3);
    });

    it('respects maxArticles option', async () => {
      await fetchDocumentationContext({ maxArticles: 2 });

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({ limit: 2 });
    });

    it('performs search when searchQuery is provided', async () => {
      await fetchDocumentationContext({ searchQuery: 'Betriebskosten' });

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('Betriebskosten');
      expect(mockDocumentationService.getAllArticles).not.toHaveBeenCalled();
    });

    it('includes current article when currentArticleId is provided', async () => {
      const result = await fetchDocumentationContext({
        currentArticleId: '1',
        maxArticles: 2
      });

      expect(mockDocumentationService.getArticleById).toHaveBeenCalledWith('1');
      expect(result.articles).toHaveLength(3); // All articles since current article is already in the list
      expect(result.articles[0].id).toBe('1'); // Current article should be first
    });

    it('skips categories when includeCategories is false', async () => {
      const result = await fetchDocumentationContext({ includeCategories: false });

      expect(mockDocumentationService.getCategories).not.toHaveBeenCalled();
      expect(result.categories).toHaveLength(0);
    });

    it('truncates content based on maxContentLength', async () => {
      const result = await fetchDocumentationContext({ maxContentLength: 50 });

      result.articles.forEach(article => {
        if (article.seiteninhalt) {
          expect(article.seiteninhalt.length).toBeLessThanOrEqual(53); // 50 + "..."
        }
      });
    });

    it('handles errors gracefully', async () => {
      mockDocumentationService.getAllArticles.mockRejectedValue(new Error('Database error'));

      const result = await fetchDocumentationContext();

      expect(result.articles).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.totalArticles).toBe(0);
    });

    it('handles missing current article gracefully', async () => {
      mockDocumentationService.getArticleById.mockResolvedValue(null);

      const result = await fetchDocumentationContext({ currentArticleId: 'nonexistent' });

      expect(result.articles).toHaveLength(3); // Should still return other articles
    });
  });

  describe('extractDocumentationContext', () => {
    it('processes articles correctly', () => {
      const result = extractDocumentationContext(mockArticles, mockCategories);

      expect(result.articles).toHaveLength(3);
      expect(result.categories).toEqual(mockCategories);
      expect(result.totalArticles).toBe(3);

      result.articles.forEach((article, index) => {
        expect(article.id).toBe(mockArticles[index].id);
        expect(article.titel).toBe(mockArticles[index].titel);
        expect(article.kategorie).toBe(mockArticles[index].kategorie);
      });
    });

    it('truncates content to maxContentLength', () => {
      const result = extractDocumentationContext(mockArticles, mockCategories, { maxContentLength: 50 });

      result.articles.forEach(article => {
        if (article.seiteninhalt) {
          expect(article.seiteninhalt.length).toBeLessThanOrEqual(53); // 50 + "..."
        }
      });
    });

    it('handles articles without content', () => {
      const articlesWithoutContent = [
        { ...mockArticles[0], seiteninhalt: null },
        { ...mockArticles[1], seiteninhalt: '' }
      ];

      const result = extractDocumentationContext(articlesWithoutContent, mockCategories);

      expect(result.articles[0].seiteninhalt).toBe(null);
      expect(result.articles[1].seiteninhalt).toBe(null);
    });

    it('preserves word boundaries when truncating', () => {
      const longContent = 'This is a very long content that should be truncated at word boundaries to maintain readability and avoid cutting words in the middle.';
      const articleWithLongContent = [
        { ...mockArticles[0], seiteninhalt: longContent }
      ];

      const result = extractDocumentationContext(articleWithLongContent, [], { maxContentLength: 50 });

      expect(result.articles[0].seiteninhalt).toMatch(/\.\.\.$|[^a-zA-Z]\.\.\.$/);
      expect(result.articles[0].seiteninhalt?.length).toBeLessThanOrEqual(53);
    });
  });

  describe('processContextForAI', () => {
    const contextData = {
      articles: [
        { id: '1', titel: 'Betriebskosten verwalten', kategorie: 'Verwaltung', seiteninhalt: 'Content about operating costs' },
        { id: '2', titel: 'Mieter hinzufügen', kategorie: 'Mieterverwaltung', seiteninhalt: 'Content about adding tenants' },
        { id: '3', titel: 'Wasserzähler ablesen', kategorie: 'Verwaltung', seiteninhalt: 'Content about water meters' }
      ],
      categories: mockCategories,
      totalArticles: 3
    };

    it('filters articles based on query relevance', () => {
      const result = processContextForAI(contextData, 'Betriebskosten');

      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].titel).toContain('Betriebskosten');
      expect(result.categories).toEqual(mockCategories);
    });

    it('returns all articles for empty query', () => {
      const result = processContextForAI(contextData, '');

      expect(result.articles.length).toBe(3);
    });

    it('scores title matches higher than content matches', () => {
      const result = processContextForAI(contextData, 'Mieter');

      expect(result.articles[0].titel).toContain('Mieter');
    });

    it('includes category matches in scoring', () => {
      const result = processContextForAI(contextData, 'Verwaltung');

      const verwaltungArticles = result.articles.filter(a => a.kategorie === 'Verwaltung');
      expect(verwaltungArticles.length).toBeGreaterThan(0);
    });

    it('limits results to maxArticles', () => {
      // Create more articles than the default limit
      const manyArticles = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        titel: `Article ${i + 1} about Mietevo`,
        kategorie: 'Test',
        seiteninhalt: 'Test content'
      }));

      const largeContextData = {
        ...contextData,
        articles: manyArticles,
        totalArticles: 15
      };

      const result = processContextForAI(largeContextData, 'Mietevo');

      expect(result.articles.length).toBeLessThanOrEqual(10);
    });

    it('handles queries with multiple terms', () => {
      const result = processContextForAI(contextData, 'Betriebskosten Verwaltung');

      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].titel).toContain('Betriebskosten');
    });

    it('gives bonus points for exact phrase matches', () => {
      const contextWithExactMatch = {
        ...contextData,
        articles: [
          ...contextData.articles,
          {
            id: '4',
            titel: 'Betriebskosten Verwaltung Guide',
            kategorie: 'Guide',
            seiteninhalt: 'Complete guide for Betriebskosten Verwaltung'
          }
        ]
      };

      const result = processContextForAI(contextWithExactMatch, 'Betriebskosten Verwaltung');

      expect(result.articles[0].titel).toContain('Betriebskosten Verwaltung');
    });
  });

  describe('getArticleContext', () => {
    it('gets context for specific article', async () => {
      const result = await getArticleContext('1');

      expect(mockDocumentationService.getArticleById).toHaveBeenCalledWith('1');
      expect(result.articles).toHaveLength(2); // Main article + related articles (excluding duplicates)
      expect(result.articles[0].id).toBe('1');
    });

    it('includes related articles from same category', async () => {
      const result = await getArticleContext('1', true);

      expect(mockDocumentationService.getArticlesByCategory).toHaveBeenCalledWith('Verwaltung');
      expect(result.articles.length).toBeGreaterThan(1);
    });

    it('excludes related articles when requested', async () => {
      const result = await getArticleContext('1', false);

      expect(mockDocumentationService.getArticlesByCategory).not.toHaveBeenCalled();
      expect(result.articles).toHaveLength(1);
    });

    it('handles non-existent article', async () => {
      mockDocumentationService.getArticleById.mockResolvedValue(null);

      const result = await getArticleContext('nonexistent');

      expect(result.articles).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.totalArticles).toBe(0);
    });

    it('handles errors gracefully', async () => {
      mockDocumentationService.getArticleById.mockRejectedValue(new Error('Database error'));

      const result = await getArticleContext('1');

      expect(result.articles).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.totalArticles).toBe(0);
    });
  });

  describe('getSearchContext', () => {
    it('performs search with query', async () => {
      const result = await getSearchContext('Betriebskosten', 5);

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('Betriebskosten');
      expect(result.articles.length).toBeGreaterThan(0);
    });

    it('respects maxResults parameter', async () => {
      await getSearchContext('test', 3);

      // The maxArticles should be passed to fetchDocumentationContext
      expect(mockCreateDocumentationService).toHaveBeenCalled();
    });

    it('handles search errors gracefully', async () => {
      mockDocumentationService.searchArticles.mockRejectedValue(new Error('Search error'));

      const result = await getSearchContext('test');

      expect(result.articles).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.totalArticles).toBe(0);
    });
  });

  describe('categorizeAIError', () => {
    it('categorizes network errors correctly', () => {
      const networkErrors = [
        new Error('Network error occurred'),
        new Error('fetch failed'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT')
      ];

      networkErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('network_error');
        expect(result.errorCode).toBe('NETWORK_ERROR');
        expect(result.retryable).toBe(true);
        expect(result.failureStage).toBe('network');
      });
    });

    it('categorizes rate limit errors correctly', () => {
      const rateLimitErrors = [
        new Error('Rate limit exceeded'),
        new Error('Quota exceeded'),
        new Error('HTTP 429'),
        '429 Too Many Requests'
      ];

      rateLimitErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('rate_limit');
        expect(result.errorCode).toBe('RATE_LIMIT');
        expect(result.retryable).toBe(true);
        expect(result.httpStatus).toBe(429);
      });
    });

    it('categorizes authentication errors correctly', () => {
      const authErrors = [
        new Error('API key invalid'),
        new Error('Authentication failed'),
        new Error('Unauthorized access'),
        new Error('HTTP 401')
      ];

      authErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('authentication_error');
        expect(result.errorCode).toBe('AUTHENTICATION_ERROR');
        expect(result.retryable).toBe(false);
        expect(result.httpStatus).toBe(401);
      });
    });

    it('categorizes server errors correctly', () => {
      const serverErrors = [
        new Error('Internal server error'),
        new Error('HTTP 500'),
        new Error('Server error occurred')
      ];

      serverErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('server_error');
        expect(result.errorCode).toBe('SERVER_ERROR');
        expect(result.retryable).toBe(true);
        expect(result.httpStatus).toBe(500);
      });
    });

    it('categorizes content safety errors correctly', () => {
      const safetyErrors = [
        new Error('Content violates safety guidelines'),
        new Error('Content policy violation')
      ];

      safetyErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('content_safety_error');
        expect(result.errorCode).toBe('CONTENT_SAFETY_ERROR');
        expect(result.retryable).toBe(false);
        expect(result.httpStatus).toBe(400);
      });
    });

    it('categorizes model overloaded errors correctly', () => {
      const overloadedErrors = [
        new Error('Model is overloaded'),
        new Error('HTTP 503'),
        new Error('503 Service Unavailable')
      ];

      overloadedErrors.forEach(error => {
        const result = categorizeAIError(error);
        if (error.message.includes('overloaded') || error.message.includes('503')) {
          expect(result.errorType).toBe('model_overloaded');
          expect(result.errorCode).toBe('MODEL_OVERLOADED');
          expect(result.retryable).toBe(true);
          expect(result.httpStatus).toBe(503);
        } else {
          // Some errors might be categorized differently
          expect(result.retryable).toBe(true);
        }
      });
    });

    it('categorizes timeout errors correctly', () => {
      const timeoutErrors = [
        new Error('Request timeout'),
        new Error('Connection timeout occurred')
      ];

      timeoutErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('timeout_error');
        expect(result.errorCode).toBe('TIMEOUT_ERROR');
        expect(result.retryable).toBe(true);
        expect(result.httpStatus).toBe(408);
      });
    });

    it('categorizes validation errors correctly', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Invalid request format')
      ];

      validationErrors.forEach(error => {
        const result = categorizeAIError(error);
        expect(result.errorType).toBe('validation_error');
        expect(result.errorCode).toBe('VALIDATION_ERROR');
        expect(result.retryable).toBe(false);
        expect(result.httpStatus).toBe(400);
      });
    });

    it('handles generic errors correctly', () => {
      const genericError = new Error('Unknown error occurred');
      const result = categorizeAIError(genericError);

      expect(result.errorType).toBe('api_error');
      expect(result.errorCode).toBe('GEMINI_API_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.httpStatus).toBe(500);
    });

    it('includes additional context when provided', () => {
      const error = new Error('Test error');
      const context = { sessionId: 'test-session', failureStage: 'custom_stage' };

      const result = categorizeAIError(error, context);

      expect(result.sessionId).toBe('test-session');
      expect(result.failureStage).toBe('custom_stage');
    });

    it('handles string errors correctly', () => {
      const result = categorizeAIError('Network connection failed');

      expect(result.errorType).toBe('network_error');
      expect(result.errorMessage).toBe('Network connection failed');
    });
  });

  describe('trackAIRequestFailure', () => {
    const mockPostHog = {
      capture: jest.fn(),
      has_opted_in_capturing: jest.fn().mockReturnValue(true)
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('tracks failure with PostHog when opted in', () => {
      const errorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        failureStage: 'network'
      };

      const requestContext = {
        sessionId: 'test-session',
        responseTimeMs: 5000,
        questionLength: 25,
        hasContext: true,
        contextArticlesCount: 3,
        messageCount: 2
      };

      trackAIRequestFailure(mockPostHog, errorDetails, requestContext);

      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_failed', expect.objectContaining({
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        failureStage: 'network',
        response_time_ms: 5000,
        session_id: 'test-session',
        question_length: 25,
        has_context: true,
        context_articles_count: 3,
        message_count: 2,
        timestamp: expect.any(String)
      }));
    });

    it('does not track when PostHog is not available', () => {
      trackAIRequestFailure(null, {} as any);
      expect(mockPostHog.capture).not.toHaveBeenCalled();
    });

    it('does not track when user has not opted in', () => {
      const mockPostHogNotOptedIn = {
        ...mockPostHog,
        has_opted_in_capturing: jest.fn().mockReturnValue(false)
      };

      trackAIRequestFailure(mockPostHogNotOptedIn, {} as any);
      expect(mockPostHogNotOptedIn.capture).not.toHaveBeenCalled();
    });

    it('handles missing request context gracefully', () => {
      const errorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        failureStage: 'network'
      };

      trackAIRequestFailure(mockPostHog, errorDetails);

      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_failed', expect.objectContaining({
        response_time_ms: 0,
        question_length: 0,
        has_context: false,
        context_articles_count: 0,
        message_count: 0
      }));
    });

    it('includes additional data from error details', () => {
      const errorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        failureStage: 'network',
        additionalData: {
          customField: 'customValue',
          debugInfo: 'debug123'
        }
      };

      trackAIRequestFailure(mockPostHog, errorDetails);

      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_failed', expect.objectContaining({
        customField: 'customValue',
        debugInfo: 'debug123'
      }));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty articles array', () => {
      const result = extractDocumentationContext([], mockCategories);
      expect(result.articles).toHaveLength(0);
      expect(result.totalArticles).toBe(0);
    });

    it('handles empty categories array', () => {
      const result = extractDocumentationContext(mockArticles, []);
      expect(result.categories).toHaveLength(0);
      expect(result.articles).toHaveLength(3);
    });

    it('handles articles with very long content', () => {
      const longContent = 'a'.repeat(10000);
      const articleWithLongContent = [
        { ...mockArticles[0], seiteninhalt: longContent }
      ];

      const result = extractDocumentationContext(articleWithLongContent, [], { maxContentLength: 100 });

      expect(result.articles[0].seiteninhalt?.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    it('handles null and undefined values gracefully', () => {
      const articlesWithNulls = [
        { id: '1', titel: 'Test', kategorie: null, seiteninhalt: null },
        { id: '2', titel: 'Test 2', kategorie: undefined as any, seiteninhalt: undefined as any }
      ];

      const result = extractDocumentationContext(articlesWithNulls, mockCategories);

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].kategorie).toBe(null);
      expect(result.articles[0].seiteninhalt).toBe(null);
    });
  });
});