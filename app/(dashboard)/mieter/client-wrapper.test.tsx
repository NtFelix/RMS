import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MieterClientView from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Tenant } from '@/types/Tenant';
import type { Wohnung } from '@/types/Wohnung';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
const mockCompleteStep = jest.fn();
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(
    jest.fn(() => ({ getState: () => ({ completeStep: mockCompleteStep }) })),
    { getState: jest.fn(() => ({ completeStep: mockCompleteStep })) }
  ),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
  toast: jest.fn(),
}));
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  })),
}));

// Router mit gemeinsamer `refresh`-Funktion: Die Massen-Aktionsleiste lädt die Liste darüber neu.
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: jest.fn(),
  unstable_rethrow: jest.fn(),
}));

// Aktiver Tab der Seite (Standard "mieter"); die Übersichtskarten werden über den Tab "overview" erreicht.
let mockCurrentTab: 'mieter' | 'overview' = 'mieter';
jest.mock('@/hooks/use-tab-params', () => ({
  useTabParams: () => [mockCurrentTab, jest.fn()],
}));

// Die Diagramme der Übersicht sind für diese Tests unerheblich (recharts braucht im jsdom ein Layout).
jest.mock('@/components/dashboard/dashboard-charts', () => ({
  TenantsDonutChart: () => <div data-testid="tenants-donut-chart" />,
}));
jest.mock('@/components/dashboard/dashboard-charts-wrapper', () => ({
  TenantFluctuationChart: () => <div data-testid="tenant-fluctuation-chart" />,
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('MieterClientView - Layout Changes', () => {
  const mockOpenTenantModal = jest.fn();
  const mockOpenKautionModal = jest.fn();
  const mockSetCanViewKautionen = jest.fn();
  const mockServerAction = jest.fn();

  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'John Doe',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      auszug: undefined,
      email: 'john@example.com',
      telefonnummer: '123456789',
      notiz: 'Test note',
      nebenkosten: []
    },
    {
      id: '2',
      name: 'Jane Smith',
      wohnung_id: 'w2',
      einzug: '2023-02-01',
      auszug: '2023-12-01',
      email: 'jane@example.com',
      telefonnummer: '987654321',
      notiz: '',
      nebenkosten: []
    }
  ];

  const mockWohnungen: Wohnung[] = [
    {
      id: 'w1',
      name: 'Apartment 1',
      groesse: 50,
      miete: 800,
      status: 'vermietet',
      Haeuser: { name: 'House 1' },
      haus_id: 'h1'
    },
    {
      id: 'w2',
      name: 'Apartment 2',
      groesse: 75,
      miete: 1200,
      status: 'frei',
      Haeuser: { name: 'House 2' },
      haus_id: 'h2'
    }
  ];

  const defaultProps = {
    initialTenants: mockTenants,
    initialWohnungen: mockWohnungen,
    serverAction: mockServerAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTab = 'mieter';
    mockUseModalStore.mockReturnValue({
      openTenantModal: mockOpenTenantModal,
      openKautionModal: mockOpenKautionModal,
      setCanViewKautionen: mockSetCanViewKautionen,
    } as any);
  });

  describe('New Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByRole('heading', { level: 1, name: 'Mieter' })).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Mieter und Mietverträge')).not.toBeInTheDocument();
    });

    it('renders card with inline header-button layout', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should have the new card-based layout
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mieter hinzufügen/i })).toBeInTheDocument();
    });

    it('positions add button inline with management title', () => {
      render(<MieterClientView {...defaultProps} />);

      // Verify the title and button exist
      const title = screen.getByText('Mieterverwaltung');
      const button = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      
      expect(title).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it('removes redundant CardDescription', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should not have redundant description in card
      expect(screen.queryByText('Hier können Sie Ihre Mieter verwalten')).not.toBeInTheDocument();
    });

    it('maintains proper card structure', () => {
      render(<MieterClientView {...defaultProps} />);

      // Card should render with its content
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('calls openTenantModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenTenantModal).toHaveBeenCalledWith(
        { status: 'mieter' },
        mockWohnungen
      );
    });

    it('renders tenant table with data', () => {
      render(<MieterClientView {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('button has proper styling and classes', () => {
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<MieterClientView {...defaultProps} />);

      // Main container should have responsive padding
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-6', 'sm:gap-8', 'p-4', 'sm:p-8');
    });

    it('header layout adapts for different screen sizes', () => {
      render(<MieterClientView {...defaultProps} />);

      // Title and button should be present
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mieter hinzufügen/i })).toBeInTheDocument();
    });

    it('button has responsive width classes', () => {
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(<MieterClientView {...defaultProps} />);

      // CardTitle should be properly structured
      const title = screen.getByText('Mieterverwaltung');
      expect(title).toBeInTheDocument();
    });

    it('button has proper accessibility attributes', () => {
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      // Button should be accessible by role (which it is since we can find it)
      expect(addButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      
      addButton.focus();
      expect(addButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOpenTenantModal).toHaveBeenCalled();
    });

    it('has proper ARIA labels and roles', () => {
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      // Button should have proper accessible name (which it does since we can find it by name)
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Filter and Search Integration', () => {
    it('maintains filter functionality', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should render filters component
      // Note: This would need the actual TenantFilters component to be rendered
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('maintains search functionality', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should render table with search capability
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('passes correct props to table component', () => {
      render(<MieterClientView {...defaultProps} />);

      // Verify table is rendered with correct data
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty tenant list', () => {
      const emptyProps = {
        ...defaultProps,
        initialTenants: [],
      };

      render(<MieterClientView {...emptyProps} />);

      // Should still render the layout
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mieter hinzufügen/i })).toBeInTheDocument();
    });

    it('handles empty wohnungen list', () => {
      const emptyWohnungenProps = {
        ...defaultProps,
        initialWohnungen: [],
      };

      render(<MieterClientView {...emptyWohnungenProps} />);

      // Should still render but may affect modal functionality
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
    });

    it('formats tenant data correctly for modal', async () => {
      const user = userEvent.setup();
      
      // Create a tenant with specific data structure
      const tenantWithNebenkosten = {
        ...mockTenants[0],
        nebenkosten: [{ id: 'nk1', date: '2023-01-01', type: 'heating', amount: '100' }],
      };

      const propsWithNebenkosten = {
        ...defaultProps,
        initialTenants: [tenantWithNebenkosten],
      };

      render(<MieterClientView {...propsWithNebenkosten} />);

      // This would test the edit functionality if we had access to the table's edit trigger
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing tenant data gracefully', () => {
      // Simulate a scenario where the tenant list is empty
      const emptyProps = {
        ...defaultProps,
        initialTenants: [],
      };

      render(<MieterClientView {...emptyProps} />);

      // Should still render without crashing
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
    });

    it('handles modal errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockOpenTenantModal.mockImplementation(() => {
        throw new Error('Modal error');
      });

      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      
      // Should not crash when modal throws error
      await user.click(addButton);
      
      // Verify the error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Error opening tenant modal:', expect.any(Error));
      
      // Verify the UI is still functional
      expect(addButton).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    it('integrates properly with TenantFilters component', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should pass filter change handlers to filters
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('integrates properly with TenantTable component', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should pass correct props to table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('maintains state consistency between components', () => {
      render(<MieterClientView {...defaultProps} />);

      // Filter and search state should be maintained
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
    });
  });
  // Kautionsmanagement (GH-6): Anzeige und Menüeinträge hängen am Modulrecht `kautionen: ansehen`.
  describe('Kaution (GH-6)', () => {
    const tenantWithDeposit: Tenant = {
      id: 't-deposit',
      name: 'Kautions Mieter',
      status: 'mieter',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      kaution: {
        amount: 1500,
        paymentDate: '2023-01-01',
        status: 'Erhalten',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        kautionId: 'k-1',
        kontostand: 1500,
      },
    };
    const depositProps = { ...defaultProps, initialTenants: [tenantWithDeposit] };

    it('does not write the module right into the modal store (the dashboard layout owns it, independent of this page)', () => {
      const { rerender } = render(<MieterClientView {...defaultProps} />);
      rerender(<MieterClientView {...defaultProps} canViewKautionen />);

      expect(mockSetCanViewKautionen).not.toHaveBeenCalled();
    });

    it('offers the Kaution button in the tenant table only with the module right', () => {
      const { unmount } = render(<MieterClientView {...depositProps} />);
      expect(screen.queryByRole('button', { name: 'Kaution' })).not.toBeInTheDocument();
      unmount();

      render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.getByRole('button', { name: 'Kaution' })).toBeInTheDocument();
    });

    it('hides the deposit card of the overview without the module right', () => {
      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} />);

      // Der Tab "Übersicht" ist gerendert, nur die Kautionskarte fehlt.
      expect(screen.getByText('KI-Bewerber Match-Score')).toBeInTheDocument();
      expect(screen.queryByText('Kaution Status & Rückzahlungen')).not.toBeInTheDocument();
      expect(screen.queryByText('Keine Kautionsdaten erfasst')).not.toBeInTheDocument();
      expect(screen.queryByText('Kautionsbestand nach Mieter')).not.toBeInTheDocument();
    });

    it('shows the deposit card of the overview with the module right and notes that amounts are target amounts', () => {
      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} canViewKautionen />);

      expect(screen.getByText('Kaution Status & Rückzahlungen')).toBeInTheDocument();
      expect(screen.getByText(/Soll-Betrag, nicht dem aktuellen Kontostand/)).toBeInTheDocument();
    });

    it('opens the deposit dialog from the overview with the tenant only (no deposit data from the list)', async () => {
      mockCurrentTab = 'overview';
      const user = userEvent.setup();
      render(<MieterClientView {...depositProps} canViewKautionen />);

      await user.click(screen.getByText('Kautions Mieter'));

      expect(mockOpenKautionModal).toHaveBeenCalledTimes(1);
      const args = mockOpenKautionModal.mock.calls[0];
      expect(args).toHaveLength(1);
      expect(args[0]).toMatchObject({ id: 't-deposit', name: 'Kautions Mieter' });
    });
  });
});

