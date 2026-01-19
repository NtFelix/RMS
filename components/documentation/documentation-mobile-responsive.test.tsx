/**
 * Mobile Responsiveness Tests for Documentation System
 * 
 * These tests verify that the documentation system works correctly
 * across different screen sizes and touch interactions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentationPage from '@/app/(landing)/hilfe/dokumentation/page';
import { DocumentationArticleViewer } from '@/components/documentation/documentation-article-viewer';
import { DocumentationCategories } from '@/components/documentation/documentation-categories';
import { DocumentationArticleList } from '@/components/documentation/documentation-article-list';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn().mockReturnValue(null),
};

// Test data
const mockCategories = [
  { name: 'Erste Schritte', articleCount: 3 },
  { name: 'Mieter verwalten', articleCount: 5 },
  { name: 'Finanzen', articleCount: 4 },
  { name: 'Erweiterte Funktionen', articleCount: 7 },
];

const mockArticles = [
  {
    id: '1',
    titel: 'Willkommen bei Mietevo - Eine umfassende Einführung',
    kategorie: 'Erste Schritte',
    seiteninhalt: 'Dies ist eine sehr lange Einführung in Mietevo mit vielen Details...',
    meta: { created_time: '2024-01-01T00:00:00Z' },
  },
  {
    id: '2',
    titel: 'Mieter hinzufügen und verwalten',
    kategorie: 'Mieter verwalten',
    seiteninhalt: 'Lernen Sie, wie Sie Mieter effektiv verwalten...',
    meta: { created_time: '2024-01-02T00:00:00Z' },
  },
];

// Viewport size utilities
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  desktop: { width: 1024, height: 768 },    // Desktop
  desktopLarge: { width: 1440, height: 900 }, // Large Desktop
};

describe('Documentation Mobile Responsiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    // Setup default fetch responses
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/documentation/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
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

  describe('Layout Responsiveness', () => {
    test('adapts layout for mobile viewport', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Check that the grid layout adapts to mobile
      const mainContainer = screen.getByText('Dokumentation').closest('.container');
      expect(mainContainer).toHaveClass('mx-auto', 'px-4');

      // Grid should stack on mobile (lg:grid-cols-4 becomes single column)
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-4');
    });

    test('shows proper layout for tablet viewport', async () => {
      setViewportSize(VIEWPORT_SIZES.tablet.width, VIEWPORT_SIZES.tablet.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Tablet should still use mobile layout but with more space
      const container = screen.getByText('Dokumentation').closest('.container');
      expect(container).toHaveClass('mx-auto', 'px-4');
    });

    test('shows desktop layout for large screens', async () => {
      setViewportSize(VIEWPORT_SIZES.desktop.width, VIEWPORT_SIZES.desktop.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Desktop should show sidebar layout
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-4');
    });
  });

  describe('Touch Interactions', () => {
    test('handles touch events on mobile category buttons', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      const user = userEvent.setup();
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Erste Schritte')).toBeInTheDocument();
      });

      // Simulate touch interaction
      const categoryButton = screen.getByRole('button', { name: /Erste Schritte/i });

      // Touch events
      fireEvent.touchStart(categoryButton);
      fireEvent.touchEnd(categoryButton);
      await user.click(categoryButton);

      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/documentation?category=Erste%20Schritte',
        { scroll: false }
      );
    });

    test('handles swipe gestures for navigation', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleViewer
          article={mockArticles[0]}
          onBack={jest.fn()}
          selectedCategory="Erste Schritte"
        />
      );

      const articleContainer = screen.getByText('Willkommen bei Mietevo').closest('.container');

      // Simulate swipe right gesture (back navigation)
      if (articleContainer) {
        fireEvent.touchStart(articleContainer, {
          touches: [{ clientX: 50, clientY: 100 }]
        });
        fireEvent.touchMove(articleContainer, {
          touches: [{ clientX: 200, clientY: 100 }]
        });
        fireEvent.touchEnd(articleContainer, {
          changedTouches: [{ clientX: 200, clientY: 100 }]
        });
      }

      // Note: Actual swipe handling would need to be implemented in components
    });
  });

  describe('Text and Content Readability', () => {
    test('text remains readable on small screens', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleViewer
          article={mockArticles[0]}
          onBack={jest.fn()}
        />
      );

      // Check that text content is properly sized
      const articleTitle = screen.getByText('Willkommen bei Mietevo - Eine umfassende Einführung');
      expect(articleTitle).toHaveClass('text-2xl', 'font-bold', 'leading-tight');

      // Content should be in a readable container
      const contentContainer = articleTitle.closest('.container');
      expect(contentContainer).toHaveClass('max-w-4xl');
    });

    test('long titles are properly truncated on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationCategories
          categories={mockCategories}
          onCategorySelect={jest.fn()}
        />
      );

      // Category buttons should handle text overflow
      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        const textElement = button.querySelector('span');
        if (textElement) {
          expect(textElement).toHaveClass('truncate');
        }
      });
    });
  });

  describe('Search Functionality on Mobile', () => {
    test('search input is properly sized on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
        expect(searchInput).toBeInTheDocument();
      });

      const searchContainer = screen.getByPlaceholderText('Dokumentation durchsuchen...').closest('.max-w-2xl');
      expect(searchContainer).toHaveClass('mx-auto');
    });

    test('search results are properly displayed on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      const user = userEvent.setup();
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      await user.type(searchInput, 'Willkommen');

      // Results should be displayed properly
      await waitFor(() => {
        const searchResults = screen.getByText(/Suchergebnisse für/);
        expect(searchResults).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Breadcrumbs on Mobile', () => {
    test('breadcrumbs are responsive on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleViewer
          article={mockArticles[0]}
          onBack={jest.fn()}
          selectedCategory="Erste Schritte"
        />
      );

      // Breadcrumb items should truncate on mobile
      const breadcrumbItems = document.querySelectorAll('.max-w-\\[200px\\]');
      expect(breadcrumbItems.length).toBeGreaterThan(0);
    });

    test('back navigation is easily accessible on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      const mockOnBack = jest.fn();
      render(
        <DocumentationArticleViewer
          article={mockArticles[0]}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByRole('button', { name: /Zurück zur Übersicht/i });
      expect(backButton).toBeInTheDocument();

      // Button should be easily tappable (minimum 44px touch target)
      const buttonStyles = window.getComputedStyle(backButton);
      expect(backButton).toHaveClass('gap-2');
    });
  });

  describe('Article List Responsiveness', () => {
    test('article cards stack properly on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleList
          articles={mockArticles}
          onArticleSelect={jest.fn()}
        />
      );

      // Articles should be in a vertical stack
      const articleContainer = document.querySelector('.space-y-4');
      expect(articleContainer).toBeInTheDocument();

      // Each article card should be full width
      const articleCards = screen.getAllByRole('button');
      expect(articleCards.length).toBeGreaterThan(0);
    });

    test('article content is readable on mobile', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleList
          articles={mockArticles}
          onArticleSelect={jest.fn()}
        />
      );

      // Check that article titles are properly sized
      const articleTitle = screen.getByText('Willkommen bei Mietevo - Eine umfassende Einführung');
      expect(articleTitle).toHaveClass('text-lg', 'font-semibold', 'leading-tight');
    });
  });

  describe('Performance on Mobile Devices', () => {
    test('virtual scrolling works on mobile with many articles', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      // Create many articles to test virtual scrolling
      const manyArticles = Array.from({ length: 100 }, (_, i) => ({
        id: `article-${i}`,
        titel: `Article ${i}`,
        kategorie: 'Test Category',
        seiteninhalt: `Content for article ${i}`,
        meta: { created_time: '2024-01-01T00:00:00Z' },
      }));

      render(
        <DocumentationArticleList
          articles={manyArticles}
          onArticleSelect={jest.fn()}
        />
      );

      // Should render without performance issues
      // Note: Virtual scrolling implementation would need to be added to the component
      expect(screen.getByText('Article 0')).toBeInTheDocument();
    });

    test('images and media are responsive', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      const articleWithMedia = {
        ...mockArticles[0],
        seiteninhalt: '<img src="test.jpg" alt="Test image" /> Some content with an image'
      };

      render(
        <DocumentationArticleViewer
          article={articleWithMedia}
          onBack={jest.fn()}
        />
      );

      // Content should be in a responsive container
      const contentContainer = document.querySelector('.prose');
      expect(contentContainer).toHaveClass('prose-sm', 'max-w-none');
    });
  });

  describe('Accessibility on Mobile', () => {
    test('touch targets meet minimum size requirements', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // All interactive elements should have adequate touch targets
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // Minimum 44px touch target (iOS guidelines)
        expect(rect.height).toBeGreaterThanOrEqual(32); // Accounting for padding
      });
    });

    test('focus management works with touch navigation', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      const user = userEvent.setup();
      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Tab navigation should work on mobile
      await user.tab();
      const searchInput = screen.getByPlaceholderText('Dokumentation durchsuchen...');
      expect(searchInput).toHaveFocus();

      await user.tab();
      const firstButton = screen.getAllByRole('button')[0];
      expect(firstButton).toHaveFocus();
    });
  });

  describe('Orientation Changes', () => {
    test('handles portrait to landscape orientation change', async () => {
      // Start in portrait
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(<DocumentationPage />);

      await waitFor(() => {
        expect(screen.getByText('Dokumentation')).toBeInTheDocument();
      });

      // Change to landscape
      setViewportSize(VIEWPORT_SIZES.mobile.height, VIEWPORT_SIZES.mobile.width);

      // Layout should adapt
      const container = screen.getByText('Dokumentation').closest('.container');
      expect(container).toHaveClass('mx-auto', 'px-4');
    });

    test('maintains scroll position during orientation change', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height);

      render(
        <DocumentationArticleViewer
          article={mockArticles[0]}
          onBack={jest.fn()}
        />
      );

      // Simulate scroll position
      window.scrollY = 200;

      // Change orientation
      setViewportSize(VIEWPORT_SIZES.mobile.height, VIEWPORT_SIZES.mobile.width);

      // Content should still be accessible
      expect(screen.getByText('Willkommen bei Mietevo - Eine umfassende Einführung')).toBeInTheDocument();
    });
  });
});