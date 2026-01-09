/**
 * Navigation Integration Tests for Documentation System
 * 
 * These tests verify that navigation works correctly across all components
 * and maintains proper state management and URL synchronization.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import DocumentationPage from '@/app/documentation/page';
import ArticlePageClient from '@/app/documentation/[articleId]/article-page-client';
import { DocumentationBreadcrumb } from '@/components/documentation/documentation-breadcrumb';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(),
};

// Test data
const mockCategories = [
  { name: 'Erste Schritte', articleCount: 3 },
  { name: 'Mieter verwalten', articleCount: 5 },
  { name: 'Finanzen', articleCount: 4 },
];

const mockArticles = [
  {
    id: '1',
    titel: 'Willkommen bei Mietevo',
    kategorie: 'Erste Schritte',
    seiteninhalt: 'Dies ist eine Einführung in Mietevo...',
    meta: { created_time: '2024-01-01T00:00:00Z' },
  },
  {
    id: '2',
    titel: 'Mieter hinzufügen',
    kategorie: 'Mieter verwalten',
    seiteninhalt: 'So fügen Sie neue Mieter hinzu...',
    meta: { created_time: '2024-01-02T00:00:00Z' },
  },
];

describe('Documentation Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useParams as jest.Mock).mockReturnValue({ articleId: '1' });

    // Reset search params
    mockSearchParams.get.mockReturnValue(null);
    mockSearchParams.toString.mockReturnValue('');

    // Setup default fetch responses
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/documentation/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });
      }
      if (url.includes('/api/documentation/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockArticles.slice(0, 1)),
        });
      }
      if (url.includes('/api/documentation/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockArticles[0]),
        });
      }
      if (url.includes('/api/documentation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockArticles),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('URL State Management', () => {
    test('initializes state from URL parameters on page load', async () => {
      // Mock URL with parameters
      mockSearchParams.get.mockImplementation((param: string) => {
        const params: Record<string, string> = {
          category: 'Erste Schritte',
          search: '',
          article: '',
        };
        return params[param] || null;
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });
    });

    test('updates URL when category is selected', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
      });

      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/documentation?category=Erste%20Schritte',
        { scroll: false }
      );
    });

    test('updates URL when search is performed', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'test query');

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/documentation?search=test%20query',
          { scroll: false }
        );
      });
    });

    test('updates URL when article is selected', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Willkommen bei Mietevo')).toBeInTheDocument();
      });

      const articleCard = screen.getByText('Willkommen bei Mietevo').closest('[role="button"]');
      if (articleCard) {
        await user.click(articleCard);
      }

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('article=1'),
        { scroll: false }
      );
    });

    test('clears conflicting URL parameters correctly', async () => {
      const user = userEvent.setup();

      // Start with search query
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'search') return 'existing search';
        return null;
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
      });

      // Select category (should clear search)
      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/documentation?category=Erste%20Schritte',
        { scroll: false }
      );
    });
  });

  describe('Browser History Integration', () => {
    test('handles browser back button correctly', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Navigate to category
      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      // Navigate to search
      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'test');

      // Simulate browser back
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'category') return 'Erste Schritte';
        return null;
      });

      // Re-render with new URL state
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });
    });

    test('maintains scroll position during navigation', async () => {
      const user = userEvent.setup();

      // Mock scroll position
      Object.defineProperty(window, 'scrollY', {
        value: 200,
        writable: true,
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      // Router should be called with scroll: false to maintain position
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.any(String),
        { scroll: false }
      );
    });
  });

  describe('Deep Linking', () => {
    test('supports direct links to articles', async () => {
      render(<ArticlePageClient articleId="1" />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/documentation/1');
        expect(screen.getByText('Willkommen bei Mietevo')).toBeInTheDocument();
      });
    });

    test('supports direct links to categories', async () => {
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'category') return 'Erste Schritte';
        return null;
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });
    });

    test('supports direct links to search results', async () => {
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'search') return 'test query';
        return null;
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/documentation/search?q=test%20query')
        );
      });
    });

    test('handles invalid article IDs gracefully', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/documentation/invalid')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Article not found' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<ArticlePageClient articleId="invalid" />);

      await waitFor(() => {
        expect(screen.getByText(/Artikel nicht gefunden/)).toBeInTheDocument();
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    test('renders correct breadcrumbs for category navigation', () => {
      const breadcrumbItems = [
        { label: 'Erste Schritte', onClick: jest.fn() },
        { label: 'Willkommen bei Mietevo' },
      ];

      render(<DocumentationBreadcrumb items={breadcrumbItems} />);

      expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
      expect(screen.getByText('Willkommen bei Mietevo')).toBeInTheDocument();
    });

    test('renders correct breadcrumbs for search navigation', () => {
      const breadcrumbItems = [
        { label: 'Suchergebnisse für "test"', onClick: jest.fn() },
        { label: 'Willkommen bei Mietevo' },
      ];

      render(<DocumentationBreadcrumb items={breadcrumbItems} />);

      expect(screen.getByText('Suchergebnisse für "test"')).toBeInTheDocument();
    });

    test('breadcrumb clicks trigger correct navigation', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();

      const breadcrumbItems = [
        { label: 'Erste Schritte', onClick: mockOnClick },
        { label: 'Current Article' },
      ];

      render(<DocumentationBreadcrumb items={breadcrumbItems} />);

      const breadcrumbButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(breadcrumbButton);

      expect(mockOnClick).toHaveBeenCalled();
    });

    test('home breadcrumb navigates to documentation root', async () => {
      const user = userEvent.setup();

      render(<DocumentationBreadcrumb items={[{ label: 'Test Article' }]} />);

      const homeButton = screen.getByRole('button', { name: /Zur Dokumentation Startseite/i });
      await user.click(homeButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/documentation');
    });
  });

  describe('Navigation State Persistence', () => {
    test('preserves navigation state across component remounts', async () => {
      // Initial render with category
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'category') return 'Erste Schritte';
        return null;
      });

      const { unmount } = render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });

      unmount();

      // Re-render should maintain state
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });
    });

    test('handles rapid navigation changes correctly', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Rapid navigation changes
      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'test');

      const allArticlesButton = screen.getByRole('button', { name: /Alle Artikel/i });
      await user.click(allArticlesButton);

      // Should handle all navigation changes
      expect(mockRouter.replace).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling in Navigation', () => {
    test('handles navigation errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock router error
      mockRouter.replace.mockRejectedValue(new Error('Navigation failed'));

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      // Should not crash the application
      expect(screen.getByText('Dokumentation')).toBeInTheDocument();
    });

    test('recovers from invalid URL parameters', async () => {
      // Mock invalid URL parameters
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'category') return '<script>alert("xss")</script>';
        return null;
      });

      render(<DocumentationPage />);

      // Should sanitize and handle gracefully
      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Should not make API call with malicious parameter
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('<script>')
      );
    });
  });

  describe('Keyboard Navigation', () => {
    test('supports keyboard navigation through breadcrumbs', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();

      const breadcrumbItems = [
        { label: 'Category', onClick: mockOnClick },
        { label: 'Article' },
      ];

      render(<DocumentationBreadcrumb items={breadcrumbItems} />);

      // Tab to breadcrumb button
      await user.tab();
      const homeButton = screen.getByRole('button', { name: /Zur Dokumentation Startseite/i });
      expect(homeButton).toHaveFocus();

      await user.tab();
      const categoryButton = screen.getByRole('button', { name: /Category/i });
      expect(categoryButton).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalled();
    });

    test('supports keyboard navigation in main documentation page', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab(); // Search input
      expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toHaveFocus();

      await user.tab(); // First category button
      const firstCategoryButton = screen.getAllByRole('button')[0];
      expect(firstCategoryButton).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');
      expect(mockRouter.replace).toHaveBeenCalled();
    });
  });

  describe('Mobile Navigation', () => {
    test('handles touch navigation correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true,
      });

      const user = userEvent.setup();
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });

      // Simulate touch events
      fireEvent.touchStart(categoryButton);
      fireEvent.touchEnd(categoryButton);
      await user.click(categoryButton);

      expect(mockRouter.replace).toHaveBeenCalled();
    });

    test('breadcrumbs are responsive on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true,
      });

      const longBreadcrumbItems = [
        { label: 'Very Long Category Name That Should Truncate', onClick: jest.fn() },
        { label: 'Very Long Article Title That Should Also Truncate' },
      ];

      render(<DocumentationBreadcrumb items={longBreadcrumbItems} />);

      // Should have truncation classes
      const breadcrumbElements = document.querySelectorAll('.truncate');
      expect(breadcrumbElements.length).toBeGreaterThan(0);
    });
  });
});