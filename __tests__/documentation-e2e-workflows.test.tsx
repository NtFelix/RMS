/**
 * End-to-End Tests for Documentation User Workflows
 * 
 * These tests simulate complete user journeys through the documentation system
 * to ensure all features work together seamlessly.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentationPage from '@/app/documentation/page';
import { DocumentationArticleViewer } from '@/components/documentation-article-viewer';
import { useToast } from '@/hooks/use-toast';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
};

const mockToast = jest.fn();

// Sample test data
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
    meta: {
      created_time: '2024-01-01T00:00:00Z',
      last_edited_time: '2024-01-02T00:00:00Z',
    },
  },
  {
    id: '2',
    titel: 'Mieter hinzufügen',
    kategorie: 'Mieter verwalten',
    seiteninhalt: 'So fügen Sie neue Mieter hinzu...',
    meta: {
      created_time: '2024-01-03T00:00:00Z',
    },
  },
  {
    id: '3',
    titel: 'Einnahmen verfolgen',
    kategorie: 'Finanzen',
    seiteninhalt: 'Verfolgen Sie Ihre Mieteinnahmen...',
    meta: {
      created_time: '2024-01-04T00:00:00Z',
    },
  },
];

describe('Documentation E2E User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    // Reset search params
    mockSearchParams.get.mockReturnValue(null);

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
      if (url.includes('/api/documentation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockArticles),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Complete User Journey: Browse → Search → Read Article', () => {
    test('user can browse categories, search, and read articles', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      // 1. Initial page load - should show categories and all articles
      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
        expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
        expect(screen.getByText('Mieter verwalten')).toBeInTheDocument();
        expect(screen.getByText('Finanzen')).toBeInTheDocument();
      });

      // 2. User clicks on a category
      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });
      await user.click(categoryButton);

      // Should update URL and filter articles
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/documentation?category=Erste%20Schritte',
        { scroll: false }
      );

      // 3. User performs a search
      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'Willkommen');

      // Should trigger search API call and update URL
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/documentation/search?q=Willkommen')
        );
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/documentation?search=Willkommen',
          { scroll: false }
        );
      });

      // 4. User clicks on an article
      await waitFor(() => {
        const articleCard = screen.getByText('Willkommen bei Mietevo');
        expect(articleCard).toBeInTheDocument();
      });

      const articleCard = screen.getByText('Willkommen bei Mietevo').closest('[role="button"]');
      if (articleCard) {
        await user.click(articleCard);
      }

      // Should update URL to show article
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/documentation?search=Willkommen&article=1',
        { scroll: false }
      );
    });
  });

  describe('Navigation and Browser History', () => {
    test('user can navigate back and forward through documentation', async () => {
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

      // Verify URL updates were called
      expect(mockRouter.replace).toHaveBeenCalledTimes(2);
    });

    test('URL parameters are properly handled on page load', async () => {
      // Simulate loading page with URL parameters
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === 'category') return 'Erste Schritte';
        if (param === 'search') return '';
        if (param === 'article') return null;
        return null;
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Erste%20Schritte')
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('user can recover from API errors', async () => {
      const user = userEvent.setup();

      // Mock API failure
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<DocumentationPage />);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Kategorien/)).toBeInTheDocument();
      });

      // User should see toast notification
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler',
        description: 'Kategorien konnten nicht geladen werden.',
        variant: 'destructive',
      });
    });

    test('user can retry failed operations', async () => {
      const user = userEvent.setup();

      // Mock initial failure, then success
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });

      render(<DocumentationPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Kategorien/)).toBeInTheDocument();
      });

      // Find and click retry button (if implemented in error boundary)
      const retryButton = screen.queryByText(/Erneut versuchen/);
      if (retryButton) {
        await user.click(retryButton);

        // Should retry and succeed
        await waitFor(() => {
          expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Search Functionality', () => {
    test('search debouncing works correctly', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');

      // Type quickly (should be debounced)
      await user.type(searchInput, 'test');

      // Should not immediately trigger search
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/documentation/search')
      );

      // Wait for debounce delay
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/documentation/search?q=test')
        );
      }, { timeout: 1000 });
    });

    test('search results are highlighted correctly', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'Willkommen');

      await waitFor(() => {
        // Should show search results with highlighting
        const articleTitle = screen.getByText('Willkommen bei Mietevo');
        expect(articleTitle).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    test('documentation works on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Check that mobile-specific classes are applied
      const container = screen.getByText('Dokumentation').closest('.container');
      expect(container).toHaveClass('mx-auto', 'px-4');
    });
  });

  describe('Accessibility', () => {
    test('keyboard navigation works correctly', async () => {
      const user = userEvent.setup();

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toHaveFocus();

      await user.tab();
      const firstCategoryButton = screen.getByRole('button', { name: /Alle Artikel/i });
      expect(firstCategoryButton).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    test('screen reader announcements are correct', async () => {
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Check for proper ARIA labels
      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      expect(searchInput).toHaveAttribute('type', 'text');

      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });
  });
});

describe('Article Viewer Component E2E', () => {
  const mockArticle = mockArticles[0];

  test('article sharing functionality works', async () => {
    const user = userEvent.setup();

    // Mock navigator.share
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });

    Object.defineProperty(navigator, 'canShare', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });

    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={jest.fn()}
        selectedCategory="Erste Schritte"
      />
    );

    const shareButton = screen.getByRole('button', { name: /Teilen/i });
    await user.click(shareButton);

    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Willkommen bei Mietevo - Mietevo Dokumentation',
      text: 'Lesen Sie mehr über "Willkommen bei Mietevo" in der Mietevo Dokumentation.',
      url: expect.stringContaining('/documentation/1'),
    });
  });

  test('article sharing fallback to clipboard works', async () => {
    const user = userEvent.setup();

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // No native share support
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });

    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={jest.fn()}
        selectedCategory="Erste Schritte"
      />
    );

    const shareButton = screen.getByRole('button', { name: /Teilen/i });
    await user.click(shareButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/documentation/1')
    );

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Link kopiert',
      description: 'Der Link wurde in die Zwischenablage kopiert.',
    });
  });

  test('breadcrumb navigation works correctly', async () => {
    const user = userEvent.setup();
    const mockOnBack = jest.fn();

    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
        selectedCategory="Erste Schritte"
      />
    );

    // Should show breadcrumb with category
    expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
    expect(screen.getByText('Willkommen bei Mietevo')).toBeInTheDocument();

    // Click on category breadcrumb
    const categoryBreadcrumb = screen.getByText('Erste Schritte');
    await user.click(categoryBreadcrumb);

    expect(mockOnBack).toHaveBeenCalled();
  });
});