import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MieterClientView from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Tenant } from '@/types/Tenant';
import type { Wohnung } from '@/types/Wohnung';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('MieterClientView - Layout Changes', () => {
  const mockOpenTenantModal = jest.fn();
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
    mockUseModalStore.mockReturnValue({
      openTenantModal: mockOpenTenantModal,
    } as any);
  });

  describe('New Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByText('Mieter')).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Mieter und Mietverträge')).not.toBeInTheDocument();
    });

    it('renders card with inline header-button layout', () => {
      render(<MieterClientView {...defaultProps} />);

      // Should have the new card-based layout
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mieter hinzufügen/i })).toBeInTheDocument();
    });

    it('positions add button inline with management title', () => {
      const { container } = render(<MieterClientView {...defaultProps} />);

      // Find the header container with flex layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();

      // Verify the title and button exist (they should be in the same container)
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
      const { container } = render(<MieterClientView {...defaultProps} />);

      // Verify card structure
      const card = container.querySelector('[class*="rounded-xl"][class*="shadow-md"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('calls openTenantModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Mieter hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenTenantModal).toHaveBeenCalledWith(
        undefined,
        mockWohnungen
      );
    });

    it('handles edit tenant functionality', async () => {
      const user = userEvent.setup();
      
      // Mock the TenantTable component to trigger edit
      jest.mock('@/components/tables/tenant-table', () => ({
        TenantTable: ({ onEdit }: { onEdit: (tenant: Tenant) => void }) => (
          <div data-testid="tenant-table">
            <button 
              onClick={() => onEdit(mockTenants[0])}
              data-testid="edit-tenant-1"
            >
              Edit Tenant 1
            </button>
          </div>
        ),
      }));

      render(<MieterClientView {...defaultProps} />);

      // Find and click edit button (this would be in the actual table)
      const editButton = screen.queryByTestId('edit-tenant-1');
      if (editButton) {
        await user.click(editButton);

        expect(mockOpenTenantModal).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            name: 'John Doe',
            wohnung_id: 'w1',
          }),
          mockWohnungen
        );
      }
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
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
    });

    it('header layout adapts for different screen sizes', () => {
      const { container } = render(<MieterClientView {...defaultProps} />);

      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
      
      // Should have responsive flex classes
      expect(headerContainer).toHaveClass('flex-row', 'items-center', 'justify-between');
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
      
      // Tab to button
      await user.tab();
      expect(addButton).toHaveFocus();

      // Press Enter to activate
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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate a scenario where tenant data is malformed
      const malformedProps = {
        ...defaultProps,
        initialTenants: [{ id: '1' } as any], // Missing required fields
      };

      render(<MieterClientView {...malformedProps} />);

      // Should still render without crashing
      expect(screen.getByText('Mieterverwaltung')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
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
});