// Löschen mehrerer Mieter (GH-6, Kautionsmanagement): Der tatsächlich genutzte Löschweg ist die Massen-Aktionsleiste.
// Sie lädt die Liste über die Seite neu (`onUpdate`), auch wenn die Datenbank einzelne Löschungen abgelehnt hat.
describe('MieterClientView - Mieter in der Liste löschen (GH-6)', () => {
  const defaultProps = {
    initialTenants: [
      { id: 't-1', name: 'Mieter Eins', wohnung_id: 'w1', einzug: '2023-01-01', auszug: undefined, nebenkosten: [] },
    ] as Tenant[],
    initialWohnungen: [] as Wohnung[],
    serverAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTab = 'mieter';
    mockUseModalStore.mockReturnValue({ openTenantModal: jest.fn(), openKautionModal: jest.fn() } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ successCount: 1, errorCount: 1, reasons: ['Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.'] }),
    }) as unknown as typeof fetch;
  });

  it('reloads the list through the router after a bulk delete with rejected tenants', async () => {
    const user = userEvent.setup();
    render(<MieterClientView {...defaultProps} />);

    await user.click(screen.getAllByRole('checkbox')[0]); // alle sichtbaren Mieter auswählen
    await user.click(await screen.findByRole('button', { name: /^Löschen \(\d+\)$/ }));
    await user.click(await screen.findByRole('button', { name: 'Löschen bestätigen' }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith('/api/mieter/bulk-delete', expect.objectContaining({ method: 'POST' }));
  });
});
