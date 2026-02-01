import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Create mock functions that can be tracked
const mockOpenWohnungModal = jest.fn();
const mockOpenHouseModal = jest.fn();
const mockOpenTenantModal = jest.fn();
const mockOpenBetriebskostenModal = jest.fn();
const mockOpenFinanceModal = jest.fn();
const mockOpenAufgabeModal = jest.fn();

// Mock all dependencies to focus on layout testing
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openWohnungModal: mockOpenWohnungModal,
    openHouseModal: mockOpenHouseModal,
    openTenantModal: mockOpenTenantModal,
    openBetriebskostenModal: mockOpenBetriebskostenModal,
    getState: () => ({
      openFinanceModal: mockOpenFinanceModal,
      openAufgabeModal: mockOpenAufgabeModal,
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

// Mock components that might cause issues
jest.mock('@/components/tables/apartment-table', () => ({
  ApartmentTable: () => <div role="table">Apartment Table</div>
}));

jest.mock('@/components/tables/house-table', () => ({
  HouseTable: () => <div role="table">House Table</div>
}));

jest.mock('@/components/tables/tenant-table', () => ({
  TenantTable: () => <div role="table">Tenant Table</div>
}));

jest.mock('@/components/tables/operating-costs-table', () => ({
  OperatingCostsTable: () => <div role="table">Operating Costs Table</div>
}));

jest.mock('@/components/tasks/task-board', () => ({
  TaskBoard: () => <div role="table">Task Board</div>
}));

jest.mock('@/components/finance-transactions', () => ({
  FinanceTransactions: () => <div role="table">Finance Transactions</div>
}));

jest.mock('@/components/finance/finance-visualization', () => ({
  FinanceVisualization: () => <div>Finance Visualization</div>
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
    headers: { get: () => '0' },
  })
) as jest.Mock;

describe('Layout Changes Integration Tests', () => {
  describe('Header-Button Layout Structure', () => {
    it('Wohnungen page has correct inline header-button layout', async () => {
      const WohnungenClientView = (await import('@/app/(dashboard)/wohnungen/client')).default;
      
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      const { container } = render(<WohnungenClientView {...props} />);

      // Should have card-based layout without redundant page header
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Wohnung hinzufügen/i })).toBeInTheDocument();
      
      // Should NOT have old page header
      expect(screen.queryByText('Wohnungen')).not.toBeInTheDocument();
      
      // Should have inline header-button layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });

    it('Häuser page has correct inline header-button layout', async () => {
      const HaeuserClientView = (await import('@/app/(dashboard)/haeuser/client-wrapper')).default;
      
      const props = { enrichedHaeuser: [] };
      const { container } = render(<HaeuserClientView {...props} />);

      // Should have card-based layout
      expect(screen.getByText('Hausliste')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Haus hinzufügen/i })).toBeInTheDocument();
      
      // Should have inline header-button layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });

    it('Mieter page has correct inline header-button layout', async () => {
      const MieterClientView = (await import('@/app/(dashboard)/mieter/client-wrapper')).default;
      
      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      const { container } = render(<MieterClientView {...props} />);

      // Should have card-based layout
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mieter hinzufügen/i })).toBeInTheDocument();
      
      // Should have inline header-button layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });

    it('Betriebskosten page has correct inline header-button layout', async () => {
      const BetriebskostenClientView = (await import('@/app/(dashboard)/betriebskosten/client-wrapper')).default;
      
      const props = {
        initialNebenkosten: [],
        initialHaeuser: [],
        ownerName: 'Test Owner',
      };

      const { container } = render(<BetriebskostenClientView {...props} />);

      // Should have card-based layout
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i })).toBeInTheDocument();
      
      // Should have inline header-button layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });

    it('Todos page has correct inline header-button layout', async () => {
      const TodosClientWrapper = (await import('@/app/(dashboard)/todos/client-wrapper')).default;
      
      const props = { tasks: [] };
      const { container } = render(<TodosClientWrapper {...props} />);

      // Should have card-based layout
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aufgabe hinzufügen/i })).toBeInTheDocument();
      
      // Should have inline header-button layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });
  });

  describe('Finanzen Special Layout', () => {
    it('has special layout with summary cards and repositioned saldo', async () => {
      const FinanzenClientWrapper = (await import('@/app/(dashboard)/finanzen/client-wrapper')).default;
      
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

      // Should have summary cards at top
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Ø Monatliche Ausgaben')).toBeInTheDocument();
      
      // Should have summary cards grid
      const summaryGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(summaryGrid).toBeInTheDocument();
      
      // Should have saldo display (positioned separately)
      expect(screen.getByText('Aktueller Saldo')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Classes', () => {
    it('all pages have consistent responsive layout classes', async () => {
      const components = [
        { 
          component: (await import('@/app/(dashboard)/wohnungen/client')).default,
          props: { 
            initialWohnungenData: [], 
            housesData: [], 
            serverApartmentCount: 0, 
            serverApartmentLimit: 10, 
            serverUserIsEligibleToAdd: true, 
            serverLimitReason: 'none' as const 
          }
        },
        { 
          component: (await import('@/app/(dashboard)/haeuser/client-wrapper')).default,
          props: { enrichedHaeuser: [] }
        },
        { 
          component: (await import('@/app/(dashboard)/mieter/client-wrapper')).default,
          props: { initialTenants: [], initialWohnungen: [], serverAction: jest.fn() }
        },
        { 
          component: (await import('@/app/(dashboard)/betriebskosten/client-wrapper')).default,
          props: { initialNebenkosten: [], initialHaeuser: [], ownerName: 'Test' }
        },
        { 
          component: (await import('@/app/(dashboard)/todos/client-wrapper')).default,
          props: { tasks: [] }
        },
      ];

      for (const { component: Component, props } of components) {
        const { container } = render(<Component {...(props as any)} />);
        
        // All should have consistent main container layout
        const mainContainer = container.firstChild;
        expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
      }
    });

    it('buttons have responsive width classes', async () => {
      const WohnungenClientView = (await import('@/app/(dashboard)/wohnungen/client')).default;
      
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
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Button Functionality', () => {
    it('buttons are clickable and trigger modal functions', async () => {
      // Clear any previous calls
      mockOpenWohnungModal.mockClear();

      const WohnungenClientView = (await import('@/app/(dashboard)/wohnungen/client')).default;
      
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      const user = userEvent.setup();
      render(<WohnungenClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenWohnungModal).toHaveBeenCalled();
    });
  });

  describe('Accessibility Basics', () => {
    it('buttons have proper roles and are keyboard accessible', async () => {
      const WohnungenClientView = (await import('@/app/(dashboard)/wohnungen/client')).default;
      
      const props = {
        initialWohnungenData: [],
        housesData: [],
        serverApartmentCount: 0,
        serverApartmentLimit: 10,
        serverUserIsEligibleToAdd: true,
        serverLimitReason: 'none' as const,
      };

      const user = userEvent.setup();
      render(<WohnungenClientView {...props} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      
      // Should be focusable
      await user.tab();
      expect(addButton).toHaveFocus();
      
      // Should have accessible name
      expect(addButton).toHaveAccessibleName();
    });

    it('maintains proper heading structure', async () => {
      const HaeuserClientView = (await import('@/app/(dashboard)/haeuser/client-wrapper')).default;
      
      const props = { enrichedHaeuser: [] };
      render(<HaeuserClientView {...props} />);

      // Should have proper heading structure
      const title = screen.getByText('Hausliste');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Card Structure', () => {
    it('all pages use consistent card structure', async () => {
      const MieterClientView = (await import('@/app/(dashboard)/mieter/client-wrapper')).default;
      
      const props = {
        initialTenants: [],
        initialWohnungen: [],
        serverAction: jest.fn(),
      };

      const { container } = render(<MieterClientView {...props} />);

      // Should have card with proper classes
      const card = container.querySelector('[class*="rounded-xl"][class*="shadow-md"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Content Integration', () => {
    it('pages render tables and filters correctly', async () => {
      const TodosClientWrapper = (await import('@/app/(dashboard)/todos/client-wrapper')).default;
      
      const props = { tasks: [] };
      render(<TodosClientWrapper {...props} />);

      // Should render table component
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});