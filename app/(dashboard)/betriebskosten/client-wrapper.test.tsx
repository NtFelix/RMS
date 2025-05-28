import { render, screen, fireEvent, act } from '@testing-library/react';
import BetriebskostenClientWrapper from './client-wrapper';
import { deleteNebenkosten } from '../../../app/betriebskosten-actions'; // Adjusted for actual path
import { useToast } from '@/hooks/use-toast';

// Mock child components
jest.mock('@/components/operating-costs-filters', () => ({ 
  OperatingCostsFilters: jest.fn(() => <div>Filters</div>) 
}));

// Mock OperatingCostsTable to allow simulating its prop calls
const mockOnDeleteItem = jest.fn();
const mockOnEditItem = jest.fn();
jest.mock('@/components/operating-costs-table', () => ({ 
  OperatingCostsTable: jest.fn(({ onDeleteItem, onEdit }) => (
    <div>
      <span>Table</span>
      {/* Add dummy buttons or ways to trigger these if needed for specific tests */}
      <button onClick={() => onDeleteItem('test-id-from-table')}>TriggerTableDelete</button>
      <button onClick={() => onEdit({})}>TriggerTableEdit</button>
    </div>
  )) 
}));

jest.mock('@/components/betriebskosten-edit-modal', () => ({ 
  BetriebskostenEditModal: jest.fn(() => <div>EditModal</div>) // Changed to named import mock
}));

// Mock ConfirmationAlertDialog
const mockDialogOnConfirm = jest.fn();
const mockDialogOnOpenChange = jest.fn();
jest.mock('@/components/ui/confirmation-alert-dialog', () => ({
  __esModule: true,
  default: jest.fn(({ isOpen, onConfirm, onOpenChange, title, description }) => {
    // Update local mock functions to be callable from tests
    mockDialogOnConfirm.mockImplementation(onConfirm);
    mockDialogOnOpenChange.mockImplementation(onOpenChange);

    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-dialog">
        <span>{title}</span>
        <span>{description}</span>
        <button onClick={mockDialogOnConfirm}>ConfirmDelete</button>
        <button onClick={() => mockDialogOnOpenChange(false)}>CancelDelete</button>
      </div>
    );
  }),
}));

// Mock server actions
jest.mock('../../../app/betriebskosten-actions', () => ({ // Adjusted for actual path
  deleteNebenkosten: jest.fn(),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ 
  useToast: () => ({ toast: mockToast }) 
}));


describe('BetriebskostenClientWrapper', () => {
  const mockNebenkostenData = [{ id: 'nk1', jahr: '2023', Haeuser: { name: 'Haus A' }, nebenkostenart: ['Strom'], betrag: [100], berechnungsart: ['Einheit'], wasserrkosten: 50, haeuser_id: 'h1', user_id: 'u1' }];
  const mockHaeuserData = [{ id: 'h1', name: 'Haus A', ort: 'Ort A', strasse: 'Strasse A', user_id: 'u1'}];
  const mockUserId = "user123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the OperatingCostsTable mock prop functions for each test
    // This is important because OperatingCostsTable is re-rendered in each test with new props
    // and we need to ensure the mock functions are fresh or correctly scoped.
    // The current mock setup for OperatingCostsTable re-assigns its internal mock functions
    // to the latest props on each render, which is generally fine.
  });

  const defaultProps = {
    initialNebenkosten: mockNebenkostenData,
    initialHaeuser: mockHaeuserData,
    userId: mockUserId,
  };

  it('renders correctly with initial data', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });

  describe('Delete Confirmation Flow', () => {
    it('opens delete alert when onDeleteItem is called from table', () => {
      render(<BetriebskostenClientWrapper {...defaultProps} />);
      
      // Simulate OperatingCostsTable calling its onDeleteItem prop
      // We need to get the instance of OperatingCostsTable and call the prop
      // Or, if the mock is set up to expose a trigger:
      fireEvent.click(screen.getByText('TriggerTableDelete')); // Assumes mock table has this button

      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
      expect(screen.getByText('Löschen Bestätigen')).toBeInTheDocument(); // Title of dialog
      // Check that selectedItemIdForDelete was set (indirectly, by executeDelete call later)
    });

    it('calls deleteNebenkosten and shows success toast on confirm', async () => {
      (deleteNebenkosten as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<BetriebskostenClientWrapper {...defaultProps} />);

      // Open the dialog first
      fireEvent.click(screen.getByText('TriggerTableDelete')); 
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();

      // Simulate clicking confirm in the mocked dialog
      await act(async () => {
        fireEvent.click(screen.getByText('ConfirmDelete'));
      });
      
      expect(deleteNebenkosten).toHaveBeenCalledWith('test-id-from-table'); // ID from mock table trigger
      expect(mockToast).toHaveBeenCalledWith({ title: "Erfolg", description: "Nebenkosten-Eintrag erfolgreich gelöscht." });
      expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument(); // Dialog should close
    });

    it('shows error toast on delete failure', async () => {
      (deleteNebenkosten as jest.Mock).mockResolvedValueOnce({ success: false, message: 'Deletion failed' });
      render(<BetriebskostenClientWrapper {...defaultProps} />);
      fireEvent.click(screen.getByText('TriggerTableDelete'));
      
      await act(async () => {
        fireEvent.click(screen.getByText('ConfirmDelete'));
      });

      expect(deleteNebenkosten).toHaveBeenCalledWith('test-id-from-table');
      expect(mockToast).toHaveBeenCalledWith({ title: "Fehler", description: "Deletion failed", variant: "destructive" });
      expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument();
    });

    it('closes dialog and resets state on cancel', () => {
      render(<BetriebskostenClientWrapper {...defaultProps} />);
      fireEvent.click(screen.getByText('TriggerTableDelete'));
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('CancelDelete'));
      
      expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument();
      // Check if selectedItemIdForDelete was reset (indirectly, ensure no delete call on next confirm if possible, or inspect state if component exposed it)
      // For now, we trust handleDialogOnOpenChange(false) correctly resets it.
    });
  });
});
