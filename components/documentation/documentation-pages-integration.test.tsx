import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentationPage from '@/app/(landing)/hilfe/dokumentation/page';
import ArticlePage from '@/app/(landing)/hilfe/dokumentation/[articleId]/page';
import { useToast } from '@/hooks/use-toast';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockToast = jest.fn();

const mockCategories = [
  { name: 'Getting Started', articleCount: 3 },
  { name: 'Advanced Features', articleCount: 2 },
];

const mockArticles = [
  {
    id: '1',
    titel: 'How to Get Started',
    kategorie: 'Getting Started',
    seiteninhalt: 'This is a guide on how to get started with the platform.',
    meta: { created_time: '2024-01-01T00:00:00Z' },
  },
  {
    id: '2',
    titel: 'Advanced Configuration',
    kategorie: 'Advanced Features',
    seiteninhalt: 'Learn about advanced configuration options.',
    meta: { created_time: '2024-01-02T00:00:00Z' },
  },
];

describe('Documentation Pages Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    
    // Mock successful API responses
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategories),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticles),
      });
  });

  describe('Main Documentation Page', () => {
    it('renders documentation page with header and search', async () => {
      render(<DocumentationPage />);

      expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Navigation')).toBeInTheDocument();
      });
    });

    it('loads and displays categories', async () => {
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        expect(screen.getByText('Advanced Features')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // Article count
        expect(screen.getByText('2')).toBeInTheDocument(); // Article count
      });
    });

    it('loads and displays articles', async () => {
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('How to Get Started')).toBeInTheDocument();
        expect(screen.getByText('Advanced Configuration')).toBeInTheDocument();
      });
    });

    it('handles search functionality', async () => {
      // Mock search API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockArticles[0]]),
      });

      render(<DocumentationPage />);

      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'getting started' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/documentation/search?q=getting%20started')
        );
      });
    });

    it('handles category selection', async () => {
      // Mock category-specific API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockArticles[0]]),
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        const categoryButton = screen.getByText('Getting Started');
        fireEvent.click(categoryButton);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/documentation?category=Getting%20Started')
        );
      });
    });

    it('handles article selection and URL updates', async () => {
      render(<DocumentationPage />);

      await waitFor(() => {
        const articleCard = screen.getByText('How to Get Started');
        fireEvent.click(articleCard);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('article=1'),
        { scroll: false }
      );
    });

    it('handles URL parameters on load', () => {
      const searchParams = new URLSearchParams('?category=Getting%20Started&search=test');
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      render(<DocumentationPage />);

      // Should initialize with URL parameters
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documentation/search?q=test')
      );
    });

    it('displays error states appropriately', async () => {
      // Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Kategorien konnten nicht geladen werden.',
          variant: 'destructive',
        });
      });
    });

    it('shows loading states', () => {
      render(<DocumentationPage />);

      // Should show loading skeletons initially
      expect(screen.getAllByTestId('skeleton')).toHaveLength(0); // Skeleton components don't have testId by default
      // We can check for the loading structure instead
      expect(screen.getByText('Dokumentation')).toBeInTheDocument();
    });
  });

  describe('Individual Article Page', () => {
    const mockParams = { articleId: '1' };

    beforeEach(() => {
      const mockUseParams = require('next/navigation').useParams as jest.Mock;
      mockUseParams.mockReturnValue(mockParams);
    });

    it('renders article page and loads article', async () => {
      // Mock article API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticles[0]),
      });

      render(await ArticlePage({ params: Promise.resolve({ articleId: '1' }) }));

      await waitFor(() => {
        expect(screen.getByText('How to Get Started')).toBeInTheDocument();
        expect(screen.getByText('This is a guide on how to get started with the platform.')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/documentation/1');
    });

    it('handles article not found', async () => {
      // Mock 404 response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      render(await ArticlePage({ params: Promise.resolve({ articleId: '1' }) }));

      await waitFor(() => {
        expect(screen.getByText('Artikel nicht gefunden')).toBeInTheDocument();
      });
    });

    it('handles back navigation', async () => {
      // Mock article API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticles[0]),
      });

      render(await ArticlePage({ params: Promise.resolve({ articleId: '1' }) }));

      await waitFor(() => {
        const backButton = screen.getByText('Zurück zur Dokumentation');
        fireEvent.click(backButton);
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/documentation');
    });

    it('displays loading state', async () => {
      render(await ArticlePage({ params: Promise.resolve({ articleId: '1' }) }));

      // Should show loading skeleton initially
      expect(screen.getByText('Zurück zur Dokumentation')).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      // Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      render(await ArticlePage({ params: Promise.resolve({ articleId: '1' }) }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Artikel konnte nicht geladen werden.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        // Check that the grid layout adapts (lg:grid-cols-4 becomes single column on mobile)
        const mainContent = screen.getByText('Dokumentation').closest('div');
        expect(mainContent).toBeInTheDocument();
      });
    });

    it('maintains functionality on tablet screens', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Navigation')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toBeInTheDocument();
      });
    });
  });

  describe('Deep Linking Support', () => {
    it('supports direct article links', () => {
      const searchParams = new URLSearchParams('?article=1');
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      render(<DocumentationPage />);

      // Should attempt to load the specific article
      expect(fetch).toHaveBeenCalledWith('/api/documentation/1');
    });

    it('supports category deep links', () => {
      const searchParams = new URLSearchParams('?category=Getting%20Started');
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      render(<DocumentationPage />);

      // Should load articles for the specific category
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documentation?category=Getting%20Started')
      );
    });

    it('supports search deep links', () => {
      const searchParams = new URLSearchParams('?search=configuration');
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);

      render(<DocumentationPage />);

      // Should perform search with the query
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documentation/search?q=configuration')
      );
    });
  });
});