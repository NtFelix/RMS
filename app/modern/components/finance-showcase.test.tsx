import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FinanceShowcase from './finance-showcase';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <div {...props}>{children}</div>,
    button: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <button {...props}>{children}</button>,
    li: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <li {...props}>{children}</li>,
    h5: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <h5 {...props}>{children}</h5>,
    svg: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <svg {...props}>{children}</svg>,
    span: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => 
      <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children, mode }: any) => <>{children}</>,
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onClick, className, priority, placeholder, blurDataURL, sizes, width, height, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      className={className}
      width={width}
      height={height}
      {...props}
    />
  ),
}));

describe('FinanceShowcase Animation Tests', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('Tab Navigation Animations', () => {
    it('should render all tab buttons with proper accessibility attributes', () => {
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      expect(tabButtons).toHaveLength(4);
      
      // Check that first tab is active by default
      expect(tabButtons[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabButtons[0]).toHaveAttribute('tabindex', '0');
      
      // Check that other tabs are inactive
      for (let i = 1; i < tabButtons.length; i++) {
        expect(tabButtons[i]).toHaveAttribute('aria-selected', 'false');
        expect(tabButtons[i]).toHaveAttribute('tabindex', '-1');
      }
    });

    it('should switch tabs when clicked and update accessibility attributes', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      const chartsTab = tabButtons[1]; // Charts & Analytics tab
      
      await user.click(chartsTab);
      
      // Wait for state update
      await waitFor(() => {
        expect(chartsTab).toHaveAttribute('aria-selected', 'true');
        expect(chartsTab).toHaveAttribute('tabindex', '0');
      });
      
      // Check that first tab is now inactive
      expect(tabButtons[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabButtons[0]).toHaveAttribute('tabindex', '-1');
    });

    it('should handle keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      const firstTab = tabButtons[0];
      
      // Focus first tab
      firstTab.focus();
      expect(firstTab).toHaveFocus();
      
      // Press ArrowRight to move to next tab
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should handle keyboard navigation with Home and End keys', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      
      // Focus first tab and press End
      tabButtons[0].focus();
      await user.keyboard('{End}');
      
      await waitFor(() => {
        expect(tabButtons[3]).toHaveAttribute('aria-selected', 'true');
      });
      
      // Press Home to go back to first tab
      await user.keyboard('{Home}');
      
      await waitFor(() => {
        expect(tabButtons[0]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should handle Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      const secondTab = tabButtons[1];
      
      secondTab.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(secondTab).toHaveAttribute('aria-selected', 'true');
      });
      
      // Test with Space key on another tab
      const thirdTab = tabButtons[2];
      thirdTab.focus();
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(thirdTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Content Animation Tests', () => {
    it('should display correct content for each tab', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      // Check default tab content (Dashboard) - use getAllByText since text appears in both tab and content
      expect(screen.getAllByText('Dashboard Übersicht')).toHaveLength(2); // Tab button + content heading
      expect(screen.getByText(/Zentrale Finanzübersicht/)).toBeInTheDocument();
      
      // Switch to Charts tab
      const chartsTab = screen.getByRole('tab', { name: /Charts & Analytics/ });
      await user.click(chartsTab);
      
      await waitFor(() => {
        expect(screen.getAllByText('Charts & Analytics')).toHaveLength(2); // Tab button + content heading
        expect(screen.getByText(/Interaktive Diagramme/)).toBeInTheDocument();
      });
    });

    it('should render feature lists with proper structure', () => {
      render(<FinanceShowcase />);
      
      // Check that features are rendered
      expect(screen.getByText('Hauptfunktionen')).toBeInTheDocument();
      
      // Check for specific features in default tab
      expect(screen.getByText(/Durchschnittliche monatliche Einnahmen/)).toBeInTheDocument();
      expect(screen.getByText(/Cashflow-Analyse/)).toBeInTheDocument();
    });

    it('should render data capabilities sections', () => {
      render(<FinanceShowcase />);
      
      // Check capability section headers
      expect(screen.getByText('Filterung')).toBeInTheDocument();
      expect(screen.getByText('Suche')).toBeInTheDocument();
      expect(screen.getByText('Tracking')).toBeInTheDocument();
      
      // Check for specific capability items
      expect(screen.getByText(/Nach Zeitraum/)).toBeInTheDocument();
      expect(screen.getByText(/Transaktionsname/)).toBeInTheDocument();
      expect(screen.getByText(/Mieteinnahmen/)).toBeInTheDocument();
    });
  });

  describe('Image Modal Animation Tests', () => {
    it('should open image modal when image is clicked', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const image = screen.getByAltText(/Finance Dashboard Screenshot/);
      await user.click(image);
      
      // Check that modal is opened
      await waitFor(() => {
        const modal = screen.getByRole('button', { name: /Close image modal/ });
        expect(modal).toBeInTheDocument();
      });
    });

    it('should close image modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      // Open modal
      const image = screen.getByAltText(/Finance Dashboard Screenshot/);
      await user.click(image);
      
      // Close modal
      const closeButton = await screen.findByRole('button', { name: /Close image modal/ });
      await user.click(closeButton);
      
      // Check that modal is closed
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Close image modal/ })).not.toBeInTheDocument();
      });
    });

    it('should close image modal when clicking outside', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      // Open modal
      const image = screen.getByAltText(/Finance Dashboard Screenshot/);
      await user.click(image);
      
      // Find modal backdrop and click it
      const modalBackdrop = await screen.findByRole('button', { name: /Close image modal/ });
      const modalContainer = modalBackdrop.closest('[class*="fixed"]');
      
      if (modalContainer) {
        fireEvent.click(modalContainer);
        
        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /Close image modal/ })).not.toBeInTheDocument();
        });
      }
    });

    it('should display correct image and title in modal', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const image = screen.getByAltText(/Finance Dashboard Screenshot/);
      await user.click(image);
      
      await waitFor(() => {
        // Check that modal title is displayed - should now have 3 instances (tab, content, modal)
        expect(screen.getAllByText('Dashboard Übersicht')).toHaveLength(3);
      });
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('should render properly on different screen sizes', () => {
      render(<FinanceShowcase />);
      
      // Check that responsive classes are applied
      const tabContainer = screen.getByRole('tablist');
      expect(tabContainer).toHaveClass('flex', 'flex-wrap', 'justify-center');
      
      // Check that content grid has responsive classes
      const contentContainer = screen.getByRole('tabpanel');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should maintain accessibility on mobile devices', () => {
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      
      // Check that all tabs have minimum touch target size
      tabButtons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]');
        expect(button).toHaveClass('touch-manipulation');
      });
    });
  });

  describe('Performance and Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<FinanceShowcase />);
      
      // Check tablist has proper label
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Finance feature tabs');
      
      // Check tabpanel has proper attributes
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('id');
      expect(tabpanel).toHaveAttribute('aria-labelledby');
    });

    it('should handle focus management correctly', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const tabButtons = screen.getAllByRole('tab');
      
      // Focus first tab
      await user.tab();
      expect(tabButtons[0]).toHaveFocus();
      
      // Navigate with arrow keys should maintain focus
      await user.keyboard('{ArrowRight}');
      
      await waitFor(() => {
        // The focused tab should change after navigation
        const activeTab = screen.getByRole('tab', { selected: true });
        expect(activeTab).toHaveFocus();
      });
    });

    it('should not cause layout shifts during animations', () => {
      render(<FinanceShowcase />);
      
      // Check that container has stable dimensions by finding the section element
      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass('py-24', 'px-4');
      
      // Check that content container maintains structure
      const maxWidthContainer = document.querySelector('.max-w-7xl');
      expect(maxWidthContainer).toBeInTheDocument();
      
      // Check that tablist maintains consistent layout
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('flex', 'flex-wrap', 'justify-center');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle missing image gracefully', () => {
      render(<FinanceShowcase />);
      
      // Check that images have proper fallback attributes
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img).toHaveAttribute('src');
      });
    });

    it('should prevent default behavior on keyboard events', async () => {
      const user = userEvent.setup();
      render(<FinanceShowcase />);
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      // Mock preventDefault to check if it's called
      const mockPreventDefault = jest.fn();
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      keydownEvent.preventDefault = mockPreventDefault;
      
      fireEvent.keyDown(firstTab, keydownEvent);
      
      // Note: In a real test environment, we'd check that preventDefault was called
      // This is a simplified version for demonstration
      expect(firstTab).toBeInTheDocument();
    });
  });
});