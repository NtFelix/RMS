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

// Mock Next.js Image component
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

// Mock PillTabSwitcher with enhanced hover testing
jest.mock('@/components/ui/pill-tab-switcher', () => ({
  PillTabSwitcher: ({ tabs, activeTab, onTabChange, className }: any) => (
    <div 
      data-testid="pill-tab-switcher" 
      className={className}
      role="tablist"
      aria-label="Finance feature tabs"
    >
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.value)}
          onMouseEnter={() => {}} // Mock hover events
          onMouseLeave={() => {}}
          data-testid={`tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`pill-tab ${activeTab === tab.value ? 'active' : ''} transition-all duration-200 ease-out hover:scale-105`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

describe('FinanceShowcase UI Components', () => {
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

  describe('Tab Pills UI', () => {
    it('should render tab pills with proper styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        const tabSwitcher = screen.getByTestId('pill-tab-switcher');
        expect(tabSwitcher).toBeInTheDocument();
        expect(tabSwitcher).toHaveAttribute('role', 'tablist');
        expect(tabSwitcher).toHaveAttribute('aria-label', 'Finance feature tabs');
      });

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
      
      tabs.forEach(tab => {
        expect(tab).toHaveClass('pill-tab', 'transition-all', 'duration-200', 'ease-out', 'hover:scale-105');
      });
    });

    it('should show active tab with proper styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        const activeTab = screen.getByTestId('tab-dashboard');
        expect(activeTab).toHaveClass('active');
        expect(activeTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should handle tab hover effects', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const chartsTab = screen.getByTestId('tab-charts');
      expect(chartsTab).toHaveClass('hover:scale-105');
      
      // Hover should not affect active tab differently
      await user.hover(chartsTab);
      expect(chartsTab).toBeInTheDocument();
    });

    it('should maintain smooth transitions between tabs', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const dashboardTab = screen.getByTestId('tab-dashboard');
      const chartsTab = screen.getByTestId('tab-charts');
      
      expect(dashboardTab).toHaveClass('active');
      
      await user.click(chartsTab);
      
      await waitFor(() => {
        expect(chartsTab).toHaveClass('active');
        expect(dashboardTab).not.toHaveClass('active');
      });
    });
  });

  describe('Image Hover Effects', () => {
    it('should apply correct hover classes to image containers', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      expect(imageContainer).toBeInTheDocument();
      if (imageContainer) {
        const scaleContainer = imageContainer.querySelector('.group-hover\\:scale-\\[1\\.02\\]');
        expect(scaleContainer).toHaveClass('transition-transform', 'duration-500');
      }
    });

    it('should show gradient overlay on hover', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        const gradientOverlay = imageContainer.querySelector('.bg-gradient-to-t.from-black\\/20');
        expect(gradientOverlay).toBeInTheDocument();
        expect(gradientOverlay).toHaveClass('absolute', 'inset-0', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity', 'duration-300', 'pointer-events-none');
      }
    });

    it('should display zoom icon with proper styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        const zoomIconContainer = imageContainer.querySelector('.absolute.top-4.right-4');
        expect(zoomIconContainer).toBeInTheDocument();
        expect(zoomIconContainer).toHaveClass(
          'bg-black/50', 
          'backdrop-blur-sm', 
          'rounded-full', 
          'p-2', 
          'opacity-0', 
          'group-hover:opacity-100', 
          'transition-opacity', 
          'duration-300',
          'pointer-events-none'
        );
        
        const zoomIcon = zoomIconContainer?.querySelector('svg');
        expect(zoomIcon).toBeInTheDocument();
        expect(zoomIcon).toHaveClass('w-5', 'h-5', 'text-white');
      }
    });

    it('should not interfere with click events due to pointer-events-none', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        const overlays = imageContainer.querySelectorAll('.absolute.pointer-events-none');
        expect(overlays.length).toBeGreaterThan(0);
        
        overlays.forEach(overlay => {
          expect(overlay).toHaveClass('pointer-events-none');
        });
      }
      
      // Click should still work
      await user.click(image);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });
  });

  describe('Modal UI Styling', () => {
    it('should have proper glassmorphism backdrop', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toHaveClass(
          'fixed', 
          'inset-0', 
          'z-50', 
          'flex', 
          'items-center', 
          'justify-center', 
          'bg-black/80', 
          'backdrop-blur-sm', 
          'p-4'
        );
      });
    });

    it('should have proper modal container styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        const container = modal.querySelector('.relative.max-w-6xl');
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('relative', 'max-w-6xl', 'max-h-[90vh]', 'w-full');
      });
    });

    it('should have properly styled close button', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Schließen');
        expect(closeButton).toHaveClass(
          'absolute', 
          '-top-12', 
          'right-0', 
          'bg-white/10', 
          'hover:bg-white/20', 
          'backdrop-blur-sm', 
          'rounded-full', 
          'p-2', 
          'transition-colors', 
          'duration-200', 
          'z-10'
        );
      });
    });

    it('should have properly positioned title', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        const title = modal.querySelector('#modal-title');
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent('Dashboard-Karten');
        if (title) {
          expect(title).toHaveClass('absolute', '-top-12', 'left-0', 'text-white', 'text-lg', 'font-semibold');
        }
      });
    });

    it('should have proper image container styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        const imageContainer = modal.querySelector('.bg-white\\/5');
        expect(imageContainer).toBeInTheDocument();
        expect(imageContainer).toHaveClass(
          'relative', 
          'bg-white/5', 
          'backdrop-blur-sm', 
          'rounded-2xl', 
          'overflow-hidden', 
          'border', 
          'border-white/10'
        );
      });
    });

    it('should have proper modal image styling', async () => {
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
          expect(modalImage).toHaveClass('w-full', 'h-auto', 'object-contain', 'max-h-[80vh]');
          expect(modalImage).toHaveAttribute('width', '1200');
          expect(modalImage).toHaveAttribute('height', '900');
        }
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive image sizing', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveAttribute('sizes', '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px');
      expect(image).toHaveClass('w-full', 'h-auto', 'object-contain');
    });

    it('should maintain aspect ratio across different screen sizes', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      expect(image).toHaveAttribute('width', '600');
      expect(image).toHaveAttribute('height', '400');
    });
  });

  describe('Animation Consistency', () => {
    it('should have consistent transition durations', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      // Check tab transitions
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('duration-200');
      });

      // Check image hover transitions
      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        const scaleContainer = imageContainer.querySelector('.duration-500');
        expect(scaleContainer).toBeInTheDocument();
        
        const overlays = imageContainer.querySelectorAll('.duration-300');
        expect(overlays.length).toBeGreaterThan(0);
      }
    });

    it('should use consistent easing functions', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('ease-out');
      });
    });
  });

  describe('Visual Hierarchy', () => {
    it('should have proper z-index layering', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toHaveClass('z-50');
        
        const closeButton = screen.getByLabelText('Schließen');
        expect(closeButton).toHaveClass('z-10');
      });
    });

    it('should maintain proper visual contrast', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        const zoomIcon = imageContainer.querySelector('svg');
        expect(zoomIcon).toHaveClass('text-white');
        
        const iconContainer = imageContainer.querySelector('.bg-black\\/50');
        expect(iconContainer).toBeInTheDocument();
      }
    });
  });

  describe('Feature-Sections Consistency', () => {
    it('should match feature-sections hover pattern', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      const imageContainer = image.closest('.group');
      
      if (imageContainer) {
        // Should have same scale effect as feature-sections
        expect(imageContainer.querySelector('.group-hover\\:scale-\\[1\\.02\\]')).toBeInTheDocument();
        
        // Should have same gradient overlay
        expect(imageContainer.querySelector('.bg-gradient-to-t.from-black\\/20')).toBeInTheDocument();
        
        // Should have same zoom icon positioning
        expect(imageContainer.querySelector('.absolute.top-4.right-4')).toBeInTheDocument();
      }
    });

    it('should match feature-sections modal styling', async () => {
      render(<FinanceShowcase />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pill-tab-switcher')).toBeInTheDocument();
      });

      const image = screen.getByTestId('finance-image-Finance Dashboard Screenshot showing summary cards and key metrics');
      await user.click(image);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        
        // Should match feature-sections backdrop
        expect(modal).toHaveClass('bg-black/80', 'backdrop-blur-sm');
        
        // Should match feature-sections container size
        const container = modal.querySelector('.max-w-6xl');
        expect(container).toBeInTheDocument();
        
        // Should match feature-sections glassmorphism
        const imageContainer = modal.querySelector('.bg-white\\/5');
        expect(imageContainer).toHaveClass('backdrop-blur-sm', 'rounded-2xl', 'border-white/10');
      });
    });
  });
});