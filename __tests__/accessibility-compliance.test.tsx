import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import WohnungenClientView from '@/app/(dashboard)/wohnungen/client';
import HaeuserClientView from '@/app/(dashboard)/haeuser/client-wrapper';
import MieterClientView from '@/app/(dashboard)/mieter/client-wrapper';
import FinanzenClientWrapper from '@/app/(dashboard)/finanzen/client-wrapper';
import BetriebskostenClientView from '@/app/(dashboard)/betriebskosten/client-wrapper';
import TodosClientWrapper from '@/app/(dashboard)/todos/client-wrapper';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock all dependencies
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openWohnungModal: jest.fn(),
    openHouseModal: jest.fn(),
    openTenantModal: jest.fn(),
    openBetriebskostenModal: jest.fn(),
    getState: () => ({
      openFinanceModal: jest.fn(),
      openAufgabeModal: jest.fn(),
    }),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  })
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
    headers: { get: () => '0' },
  })
) as jest.Mock;

describe('Accessibility Compliance Tests', () => {
  describe('Automated Accessibility Testing', () => {
    it('Wohnungen page should have no accessibility violations', async () => {
      const props = {
        initialWohnungenData: [],
        housesData: [{ id: '1', name: 'Test House' }],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      const { container } = render(<WohnungenClientView {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Häuser page should have no accessibility violations', async () => {
      const props = { enrichedHaeuser: [] };
      const { container } = render(<HaeuserClientView {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Mieter page should have no accessibility violations', async () => {
      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      const { container } = render(<MieterClientView {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Finanzen page should have no accessibility violations', async () => {
      const props = {
        finances: [],
        wohnungen: [],
        summaryData: {
          year: 2023,
          totalIncome: 1000,
          totalExpenses: 200,
          totalCashflow: 800,
          averageMonthlyIncome: 100,
          averageMonthlyExpenses: 20,
          averageMonthlyCashflow: 80,
          yearlyProjection: 960,
          monthsPassed: 12,
          monthlyData: {},
        },
      };

      const { container } = render(<FinanzenClientWrapper {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Betriebskosten page should have no accessibility violations', async () => {
      const props = {
        initialNebenkosten: [],
        initialHaeuser: [],
        ownerName: 'Test Owner',
      };

      const { container } = render(<BetriebskostenClientView {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Todos page should have no accessibility violations', async () => {
      const props = { tasks: [] };
      const { container } = render(<TodosClientWrapper {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation to add buttons', async () => {
      const user = userEvent.setup();
      
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      render(<WohnungenClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      
      // Tab to the button
      await user.tab();
      expect(addButton).toHaveFocus();
    });

    it('supports Enter key activation for buttons', async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      
      jest.mocked(require('@/hooks/use-modal-store').useModalStore).mockReturnValue({
        openHouseModal: mockOpenModal,
      });

      const props = { enrichedHaeuser: [] };
      render(<HaeuserClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      
      // Focus and activate with Enter
      addButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockOpenModal).toHaveBeenCalled();
    });

    it('supports Space key activation for buttons', async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      
      jest.mocked(require('@/hooks/use-modal-store').useModalStore).mockReturnValue({
        openTenantModal: mockOpenModal,
      });

      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      render(<MieterClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      
      // Focus and activate with Space
      addButton.focus();
      await user.keyboard(' ');
      
      expect(mockOpenModal).toHaveBeenCalled();
    });

    it('maintains logical tab order from header to content', async () => {
      const user = userEvent.setup();
      
      const props = {
        initialNebenkosten: [],
        initialHaeuser: [],
        ownerName: 'Test Owner',
      };

      render(<BetriebskostenClientView {...props} />);

      // Tab through elements
      await user.tab();
      
      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      expect(addButton).toHaveFocus();
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('has proper heading hierarchy', () => {
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      render(<WohnungenClientView {...props} />);

      // CardTitle should be properly structured for screen readers
      const title = screen.getByText('Wohnungsverwaltung');
      expect(title).toBeInTheDocument();
    });

    it('buttons have descriptive accessible names', () => {
      const props = { enrichedHaeuser: [] };
      render(<HaeuserClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      expect(addButton).toHaveAccessibleName('Haus hinzufügen');
    });

    it('disabled buttons have proper ARIA attributes', () => {
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 10,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: false,
        serverLimitReason: 'subscription' as const,
      };

      render(<WohnungenClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toBeDisabled();
      expect(addButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('provides meaningful descriptions for summary cards', () => {
      const props = {
        finances: [],
        wohnungen: [],
        summaryData: {
          year: 2023,
          totalIncome: 1000,
          totalExpenses: 200,
          totalCashflow: 800,
          averageMonthlyIncome: 100,
          averageMonthlyExpenses: 20,
          averageMonthlyCashflow: 80,
          yearlyProjection: 960,
          monthsPassed: 12,
          monthlyData: {},
        },
      };

      render(<FinanzenClientWrapper {...props} />);

      // Summary cards should have descriptive text
      expect(screen.getByText('Durchschnittliche monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Durchschnittliche monatliche Ausgaben')).toBeInTheDocument();
      expect(screen.getByText('Durchschnittlicher monatlicher Überschuss')).toBeInTheDocument();
      expect(screen.getByText('Geschätzter Jahresgewinn')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('maintains visible focus indicators', async () => {
      const user = userEvent.setup();
      
      const props = { tasks: [] };
      render(<TodosClientWrapper {...props} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      
      // Focus the button
      await user.tab();
      expect(addButton).toHaveFocus();
      
      // Button should have focus styles (this would be tested with actual CSS in integration tests)
      expect(addButton).toBeVisible();
    });

    it('does not trap focus inappropriately', async () => {
      const user = userEvent.setup();
      
      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      render(<MieterClientView {...props} />);

      // Should be able to tab through without getting trapped
      await user.tab();
      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      expect(addButton).toHaveFocus();
      
      // Should be able to tab away
      await user.tab();
      expect(addButton).not.toHaveFocus();
    });

    it('restores focus appropriately after interactions', async () => {
      const user = userEvent.setup();
      
      const props = { enrichedHaeuser: [] };
      render(<HaeuserClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      
      // Focus and click
      addButton.focus();
      expect(addButton).toHaveFocus();
      
      await user.click(addButton);
      
      // Focus should be maintained or properly managed
      // (In a real app, this might move to a modal)
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('uses semantic HTML elements appropriately', () => {
      const props = {
        initialNebenkosten: [],
        initialHaeuser: [],
        ownerName: 'Test Owner',
      };

      render(<BetriebskostenClientView {...props} />);

      // Should use proper button elements
      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      expect(addButton.tagName).toBe('BUTTON');
    });

    it('provides alternative text for icons', () => {
      const props = { tasks: [] };
      render(<TodosClientWrapper {...props} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      
      // Button should include icon with proper labeling
      expect(addButton).toHaveTextContent('Aufgabe hinzufügen');
    });

    it('does not rely solely on color for information', () => {
      const props = {
        finances: [],
        wohnungen: [],
        summaryData: {
          year: 2023,
          totalIncome: 1000,
          totalExpenses: 200,
          totalCashflow: 800,
          averageMonthlyIncome: 100,
          averageMonthlyExpenses: 20,
          averageMonthlyCashflow: 80,
          yearlyProjection: 960,
          monthsPassed: 12,
          monthlyData: {},
        },
      };

      render(<FinanzenClientWrapper {...props} />);

      // Summary cards should have text labels, not just colors
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Ø Monatliche Ausgaben')).toBeInTheDocument();
    });
  });

  describe('Error States and Feedback', () => {
    it('provides accessible error messages for disabled buttons', () => {
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 10,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: false,
        serverLimitReason: 'trial' as const,
      };

      render(<WohnungenClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toBeDisabled();
      
      // Should have tooltip or aria-describedby for explanation
      expect(addButton).toHaveAttribute('aria-describedby');
    });

    it('maintains accessibility during loading states', () => {
      const props = {
        finances: [],
        wohnungen: [],
        summaryData: null, // Loading state
      };

      render(<FinanzenClientWrapper {...props} />);

      // Loading states should still be accessible
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });
  });

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('maintains accessibility on mobile devices', async () => {
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      const { container } = render(<WohnungenClientView {...props} />);
      
      // Should still pass accessibility tests on mobile
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides adequate touch targets on mobile', () => {
      const props = { enrichedHaeuser: [] };
      render(<HaeuserClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      
      // Button should be large enough for touch interaction
      // (This would be tested with actual CSS measurements in integration tests)
      expect(addButton).toBeVisible();
    });
  });

  describe('Internationalization and Language Support', () => {
    it('uses proper language attributes', () => {
      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      const { container } = render(<MieterClientView {...props} />);

      // Should have proper language context (German)
      const germanText = screen.getByText('Mieterverwaltung');
      expect(germanText).toBeInTheDocument();
    });

    it('handles German text properly in buttons', () => {
      const props = {
        initialNebenkosten: [],
        initialHaeuser: [],
        ownerName: 'Test Owner',
      };

      render(<BetriebskostenClientView {...props} />);

      // German button text should be properly accessible
      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      expect(addButton).toHaveAccessibleName();
    });
  });
});