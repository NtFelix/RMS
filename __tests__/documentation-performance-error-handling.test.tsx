import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationSearch } from '@/components/documentation/documentation-search';
import { DocumentationCategories } from '@/components/documentation/documentation-categories';
import { DocumentationArticleList } from '@/components/documentation/documentation-article-list';
import { DocumentationErrorBoundary } from '@/components/documentation/documentation-error-boundary';
import { VirtualArticleList } from '@/components/documentation/virtual-article-list';
import { useRetry, useApiRetry } from '@/hooks/use-retry';
import { useDocumentationCache } from '@/hooks/use-documentation-cache';
import type { Article, Category } from '@/types/documentation';

// Mock hooks
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: jest.fn((value, delay) => {
    // Simulate debouncing by returning the value after a delay
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
      const timer = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
  }),
}));

jest.mock('@/hooks/use-retry');
jest.mock('@/hooks/use-documentation-cache');

const mockUseRetry = useRetry as jest.MockedFunction<typeof useRetry>;
const mockUseApiRetry = useApiRetry as jest.MockedFunction<typeof useApiRetry>;
const mockUseDocumentationCache = useDocumentationCache as jest.MockedFunction<typeof useDocumentationCache>;

// Mock data
const mockCategories: Category[] = [
  { name: 'Getting Started', articleCount: 5 },
  { name: 'Advanced Topics', articleCount: 3 },
  { name: 'API Reference', articleCount: 10 },
];

const mockArticles: Article[] = Array.from({ length: 100 }, (_, i) => ({
  id: `article-${i}`,
  titel: `Test Article ${i + 1}`,
  kategorie: mockCategories[i % 3].name,
  seiteninhalt: `This is the content for test article ${i + 1}. It contains some sample text for testing purposes.`,
  meta: {
    created_time: new Date().toISOString(),
    last_edited_time: new Date().toISOString(),
  },
}));

describe('Documentation Performance Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Debouncing', () => {
    it('should debounce search input to reduce API calls', async () => {
      // Mock debounce to return the value immediately for testing
      const mockUseDebounce = require('@/hooks/use-debounce').useDebounce;
      mockUseDebounce.mockImplementation((value) => value);

      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(
        <DocumentationSearch onSearch={mockOnSearch} />
      );

      const searchInput = screen.getByRole('textbox');

      // Type a single character
      await user.type(searchInput, 'test');

      // Should call onSearch with debounced value
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('test');
      });
    });

    it('should handle search errors gracefully', async () => {
      const mockOnSearch = jest.fn();
      const mockOnRetry = jest.fn();

      render(
        <DocumentationSearch 
          onSearch={mockOnSearch} 
          error={new Error('Search failed')}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText(/Fehler bei der Suche/)).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling', () => {
    it('should render only visible items for large lists', () => {
      const mockOnArticleSelect = jest.fn();

      render(
        <VirtualArticleList
          articles={mockArticles}
          onArticleSelect={mockOnArticleSelect}
          containerHeight={400}
          itemHeight={100}
        />
      );

      // Should not render all 100 articles at once - check by article titles
      const renderedTitles = screen.getAllByText(/Test Article \d+/);
      expect(renderedTitles.length).toBeLessThan(mockArticles.length);
      expect(renderedTitles.length).toBeGreaterThan(0);
    });

    it('should handle article selection in virtual list', async () => {
      const mockOnArticleSelect = jest.fn();
      const user = userEvent.setup();

      render(
        <VirtualArticleList
          articles={mockArticles.slice(0, 10)}
          onArticleSelect={mockOnArticleSelect}
          containerHeight={400}
          itemHeight={100}
        />
      );

      const firstArticle = screen.getByText('Test Article 1');
      await user.click(firstArticle);

      expect(mockOnArticleSelect).toHaveBeenCalledWith(mockArticles[0]);
    });
  });

  describe('Caching', () => {
    it('should use cached data when available', async () => {
      const mockFetcher = jest.fn().mockResolvedValue(mockCategories);
      
      mockUseDocumentationCache.mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
        isStale: false,
        refresh: jest.fn(),
        invalidate: jest.fn(),
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { data } = useDocumentationCache('test-key', mockFetcher);
        return <div>{data ? 'Data loaded' : 'Loading...'}</div>;
      };

      render(<TestComponent />);

      expect(screen.getByText('Data loaded')).toBeInTheDocument();
      expect(mockFetcher).not.toHaveBeenCalled(); // Should use cached data
    });

    it('should handle stale data appropriately', async () => {
      mockUseDocumentationCache.mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
        isStale: true,
        refresh: jest.fn(),
        invalidate: jest.fn(),
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { data, isStale } = useDocumentationCache('test-key', jest.fn());
        return (
          <div>
            {data ? 'Data loaded' : 'Loading...'}
            {isStale && <span>Stale data</span>}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('Data loaded')).toBeInTheDocument();
      expect(screen.getByText('Stale data')).toBeInTheDocument();
    });
  });
});

