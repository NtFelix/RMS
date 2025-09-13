import { 
  extractDocumentationContext, 
  processContextForAI, 
  fetchDocumentationContext 
} from '@/lib/ai-documentation-context';
import { 
  prepareAIRequest, 
  prepareAIRequestWithContext, 
  filterRelevantArticles, 
  validateAIRequest 
} from '@/lib/ai-context-client';
import type { Article, Category } from '@/types/documentation';

// Mock the documentation service
jest.mock('@/lib/documentation-service', () => ({
  createDocumentationService: jest.fn(() => ({
    getAllArticles: jest.fn(),
    getCategories: jest.fn(),
    searchArticles: jest.fn(),
    getArticleById: jest.fn(),
    getArticlesByCategory: jest.fn()
  }))
}));

describe('AI Documentation Context Integration', () => {
  const mockArticles: Article[] = [
    {
      id: '1',
      titel: 'Betriebskosten verwalten',
      kategorie: 'Finanzen',
      seiteninhalt: 'Hier erfahren Sie, wie Sie Betriebskosten in Mietfluss verwalten können. Die Betriebskostenverwaltung ermöglicht es Ihnen, alle Kosten zu erfassen und abzurechnen.',
      meta: {}
    },
    {
      id: '2',
      titel: 'Mieter hinzufügen',
      kategorie: 'Mieterverwaltung',
      seiteninhalt: 'So fügen Sie neue Mieter zu Ihren Immobilien hinzu. Die Mieterverwaltung ist ein zentraler Bestandteil von Mietfluss.',
      meta: {}
    },
    {
      id: '3',
      titel: 'Wohnungen erstellen',
      kategorie: 'Immobilienverwaltung',
      seiteninhalt: 'Erstellen Sie neue Wohnungen in Ihren Häusern. Jede Wohnung kann individuell konfiguriert werden.',
      meta: {}
    }
  ];

  const mockCategories: Category[] = [
    { name: 'Finanzen', articleCount: 5 },
    { name: 'Mieterverwaltung', articleCount: 3 },
    { name: 'Immobilienverwaltung', articleCount: 4 }
  ];

  describe('extractDocumentationContext', () => {
    it('should extract and process documentation context correctly', () => {
      const result = extractDocumentationContext(mockArticles, mockCategories);

      expect(result.articles).toHaveLength(3);
      expect(result.categories).toHaveLength(3);
      expect(result.totalArticles).toBe(3);
      
      // Check that articles are properly formatted
      expect(result.articles[0]).toEqual({
        id: '1',
        titel: 'Betriebskosten verwalten',
        kategorie: 'Finanzen',
        seiteninhalt: mockArticles[0].seiteninhalt
      });
    });

    it('should truncate long content', () => {
      const longArticle: Article = {
        id: '4',
        titel: 'Long Article',
        kategorie: 'Test',
        seiteninhalt: 'A'.repeat(2000),
        meta: {}
      };

      const result = extractDocumentationContext([longArticle], [], { maxContentLength: 100 });
      
      expect(result.articles[0].seiteninhalt).toHaveLength(103); // 100 + '...'
      expect(result.articles[0].seiteninhalt).toMatch(/\.\.\.$/); // ends with ...
    });

    it('should handle articles with null content', () => {
      const articleWithNullContent: Article = {
        id: '5',
        titel: 'Empty Article',
        kategorie: 'Test',
        seiteninhalt: null,
        meta: {}
      };

      const result = extractDocumentationContext([articleWithNullContent], []);
      
      expect(result.articles[0].seiteninhalt).toBeNull();
    });
  });

  describe('processContextForAI', () => {
    it('should process context data for AI requests', () => {
      const contextData = {
        articles: mockArticles.map(a => ({
          id: a.id,
          titel: a.titel,
          kategorie: a.kategorie,
          seiteninhalt: a.seiteninhalt
        })),
        categories: mockCategories,
        totalArticles: 3
      };

      const result = processContextForAI(contextData, 'Betriebskosten');

      expect(result.articles).toBeDefined();
      expect(result.categories).toEqual(mockCategories);
      
      // Should prioritize articles matching the query
      expect(result.articles[0].titel).toBe('Betriebskosten verwalten');
    });

    it('should return all articles when no query provided', () => {
      const contextData = {
        articles: mockArticles.map(a => ({
          id: a.id,
          titel: a.titel,
          kategorie: a.kategorie,
          seiteninhalt: a.seiteninhalt
        })),
        categories: mockCategories,
        totalArticles: 3
      };

      const result = processContextForAI(contextData, '');

      expect(result.articles).toHaveLength(3);
    });
  });

  describe('Client-side utilities', () => {
    describe('prepareAIRequest', () => {
      it('should prepare AI request with default options', () => {
        const result = prepareAIRequest('How do I manage operating costs?');

        expect(result.message).toBe('How do I manage operating costs?');
        expect(result.contextOptions?.useDocumentationContext).toBe(true);
        expect(result.contextOptions?.maxArticles).toBe(10);
        expect(result.contextOptions?.maxContentLength).toBe(1000);
        expect(result.contextOptions?.searchQuery).toBe('How do I manage operating costs?');
      });

      it('should prepare AI request with custom options', () => {
        const options = {
          maxArticles: 5,
          maxContentLength: 500,
          searchQuery: 'custom search',
          currentArticleId: 'article-123'
        };

        const result = prepareAIRequest('Test message', options, 'session-123');

        expect(result.contextOptions?.maxArticles).toBe(5);
        expect(result.contextOptions?.maxContentLength).toBe(500);
        expect(result.contextOptions?.searchQuery).toBe('custom search');
        expect(result.contextOptions?.currentArticleId).toBe('article-123');
        expect(result.sessionId).toBe('session-123');
      });
    });

    describe('prepareAIRequestWithContext', () => {
      it('should prepare AI request with explicit context', () => {
        const result = prepareAIRequestWithContext(
          'Test message',
          mockArticles,
          mockCategories,
          'article-1',
          'session-123'
        );

        expect(result.message).toBe('Test message');
        expect(result.context?.articles).toEqual(mockArticles);
        expect(result.context?.categories).toEqual(mockCategories);
        expect(result.context?.currentArticleId).toBe('article-1');
        expect(result.contextOptions?.useDocumentationContext).toBe(false);
        expect(result.sessionId).toBe('session-123');
      });
    });

    describe('filterRelevantArticles', () => {
      it('should filter articles by relevance', () => {
        const result = filterRelevantArticles(mockArticles, 'Betriebskosten', 2);

        expect(result).toHaveLength(1);
        expect(result[0].titel).toBe('Betriebskosten verwalten');
      });

      it('should return all articles when query is empty', () => {
        const result = filterRelevantArticles(mockArticles, '', 10);

        expect(result).toHaveLength(3);
      });

      it('should limit results to maxArticles', () => {
        const result = filterRelevantArticles(mockArticles, 'Mieter', 1);

        expect(result).toHaveLength(1);
      });
    });

    describe('validateAIRequest', () => {
      it('should validate valid request', () => {
        const payload = prepareAIRequest('Valid message');
        const errors = validateAIRequest(payload);

        expect(errors).toHaveLength(0);
      });

      it('should detect empty message', () => {
        const payload = prepareAIRequest('');
        const errors = validateAIRequest(payload);

        expect(errors).toContain('Message is required');
      });

      it('should detect message too long', () => {
        const longMessage = 'A'.repeat(4001);
        const payload = prepareAIRequest(longMessage);
        const errors = validateAIRequest(payload);

        expect(errors).toContain('Message is too long (max 4000 characters)');
      });

      it('should detect invalid maxArticles', () => {
        const payload = {
          message: 'Test',
          contextOptions: { maxArticles: 0 }
        } as any;
        const errors = validateAIRequest(payload);

        expect(errors).toContain('maxArticles must be between 1 and 50');
      });

      it('should detect invalid maxContentLength', () => {
        const payload = prepareAIRequest('Test', { maxContentLength: 50 });
        const errors = validateAIRequest(payload);

        expect(errors).toContain('maxContentLength must be between 100 and 2000');
      });
    });
  });
});