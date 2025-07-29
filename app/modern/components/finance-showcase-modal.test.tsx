import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FinanceShowcase from './finance-showcase';

// Mock framer-motion to avoid animation issues in tests
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
  return function MockImage({ src, alt, onLoad, onError, onClick, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
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

// Mock PillTabSwitcher component
jest.mock('@/components/ui/pill-tab-switcher', () => ({
  PillTabSwitcher: ({ tabs, activeTab, onTabChange }: any) => (
    <div data-testid="pill-tab-switcher">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.value)}
          data-testid={`tab-${tab.id}`}
          aria-selected={activeTab === tab.value}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

describe('FinanceShowcase Image Modal Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock document.body.style for modal scroll prevention
    Object.defineProperty(document.body, 'style', {
      value: { overflow: '' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any open modals
    document.body.style.overflow = '';
  });

  describe('Image Click Functionality', () => {
    it('should open modal when image is clicked', async () => {
      render(<FinanceShowcase />);
      
      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Find and click an image
      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toBeInTheDocument();
      
      await user.click(image);

      // Check if modal opens
      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should display correct image and title in modal', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        // Check modal content
        expect(screen.queryByText('Dashboard Übersicht')).toBeInTheDocument();
        expect(screen.getByAltText('Finance Dashboard Screenshot showing summary cards and key metrics')).toBeInTheDocument();
      });
    });

    it('should handle clicks on different tab images', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Switch to charts tab
      const chartsTab = screen.getByTestId('tab-charts');
      await user.click(chartsTab);

      const chartsImage = await screen.findByTestId('finance-image-Finance Charts showing income and expense trends with interactive analytics');
      expect(chartsImage).toBeInTheDocument();

      await user.click(chartsImage);

      // Check modal opens with charts content
      await waitFor(() => {
        expect(screen.getByText('Charts & Analytics')).toBeInTheDocument();
      });
    });

    it('should not be blocked by hover overlays', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Simulate hover to trigger overlays
      await user.hover(image);
      
      // Click should still work despite overlays
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when close button is clicked', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByLabelText('Schließen');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should close modal when clicking outside', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toBeInTheDocument();
        
        // Click on the backdrop (modal background)
        const backdrop = modal.parentElement;
        if (backdrop) {
          fireEvent.click(backdrop);
        }
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when Escape key is pressed', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      // Press Escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should prevent body scroll when modal is open', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
        expect(document.body.style.overflow).toBe('hidden');
      });

      // Close modal
      const closeButton = screen.getByLabelText('Schließen');
      await user.click(closeButton);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('unset');
      });
    });

    it('should not close modal when clicking on modal content', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(async () => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toBeInTheDocument();
        
        // Click on the modal content (not backdrop)
        const modalImages = await screen.findAllByAltText('Finance Dashboard Screenshot showing summary cards and key metrics');
        const modalImage = modalImages.find(img => img.closest('[role="dialog"]'));

        expect(modalImage).toBeInTheDocument();
        if (modalImage) {
          await user.click(modalImage);
        }
        
        // Modal should still be open
        expect(modal).toBeInTheDocument();
      });
    });
  });

  describe('Modal Content', () => {
    it('should display correct image dimensions and styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(async () => {
        const modalImages = await screen.findAllByAltText('Finance Dashboard Screenshot showing summary cards and key metrics');
        const modalImage = modalImages.find(img => img.closest('[role="dialog"]'));

        expect(modalImage).toBeInTheDocument();
        if (modalImage) {
          expect(modalImage).toHaveAttribute('width', '1200');
          expect(modalImage).toHaveAttribute('height', '900');
          expect(modalImage).toHaveClass('w-full', 'h-auto', 'object-contain', 'max-h-[80vh]');
        }
      });
    });

    it('should display title outside modal container', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const title = screen.queryByText('Dashboard Übersicht');
        expect(title).toBeInTheDocument();
        if (title) {
          expect(title).toHaveClass('absolute', '-top-12', 'left-0', 'text-white', 'text-lg', 'font-semibold');
        }
      });
    });

    it('should have proper glassmorphism styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'bg-black/80', 'backdrop-blur-sm', 'p-4');
        
        // Check image container styling
        const imageContainer = modal.querySelector('.bg-white\\/5');
        expect(imageContainer).toHaveClass('bg-white/5', 'backdrop-blur-sm', 'rounded-2xl', 'overflow-hidden', 'border', 'border-white/10');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Schließen');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('aria-label', 'Schließen');
      });
    });

    it('should be keyboard accessible', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Focus and activate with keyboard
      act(() => {
        image.focus();
      });
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      // Close with keyboard
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should trap focus within modal', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(async () => {
        const closeButton = screen.getByLabelText('Schließen');
        expect(closeButton).toBeInTheDocument();
        
        // Tab should focus the close button (only focusable element in modal)
        await user.tab();
        expect(closeButton).toHaveFocus();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing image data gracefully', async () => {
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Try to click an image that might have loading issues
      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Simulate image error
      fireEvent.error(image);
      
      // Click should still work
      await user.click(image);

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should cleanup event listeners on unmount', async () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Check that event listeners were cleaned up
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with rapid modal open/close', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Rapidly open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(image);
        
        await waitFor(() => {
          expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
        });
        
        await user.keyboard('{Escape}');
        
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
      
      // Should not cause any issues
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should handle concurrent modal operations', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      
      // Try to open modal multiple times quickly
      await Promise.all([
        user.click(image),
        user.click(image),
        user.click(image),
      ]);

      await waitFor(() => {
        // Should only have one modal open
        const modals = screen.getAllByRole('dialog', { hidden: true });
        expect(modals).toHaveLength(1);
      });
    });
  });
});