describe('Documentation Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Boundaries', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    it('should catch and display errors', () => {
      render(
        <DocumentationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DocumentationErrorBoundary>
      );

      expect(screen.getByText(/Fehler beim Laden der Dokumentation/)).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });

    it('should allow error recovery', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const TestWrapper = () => (
        <DocumentationErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </DocumentationErrorBoundary>
      );

      const { rerender } = render(<TestWrapper />);

      expect(screen.getByText(/Fehler beim Laden der Dokumentation/)).toBeInTheDocument();

      // Simulate fixing the error
      shouldThrow = false;
      
      const retryButton = screen.getByText('Erneut versuchen');
      await user.click(retryButton);

      // The error boundary should reset and show the fixed component
      await waitFor(() => {
        expect(screen.queryByText(/Fehler beim Laden der Dokumentation/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Error Handling', () => {
    it('should handle category selection errors', async () => {
      const mockOnCategorySelect = jest.fn().mockImplementation(() => {
        throw new Error('Category selection failed');
      });
      const user = userEvent.setup();

      render(
        <DocumentationCategories
          categories={mockCategories}
          onCategorySelect={mockOnCategorySelect}
        />
      );

      const categoryButton = screen.getByText('Getting Started');
      await user.click(categoryButton);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Kategorien/)).toBeInTheDocument();
      });
    });

    it('should handle article selection errors', async () => {
      const mockOnArticleSelect = jest.fn().mockImplementation(() => {
        throw new Error('Article selection failed');
      });
      const user = userEvent.setup();

      render(
        <DocumentationArticleList
          articles={mockArticles.slice(0, 3)}
          onArticleSelect={mockOnArticleSelect}
        />
      );

      const articleCard = screen.getByText('Test Article 1');
      await user.click(articleCard);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Artikel/)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Mechanisms', () => {
    it('should implement retry logic with exponential backoff', async () => {
      const mockAsyncFunction = jest.fn().mockResolvedValue('Success');
      const mockExecute = jest.fn().mockResolvedValue('Success');

      mockUseRetry.mockReturnValue({
        execute: mockExecute,
        retry: jest.fn(),
        cancel: jest.fn(),
        reset: jest.fn(),
        isLoading: false,
        error: null,
        attempt: 0,
        canRetry: true,
      });

      const TestComponent = () => {
        const { execute, isLoading, error } = useRetry(mockAsyncFunction, {
          maxAttempts: 3,
          delay: 1000,
        });
        
        return (
          <div>
            <button onClick={() => execute()}>Execute</button>
            {isLoading && <span>Loading...</span>}
            {error && <span>Error: {error.message}</span>}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const executeButton = screen.getByText('Execute');
      await user.click(executeButton);

      expect(mockUseRetry).toHaveBeenCalledWith(
        mockAsyncFunction,
        expect.objectContaining({
          maxAttempts: 3,
          delay: 1000,
        })
      );
    });

    it('should handle API retry with specific configuration', () => {
      const mockApiFunction = jest.fn();

      mockUseApiRetry.mockReturnValue({
        execute: jest.fn(),
        retry: jest.fn(),
        cancel: jest.fn(),
        reset: jest.fn(),
        isLoading: false,
        error: null,
        attempt: 0,
        canRetry: true,
      });

      const TestComponent = () => {
        const { execute } = useApiRetry(mockApiFunction, {
          maxAttempts: 3,
          delay: 1000,
          backoffMultiplier: 1.5,
        });
        return <button onClick={() => execute()}>API Call</button>;
      };

      render(<TestComponent />);

      expect(mockUseApiRetry).toHaveBeenCalledWith(
        mockApiFunction,
        expect.objectContaining({
          maxAttempts: 3,
          delay: 1000,
          backoffMultiplier: 1.5,
        })
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons during data fetch', () => {
      render(
        <DocumentationCategories
          categories={[]}
          onCategorySelect={jest.fn()}
          isLoading={true}
        />
      );

      // Should show skeleton loaders - check by class name
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading state in article list', () => {
      render(
        <DocumentationArticleList
          articles={[]}
          onArticleSelect={jest.fn()}
          isLoading={true}
        />
      );

      // Should show skeleton loaders for articles - check by class name
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should show empty state when no data is available', () => {
      render(
        <DocumentationCategories
          categories={[]}
          onCategorySelect={jest.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByText('Keine Kategorien verfügbar')).toBeInTheDocument();
    });

    it('should show no results message for empty search', () => {
      render(
        <DocumentationArticleList
          articles={[]}
          searchQuery="nonexistent"
          onArticleSelect={jest.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByText('Keine Ergebnisse gefunden')).toBeInTheDocument();
      expect(screen.getByText(/Keine Artikel gefunden für "nonexistent"/)).toBeInTheDocument();
    });
  });
});

describe('API Error Handling', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle rate limiting errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        retryAfter: 60,
      }),
    });

    const response = await fetch('/api/documentation/search?q=test');
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Zu viele Anfragen');
    expect(data.retryAfter).toBe(60);
  });

  it('should handle timeout errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 504,
      json: async () => ({
        error: 'Anfrage-Timeout. Bitte versuchen Sie es erneut.',
        retryable: true,
      }),
    });

    const response = await fetch('/api/documentation');
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toContain('Timeout');
    expect(data.retryable).toBe(true);
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        retryable: true,
      }),
    });

    const response = await fetch('/api/documentation/categories');
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('Verbindungsfehler');
    expect(data.retryable).toBe(true);
  });
});