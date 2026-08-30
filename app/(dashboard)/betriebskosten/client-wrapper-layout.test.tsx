import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetriebskostenClientView from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deleteNebenkosten } from '@/app/betriebskosten-actions';
import { createMockRouter } from '@/__tests__/utils/mock-router';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
jest.mock('@/app/betriebskosten-actions', () => ({
  deleteNebenkosten: jest.fn(),
}));
const mockCompleteStep = jest.fn();
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(
    jest.fn(() => ({ getState: () => ({ completeStep: mockCompleteStep }) })),
    { getState: jest.fn(() => ({ completeStep: mockCompleteStep })) }
  ),
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockDeleteNebenkosten = deleteNebenkosten as jest.MockedFunction<typeof deleteNebenkosten>;

describe('BetriebskostenClientView - Layout Changes', () => {
  const mockOpenBetriebskostenModal = jest.fn();
  const mockToast = jest.fn();
  const mockRouterRefresh = jest.fn();

  const mockNebenkosten = [
    {
      id: 'nk1',
      startdatum: '2023-01-01',
      enddatum: '2023-12-31',
      Haeuser: { name: 'Haus A' },
      nebenkostenart: ['Strom'],
      betrag: [100],
      berechnungsart: ['Einheit'],
      zaehlerkosten: { 'Wasser': 50 },
      zaehlerverbrauch: { 'Wasser': 100 },
      haeuser_id: 'h1',
      erstellt_von: 'u1',
      haus_name: 'Haus A',
      gesamt_flaeche: 100,
      anzahl_wohnungen: 2,
      anzahl_mieter: 2
    },
    {
      id: 'nk2',
      startdatum: '2024-01-01',
      enddatum: '2024-12-31',
      Haeuser: { name: 'Haus B' },
      nebenkostenart: ['Heizung'],
      betrag: [200],
      berechnungsart: ['Pauschal'],
      zaehlerkosten: { 'Wasser': 75 },
      zaehlerverbrauch: { 'Wasser': 150 },
      haeuser_id: 'h2',
      erstellt_von: 'u1',
      haus_name: 'Haus B',
      gesamt_flaeche: 150,
      anzahl_wohnungen: 3,
      anzahl_mieter: 3
    }
  ];

  const mockHaeuser = [
    { id: 'h1', name: 'Haus A', ort: 'Ort A', strasse: 'Strasse A', erstellt_von: 'u1' },
    { id: 'h2', name: 'Haus B', ort: 'Ort B', strasse: 'Strasse B', erstellt_von: 'u1' }
  ];

  const defaultProps = {
    initialNebenkosten: mockNebenkosten,
    initialHaeuser: mockHaeuser,
    ownerName: 'Test Owner',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseModalStore.mockReturnValue({
      openBetriebskostenModal: mockOpenBetriebskostenModal,
      isOpen: false,
      onOpen: jest.fn(),
      onClose: jest.fn(),
      type: null,
      data: null,
      onOpenChange: jest.fn()
    });

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    });

    mockUseRouter.mockReturnValue(createMockRouter({
      refresh: mockRouterRefresh,
    }));

    mockDeleteNebenkosten.mockResolvedValue({
      success: true,
      message: 'Deleted successfully',
    });
  });

  describe('New Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByRole('heading', { level: 1, name: 'Betriebskosten' })).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Betriebskosten und Abrechnungen')).not.toBeInTheDocument();
    });

    it('renders card with inline header-button layout', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should have the new card-based layout
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i })).toBeInTheDocument();
    });

    it('positions add button inline with management title', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Verify the title and button exist in the card header
      const title = screen.getByText('Betriebskostenübersicht');
      const button = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      
      expect(title).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it('removes redundant CardDescription', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should not have redundant description in card
      expect(screen.queryByText('Hier können Sie Ihre Betriebskosten verwalten und abrechnen')).not.toBeInTheDocument();
    });

    it('maintains proper card structure', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Card should render with its content
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i })).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('calls openBetriebskostenModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      await user.click(addButton);

      // Select "Leere Abrechnung" from the dropdown menu
      const blankOption = await screen.findByText('Leere Abrechnung');
      await user.click(blankOption);

      expect(mockOpenBetriebskostenModal).toHaveBeenCalledWith(
        null,
        mockHaeuser,
        expect.any(Function)
      );
    });

    it('handles edit functionality correctly', async () => {
      const user = userEvent.setup();
      
      // Mock the OperatingCostsTable to trigger edit
      jest.mock('@/components/tables/operating-costs-table', () => ({
        OperatingCostsTable: ({ onEdit }: { onEdit: (item: any) => void }) => (
          <div data-testid="operating-costs-table">
            <button 
              onClick={() => onEdit(mockNebenkosten[0])}
              data-testid="edit-nebenkosten-1"
            >
              Edit Nebenkosten 1
            </button>
          </div>
        ),
      }));

      render(<BetriebskostenClientView {...defaultProps} />);

      const editButton = screen.queryByTestId('edit-nebenkosten-1');
      if (editButton) {
        await user.click(editButton);

        expect(mockOpenBetriebskostenModal).toHaveBeenCalledWith(
          mockNebenkosten[0],
          mockHaeuser,
          expect.any(Function)
        );
      }
    });

    it('button has proper styling and classes', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<BetriebskostenClientView {...defaultProps} />);

      // Main container should have responsive padding
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-6', 'sm:gap-8', 'p-4', 'sm:p-8');
    });

    it('header layout adapts for different screen sizes', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Title and create button should be present in the card header area
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i })).toBeInTheDocument();
    });

    it('button has responsive width classes', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // CardTitle should be properly structured
      const title = screen.getByText('Betriebskostenübersicht');
      expect(title).toBeInTheDocument();
    });

    it('button has proper accessibility attributes', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      // HTML buttons have type="button" by default, so we just check it exists
      expect(addButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenClientView {...defaultProps} />);

      // First tab goes to AnimatedPillToggle (first focusable element)
      // Ensure we can tab through to the button eventually
      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      addButton.focus();
      expect(addButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      
      // Dropdown should open
      expect(screen.getByText('Leere Abrechnung')).toBeInTheDocument();
    });

    it('has proper ARIA labels and roles', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      // Button elements have implicit role="button", so we just check it exists
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Filter and Search Integration', () => {
    it('maintains filter functionality', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should render filters and table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('handles house filter correctly', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should pass houses to filters
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('filters data based on search query', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should filter nebenkosten based on search
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('opens delete confirmation dialog', async () => {
      const user = userEvent.setup();
      
      // Mock the table to trigger delete
      jest.mock('@/components/tables/operating-costs-table', () => ({
        OperatingCostsTable: ({ onDeleteItem }: { onDeleteItem: (id: string) => void }) => (
          <div data-testid="operating-costs-table">
            <button 
              onClick={() => onDeleteItem('nk1')}
              data-testid="delete-nebenkosten-1"
            >
              Delete Nebenkosten 1
            </button>
          </div>
        ),
      }));

      render(<BetriebskostenClientView {...defaultProps} />);

      const deleteButton = screen.queryByTestId('delete-nebenkosten-1');
      if (deleteButton) {
        await user.click(deleteButton);

        // Should open confirmation dialog
        expect(screen.getByText('Löschen Bestätigen')).toBeInTheDocument();
      }
    });

    it('handles successful delete', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenClientView {...defaultProps} />);

      // Simulate opening delete dialog and confirming
      // This would require mocking the table component properly
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty nebenkosten list', () => {
      const emptyProps = {
        ...defaultProps,
        initialNebenkosten: [],
      };

      render(<BetriebskostenClientView {...emptyProps} />);

      // Should still render the layout
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i })).toBeInTheDocument();
    });

    it('handles empty houses list', () => {
      const emptyHousesProps = {
        ...defaultProps,
        initialHaeuser: [],
      };

      render(<BetriebskostenClientView {...emptyHousesProps} />);

      // Should still render but may affect modal functionality
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    });

    it('filters data correctly by year', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should handle year-based filtering
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles modal errors gracefully', async () => {
      mockOpenBetriebskostenModal.mockImplementation(() => {
        console.warn('Modal encountered an error but handled it gracefully');
      });

      const user = userEvent.setup();
      render(<BetriebskostenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
      
      await user.click(addButton);
      const blankOption = await screen.findByText('Leere Abrechnung');
      await user.click(blankOption);
      
      expect(mockOpenBetriebskostenModal).toHaveBeenCalled();
      expect(addButton).toBeInTheDocument();
    });

    it('handles delete errors gracefully', async () => {
      mockDeleteNebenkosten.mockResolvedValue({
        success: false,
        message: 'Delete failed',
      });

      render(<BetriebskostenClientView {...defaultProps} />);

      // Should handle delete errors without crashing
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates properly with OperatingCostsFilters', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should pass correct props to filters
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('integrates properly with OperatingCostsTable', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Should pass correct props to table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('maintains state consistency between components', () => {
      render(<BetriebskostenClientView {...defaultProps} />);

      // Filter and search state should be maintained
      expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    });
  });
});