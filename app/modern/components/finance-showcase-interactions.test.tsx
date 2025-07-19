import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FinanceShowcase from './finance-showcase';

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

// Mock Next.js Image component with hover support
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onLoad, onError, onClick, className, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        {...props}
        onClick={onClick}
        onLoad={() => {
          if (onLoad) onLoad();
        }}
        onError={() => {
          if (onError) onError();
        }}
        data-testid={`finance-image-${alt}`}
      />
    );
  };
});

// Mock PillTabSwitcher
jest.mock('@/components/ui/pill-tab-switcher', () => ({
  PillTabSwitcher: ({ tabs, activeTab, onTabChange }: any) => (
    <div data-testid="pill-tab-switcher">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.value)}
          data-testid={`tab-${tab.id}`}
          aria-selected={activeTab === tab.value}
          className={activeTab === tab.value ? 'active' : ''}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

describe('FinanceShowcase Interactions', () => {
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

  describe('Hover Effects', () => {
    it('should show hover overlay on image hover', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const imageContainer = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics').closest('.group');
      expect(imageContainer).toBeInTheDocument();

      // Hover should trigger group-hover effects
      if (imageContainer) {
        await user.hover(imageContainer);
        
        // Check for hover overlay elements
        const overlays = imageContainer.querySelectorAll('.absolute');
        expect(overlays.length).toBeGreaterThan(0);
        
        // Check for zoom icon
        const zoomIcon = imageContainer.querySelector('svg');
        expect(zoomIcon).toBeInTheDocument();
      }
    });

    it('should apply scale transform on hover', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const imageContainer = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics').closest('.group');
      expect(imageContainer).toBeInTheDocument();

      if (imageContainer) {
        const scaleContainer = imageContainer.querySelector('.group-hover\\:scale-\\[1\\.02\\]');
        expect(scaleContainer).toBeInTheDocument();
        expect(scaleContainer).toHaveClass('transition-transform', 'duration-500');
      }
    });

    it('should show zoom icon with proper positioning', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const imageContainer = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics').closest('.group');
      
      if (imageContainer) {
        const zoomIconContainer = imageContainer.querySelector('.absolute.top-4.right-4');
        expect(zoomIconContainer).toBeInTheDocument();
        expect(zoomIconContainer).toHaveClass('bg-black/50', 'backdrop-blur-sm', 'rounded-full', 'p-2');
        
        const zoomIcon = zoomIconContainer?.querySelector('svg');
        expect(zoomIcon).toBeInTheDocument();
        expect(zoomIcon).toHaveClass('w-5', 'h-5', 'text-white');
      }
    });

    it('should have pointer-events-none on overlay elements', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const imageContainer = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics').closest('.group');
      
      if (imageContainer) {
        const overlays = imageContainer.querySelectorAll('.absolute.inset-0, .absolute.top-4.right-4');
        overlays.forEach(overlay => {
          expect(overlay).toHaveClass('pointer-events-none');
        });
      }
    });
  });

  describe('Tab Switching with Images', () => {
    it('should change images when switching tabs', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Initially should show dashboard image
      expect(screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics')).toBeInTheDocument();

      // Switch to charts tab
      const chartsTab = screen.getByTestId('tab-charts');
      await user.click(chartsTab);

      await waitFor(() => {
        expect(screen.getByTestId('finance-image-Finance Charts showing income and expense trends with interactive analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics')).not.toBeInTheDocument();
      });
    });

    it('should maintain hover effects across tab switches', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Switch to transactions tab
      const transactionsTab = screen.getByTestId('tab-transactions');
      await user.click(transactionsTab);

      await waitFor(() => {
        const imageContainer = screen.getByTestId('finance-image-Transaction management table with filtering and search capabilities').closest('.group');
        expect(imageContainer).toBeInTheDocument();
        
        if (imageContainer) {
          // Should have hover effects
          expect(imageContainer.querySelector('.group-hover\\:scale-\\[1\\.02\\]')).toBeInTheDocument();
          expect(imageContainer.querySelector('.absolute.top-4.right-4')).toBeInTheDocument();
        }
      });
    });

    it('should handle rapid tab switching without breaking image interactions', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const tabs = ['dashboard', 'charts', 'transactions', 'reporting'];
      
      // Rapidly switch between tabs
      for (const tabId of tabs) {
        const tab = screen.getByTestId(`tab-${tabId}`);
        await user.click(tab);
        
        await waitFor(() => {
          expect(tab).toHaveClass('active');
        });
      }

      // Final image should be clickable
      const finalImage = screen.getByTestId('finance-image-Financial reporting interface with export options');
      await user.click(finalImage);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });
  });

  describe('Image Loading States', () => {
    it('should handle image load events properly', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Simulate image load
      fireEvent.load(image);
      
      // Image should be clickable after loading
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should handle image error states gracefully', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Simulate image error
      fireEvent.error(image);
      
      // Should show fallback content but still be interactive
      const imageContainer = image.closest('.group');
      if (imageContainer) {
        // Should still have hover effects even with error
        expect(imageContainer.querySelector('.group-hover\\:scale-\\[1\\.02\\]')).toBeInTheDocument();
      }
    });

    it('should show fallback image with retry functionality', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Simulate image error to trigger fallback
      fireEvent.error(image);
      
      await waitFor(() => {
        // Should show fallback content
        expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument();
        
        // Should have retry button
        const retryButton = screen.getByText(/Erneut versuchen/);
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Touch and Mobile Interactions', () => {
    it('should handle touch events on images', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveClass('touch-manipulation');
      
      // Simulate touch events
      fireEvent.touchStart(image);
      fireEvent.touchEnd(image);
      
      // Should still be clickable
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should have proper cursor styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveClass('cursor-pointer');
    });
  });

  describe('Animation and Transitions', () => {
    it('should have proper transition classes', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const imageContainer = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics').closest('.group');
      
      if (imageContainer) {
        const scaleContainer = imageContainer.querySelector('.transition-transform');
        expect(scaleContainer).toHaveClass('duration-500');
        
        const overlays = imageContainer.querySelectorAll('.transition-opacity');
        overlays.forEach(overlay => {
          expect(overlay).toHaveClass('duration-300');
        });
      }
    });

    it('should handle animation cleanup on component unmount', async () => {
      const { unmount } = render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.hover(image);
      
      // Unmount during hover state
      unmount();
      
      // Should not cause any errors
      expect(true).toBe(true);
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain image aspect ratio', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveClass('w-full', 'h-auto', 'object-contain');
    });

    it('should have proper responsive sizing attributes', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveAttribute('width', '600');
      expect(image).toHaveAttribute('height', '400');
      expect(image).toHaveAttribute('sizes', '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px');
    });
  });

  describe('Integration with Tab System', () => {
    it('should sync image changes with active tab state', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Check initial state
      const dashboardTab = screen.getByTestId('tab-dashboard');
      expect(dashboardTab).toHaveClass('active');
      expect(screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics')).toBeInTheDocument();

      // Switch tab and verify image changes
      const reportingTab = screen.getByTestId('tab-reporting');
      await user.click(reportingTab);

      await waitFor(() => {
        expect(reportingTab).toHaveClass('active');
        expect(screen.getByTestId('finance-image-Financial reporting interface with export options')).toBeInTheDocument();
      });
    });

    it('should maintain modal functionality across all tabs', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const tabs = [
        { id: 'dashboard', imageAlt: 'Finance Dashboard Screenshot showing summary cards and key metrics', title: 'Dashboard Übersicht' },
        { id: 'charts', imageAlt: 'Finance Charts showing income and expense trends with interactive analytics', title: 'Charts & Analytics' },
        { id: 'transactions', imageAlt: 'Transaction management table with filtering and search capabilities', title: 'Transaktionsverwaltung' },
        { id: 'reporting', imageAlt: 'Financial reporting interface with export options', title: 'Reporting & Export' }
      ];

      for (const tab of tabs) {
        // Switch to tab
        const tabButton = screen.getByTestId(`tab-${tab.id}`);
        await user.click(tabButton);

        await waitFor(() => {
          expect(tabButton).toHaveClass('active');
        });

        // Click image to open modal
        const image = screen.getByTestId(`finance-image-${tab.imageAlt}`);
        await user.click(image);

        await waitFor(() => {
          expect(screen.getByText(tab.title)).toBeInTheDocument();
          expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
        });

        // Close modal
        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
    });
  });
});