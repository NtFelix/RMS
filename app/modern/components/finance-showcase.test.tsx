import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanceShowcase from './finance-showcase';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

describe('FinanceShowcase Tab Navigation', () => {
  beforeEach(() => {
    render(<FinanceShowcase />);
  });

  describe('Tab Button Components', () => {
    it('renders all tab buttons with correct titles', () => {
      expect(screen.getByRole('tab', { name: 'Dashboard Übersicht' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Charts & Analytics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Transaktionsverwaltung' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Reporting & Export' })).toBeInTheDocument();
    });

    it('has correct ARIA attributes for accessibility', () => {
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const secondTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      expect(firstTab).toHaveAttribute('aria-selected', 'true');
      expect(firstTab).toHaveAttribute('aria-controls', 'tabpanel-dashboard');
      expect(firstTab).toHaveAttribute('id', 'tab-dashboard');
      expect(firstTab).toHaveAttribute('tabIndex', '0');

      expect(secondTab).toHaveAttribute('aria-selected', 'false');
      expect(secondTab).toHaveAttribute('aria-controls', 'tabpanel-charts');
      expect(secondTab).toHaveAttribute('id', 'tab-charts');
      expect(secondTab).toHaveAttribute('tabIndex', '-1');
    });

    it('applies active state styling correctly', () => {
      const activeTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const inactiveTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      expect(activeTab).toHaveClass('border-blue-500', 'text-blue-600', 'bg-blue-50/50');
      expect(inactiveTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('Tab Switching Logic', () => {
    it('switches tabs when clicked', async () => {
      const user = userEvent.setup();
      const chartsTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      await user.click(chartsTab);

      await waitFor(() => {
        expect(chartsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Dashboard Übersicht' })).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('updates tab content when switching tabs', async () => {
      const user = userEvent.setup();
      
      // Initially shows dashboard content
      expect(screen.getByText(/Zentrale Finanzübersicht mit wichtigen Kennzahlen/)).toBeInTheDocument();
      
      // Click on charts tab
      const chartsTab = screen.getByRole('tab', { name: 'Charts & Analytics' });
      await user.click(chartsTab);

      await waitFor(() => {
        expect(screen.getByText(/Interaktive Diagramme zeigen Einnahmen-\/Ausgabentrends/)).toBeInTheDocument();
      });
    });

    it('applies smooth transition effects during tab switching', async () => {
      const user = userEvent.setup();
      const chartsTab = screen.getByRole('tab', { name: 'Charts & Analytics' });
      
      await user.click(chartsTab);
      
      // Check that transition classes are applied
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveClass('transition-opacity', 'duration-300', 'ease-in-out');
    });

    it('does not switch when clicking the already active tab', async () => {
      const user = userEvent.setup();
      const activeTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      
      // Click the already active tab
      await user.click(activeTab);
      
      // Should remain active
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('navigates to next tab with ArrowRight key', async () => {
      const user = userEvent.setup();
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const secondTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      firstTab.focus();
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(secondTab).toHaveAttribute('aria-selected', 'true');
        expect(secondTab).toHaveFocus();
      });
    });

    it('navigates to previous tab with ArrowLeft key', async () => {
      const user = userEvent.setup();
      
      // First switch to second tab
      const secondTab = screen.getByRole('tab', { name: 'Charts & Analytics' });
      await user.click(secondTab);
      
      await waitFor(() => {
        expect(secondTab).toHaveAttribute('aria-selected', 'true');
      });

      // Then navigate back with ArrowLeft
      secondTab.focus();
      await user.keyboard('{ArrowLeft}');

      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      await waitFor(() => {
        expect(firstTab).toHaveAttribute('aria-selected', 'true');
        expect(firstTab).toHaveFocus();
      });
    });

    it('wraps around when navigating past the last tab with ArrowRight', async () => {
      const user = userEvent.setup();
      const lastTab = screen.getByRole('tab', { name: 'Reporting & Export' });
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });

      // Navigate to last tab first
      await user.click(lastTab);
      await waitFor(() => {
        expect(lastTab).toHaveAttribute('aria-selected', 'true');
      });

      // Press ArrowRight to wrap around
      lastTab.focus();
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(firstTab).toHaveAttribute('aria-selected', 'true');
        expect(firstTab).toHaveFocus();
      });
    });

    it('wraps around when navigating past the first tab with ArrowLeft', async () => {
      const user = userEvent.setup();
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const lastTab = screen.getByRole('tab', { name: 'Reporting & Export' });

      firstTab.focus();
      await user.keyboard('{ArrowLeft}');

      await waitFor(() => {
        expect(lastTab).toHaveAttribute('aria-selected', 'true');
        expect(lastTab).toHaveFocus();
      });
    });

    it('navigates to first tab with Home key', async () => {
      const user = userEvent.setup();
      
      // Navigate to a middle tab first
      const middleTab = screen.getByRole('tab', { name: 'Charts & Analytics' });
      await user.click(middleTab);
      
      await waitFor(() => {
        expect(middleTab).toHaveAttribute('aria-selected', 'true');
      });

      // Press Home key
      middleTab.focus();
      await user.keyboard('{Home}');

      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      await waitFor(() => {
        expect(firstTab).toHaveAttribute('aria-selected', 'true');
        expect(firstTab).toHaveFocus();
      });
    });

    it('navigates to last tab with End key', async () => {
      const user = userEvent.setup();
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const lastTab = screen.getByRole('tab', { name: 'Reporting & Export' });

      firstTab.focus();
      await user.keyboard('{End}');

      await waitFor(() => {
        expect(lastTab).toHaveAttribute('aria-selected', 'true');
        expect(lastTab).toHaveFocus();
      });
    });

    it('activates tab with Enter key', async () => {
      const user = userEvent.setup();
      const secondTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      secondTab.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(secondTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('activates tab with Space key', async () => {
      const user = userEvent.setup();
      const secondTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      secondTab.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(secondTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('ignores other keys', async () => {
      const user = userEvent.setup();
      const firstTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });

      firstTab.focus();
      await user.keyboard('{Escape}');

      // Should remain on first tab
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Accessibility Features', () => {
    it('has proper tablist role and aria-label', () => {
      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveAttribute('aria-label', 'Finance feature tabs');
    });

    it('has proper tabpanel with correct attributes', () => {
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('id', 'tabpanel-dashboard');
      expect(tabPanel).toHaveAttribute('aria-labelledby', 'tab-dashboard');
    });

    it('updates tabpanel attributes when switching tabs', async () => {
      const user = userEvent.setup();
      const chartsTab = screen.getByRole('tab', { name: 'Charts & Analytics' });

      await user.click(chartsTab);

      await waitFor(() => {
        const tabPanel = screen.getByRole('tabpanel');
        expect(tabPanel).toHaveAttribute('id', 'tabpanel-charts');
        expect(tabPanel).toHaveAttribute('aria-labelledby', 'tab-charts');
      });
    });

    it('manages focus correctly with tabIndex', () => {
      const activeTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const inactiveTabs = [
        screen.getByRole('tab', { name: 'Charts & Analytics' }),
        screen.getByRole('tab', { name: 'Transaktionsverwaltung' }),
        screen.getByRole('tab', { name: 'Reporting & Export' })
      ];

      expect(activeTab).toHaveAttribute('tabIndex', '0');
      inactiveTabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('Visual Enhancements', () => {
    it('shows gradient background for active tab', () => {
      const activeTab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      const gradientDiv = activeTab.querySelector('.bg-gradient-to-r');
      
      expect(gradientDiv).toBeInTheDocument();
      expect(gradientDiv).toHaveClass('from-blue-50', 'to-blue-100', 'opacity-50');
    });

    it('applies hover styles to inactive tabs', () => {
      const inactiveTab = screen.getByRole('tab', { name: 'Charts & Analytics' });
      
      expect(inactiveTab).toHaveClass('hover:text-gray-700', 'hover:border-gray-300', 'hover:bg-gray-50/50');
    });

    it('applies focus ring styles for keyboard navigation', () => {
      const tab = screen.getByRole('tab', { name: 'Dashboard Übersicht' });
      
      expect(tab).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2',
        'focus:ring-offset-white'
      );
    });
  });
});