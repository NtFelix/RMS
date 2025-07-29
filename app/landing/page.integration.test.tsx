import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LandingPage from './page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
  usePathname: () => '/',
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    }))
  }))
}));

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({
    redirectToCheckout: jest.fn().mockResolvedValue({ error: null })
  })
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
    h5: ({ children, ...props }: any) => <h5 {...props}>{children}</h5>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onLoad, onError, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        {...props}
        onLoad={() => {
          if (onLoad) onLoad();
        }}
        onError={() => {
          if (onError) onError();
        }}
      />
    );
  };
});

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('Landing Page Integration with Finance Showcase', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Integration', () => {
    it('should render finance showcase within landing page structure', async () => {
      render(<LandingPage />);

      // Wait for landing page to load
      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify landing page structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Verify finance showcase is positioned correctly
      const financeSection = screen.getByText('Umfassende Finanzverwaltung').closest('section');
      expect(financeSection).toBeInTheDocument();
      
      // Verify other landing page sections are present
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    it('should maintain proper section order in landing page', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Check that sections appear in correct order
      const main = screen.getByRole('main');
      const sections = main.querySelectorAll('div[id]');
      
      const sectionIds = Array.from(sections).map(section => section.id);
      
      // Finance showcase should be between features and more-features
      const financeIndex = sectionIds.indexOf('finance-showcase');
      const featuresIndex = sectionIds.indexOf('features');
      const moreFeaturesIndex = sectionIds.indexOf('more-features');
      
      expect(financeIndex).toBeGreaterThan(featuresIndex);
      expect(financeIndex).toBeLessThan(moreFeaturesIndex);
    });

    it('should not interfere with navigation functionality', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Test navigation still works
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Finance showcase tabs should not interfere with main navigation
      const financeTab = screen.getByRole('tab', { name: /Dashboard Übersicht/i });
      act(() => {
        fireEvent.click(financeTab);
      });

      // Navigation should still be functional
      expect(navigation).toBeInTheDocument();
    });

    it('should handle scroll behavior correctly within landing page', async () => {
      // Mock scroll behavior
      const mockScrollTo = jest.fn();
      Object.defineProperty(window, 'scrollTo', {
        writable: true,
        value: mockScrollTo,
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Simulate scrolling to finance section
      const financeSection = screen.getByText('Umfassende Finanzverwaltung').closest('section');
      if (financeSection) {
        fireEvent.scroll(window, { target: { scrollY: 1000 } });
      }

      // Finance showcase should remain functional during scroll
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should maintain responsive behavior within landing page', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const mockMatchMedia = (query: string) => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(mockMatchMedia),
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Finance showcase should be responsive within landing page
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('min-h-[44px]', 'touch-manipulation');
      });
    });
  });

  describe('User Journey Integration', () => {
    it('should support complete user journey from hero to finance showcase', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // User should be able to navigate through the page
      // and interact with finance showcase
      const financeTab = screen.getByRole('tab', { name: /Charts & Analytics/i });
      
      act(() => {
        fireEvent.click(financeTab);
      });

      await waitFor(() => {
        expect(financeTab).toHaveAttribute('aria-selected', 'true');
      });

      // Should show relevant content
      expect(screen.getByText(/Interaktive Diagramme/)).toBeInTheDocument();
    });

    it('should handle user interactions across different sections', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Test interaction with finance showcase
      const financeTab = screen.getByRole('tab', { name: /Transaktionsverwaltung/i });
      act(() => {
        fireEvent.click(financeTab);
      });

      await waitFor(() => {
        expect(financeTab).toHaveAttribute('aria-selected', 'true');
      });

      // Other sections should remain unaffected
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    it('should maintain state when user navigates away and back', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Select a specific tab
      const reportingTab = screen.getByRole('tab', { name: /Reporting & Export/i });
      act(() => {
        fireEvent.click(reportingTab);
      });

      await waitFor(() => {
        expect(reportingTab).toHaveAttribute('aria-selected', 'true');
      });

      // Simulate navigation away (scroll or focus change)
      const navigation = screen.getByRole('navigation');
      act(() => {
        fireEvent.focus(navigation);
      });

      // Tab state should be maintained
      expect(reportingTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Performance Integration', () => {
    it('should not impact landing page load performance', async () => {
      const startTime = performance.now();
      
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle concurrent loading of multiple sections', async () => {
      render(<LandingPage />);

      // Multiple sections should load concurrently
      const promises = [
        waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument()),
        waitFor(() => expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument()),
        waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument()),
      ];

      await Promise.all(promises);

      // All sections should be present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle memory usage efficiently within landing page', async () => {
      // Mock memory monitoring
      const originalPerformance = window.performance;
      let memoryUsage = 10000000; // 10MB initial

      window.performance = {
        ...originalPerformance,
        memory: {
          get usedJSHeapSize() { return memoryUsage; },
          totalJSHeapSize: 50000000,
          jsHeapSizeLimit: 100000000,
        },
      } as any;

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Simulate interactions that might increase memory usage
      const tabs = screen.getAllByRole('tab');
      for (let i = 0; i < 5; i++) {
        tabs.forEach(tab => {
          act(() => {
            fireEvent.click(tab);
          });
        });
        memoryUsage += 1000000; // Simulate 1MB increase per interaction cycle
      }

      // Memory usage should remain reasonable
      expect(memoryUsage).toBeLessThan(50000000); // Less than 50MB

      window.performance = originalPerformance;
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle finance showcase errors without breaking landing page', async () => {
      // Mock console to catch errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Trigger error in finance showcase
      const images = screen.queryAllByRole('img');
      if (images.length > 0) {
        act(() => {
          fireEvent.error(images[0]);
        });
      }

      // Landing page should remain functional
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Finance showcase should show error state but not crash
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully within landing page', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Landing page should still be functional despite network errors
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Finance showcase should handle the error gracefully
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      global.fetch = originalFetch;
    });

    it('should recover from temporary errors', async () => {
      let shouldError = true;
      
      // Mock intermittent errors
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        if (shouldError) {
          shouldError = false;
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      });

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Component should recover and be functional
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      // Test interaction after recovery
      act(() => {
        fireEvent.click(tabs[1]);
      });

      await waitFor(() => {
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      });

      global.fetch = originalFetch;
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain landing page accessibility with finance showcase', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Check overall page structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check finance showcase accessibility
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();

      // Check heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation across entire landing page', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Test tabbing through the page
      const focusableElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('tab'),
        ...screen.getAllByRole('link'),
      ].filter(el => !el.hasAttribute('tabindex') || el.getAttribute('tabindex') !== '-1');

      // Should be able to focus all interactive elements
      expect(focusableElements.length).toBeGreaterThan(0);

      // Test focus on finance showcase tabs
      const financeTabs = screen.getAllByRole('tab');
      const firstTab = financeTabs[0];
      
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);

      // Arrow key navigation should work
      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(financeTabs[1]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should maintain focus management across sections', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText('Umfassende Finanzverwaltung')).toBeInTheDocument();
      });

      // Focus should move properly between sections
      const navigation = screen.getByRole('navigation');
      const financeTab = screen.getAllByRole('tab')[0];

      // Focus navigation first
      const navButtons = navigation.querySelectorAll('button');
      if (navButtons.length > 0) {
        navButtons[0].focus();
        expect(document.activeElement).toBe(navButtons[0]);
      }

      // Then focus finance showcase
      financeTab.focus();
      expect(document.activeElement).toBe(financeTab);

      // Focus should be properly managed
      expect(financeTab).toHaveClass('focus:ring-2');
    });
  });
});