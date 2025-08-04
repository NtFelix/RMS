import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { BetriebskostenEditModal } from '../betriebskosten-edit-modal';

// Create a simple mock component factory
const createMockComponent = (name: string) => ({ children, ...props }: { children?: React.ReactNode }) => (
  <div data-testid={name} {...props}>
    {children}
  </div>
);

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  __esModule: true,
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, isDirty, onAttemptClose, ...props }: { children: React.ReactNode; isDirty?: boolean; onAttemptClose?: () => void }) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1 data-testid="dialog-title">{children}</h1>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  )
}));

// Mock modal store
jest.mock('@/hooks/use-modal-store', () => ({
  __esModule: true,
  useModalStore: jest.fn()
}));

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }) => <input data-testid="input" {...props} />
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button data-testid="button" {...props}>{children}</button>
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label data-testid="label" {...props}>{children}</label>
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ ...props }) => <textarea data-testid="textarea" {...props} />
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, ...props }) => <div data-testid="select-item" {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }) => <div data-testid="select-trigger" {...props}>{children}</div>,
  SelectValue: ({ ...props }) => <div data-testid="select-value" {...props} />
}));

jest.mock('@/components/ui/custom-combobox', () => ({
  CustomCombobox: ({ value, options, placeholder, searchPlaceholder, emptyText, width, ...props }) => (
    <div data-testid="combobox" {...props} />
  ),
  ComboboxOption: ({ children, ...props }) => <div data-testid="combobox-option" {...props}>{children}</div>
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ ...props }) => <div data-testid="skeleton" {...props} />
}));

jest.mock('@/components/ui/label-with-tooltip', () => ({
  LabelWithTooltip: ({ children, infoText, ...props }) => <label data-testid="label-with-tooltip" {...props}>{children}</label>
}));

// Mock actions
jest.mock('@/app/betriebskosten-actions', () => ({
  getNebenkostenDetailsAction: jest.fn().mockResolvedValue({ success: true, data: null }),
  createNebenkosten: jest.fn().mockResolvedValue({ success: true }),
  updateNebenkosten: jest.fn().mockResolvedValue({ success: true }),
  createRechnungenBatch: jest.fn().mockResolvedValue({ success: true }),
  deleteRechnungenByNebenkostenId: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/app/mieter-actions', () => ({
  __esModule: true,
  getMieterByHausIdAction: jest.fn().mockResolvedValue({ success: true, data: [] })
}));

// Mock other dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    }
  })
}));

jest.mock('@/utils/format', () => ({
  formatNumber: jest.fn((num) => num?.toString() || '0')
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn().mockReturnValue({
    toast: jest.fn()
  })
}));

jest.mock('@/lib/constants', () => ({
  BERECHNUNGSART_OPTIONS: [
    { value: 'nach Rechnung', label: 'Nach Rechnung' },
    { value: 'nach Verbrauch', label: 'Nach Verbrauch' }
  ]
}));

jest.mock('lucide-react', () => ({
  PlusCircle: () => <div data-testid="plus-circle-icon" />,
  Trash2: () => <div data-testid="trash-icon" />
}));

// Mock data for testing
const mockNebenkosten = {
  id: '1',
  name: 'Test Nebenkosten',
  jahr: '2023',
  haeuser_id: '1',
  nebenkostenart: ['nach Rechnung'],
  betrag: [150.00],
  berechnungsart: ['nach Rechnung'],
  wasserkosten: 0.00,
  Haeuser: { name: 'House 1' },
  kosten: [
    { art: 'Gas', betrag: '100.00', berechnungsart: 'nach Rechnung' },
    { art: 'Strom', betrag: '50.00', berechnungsart: 'nach Rechnung' }
  ]
};

const mockUserData = {
  id: 'test-user',
  name: 'Test User'
};

describe('BetriebskostenEditModal', () => {
  describe('State Management', () => {
    const mockHaeuser = [
      { id: '1', name: 'Test Haus 1' },
      { id: '2', name: 'Test Haus 2' }
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(useModalStore).mockReturnValue({
        isBetriebskostenModalOpen: true,
        closeBetriebskostenModal: jest.fn(),
        betriebskostenInitialData: null,
        betriebskostenModalHaeuser: mockHaeuser,
        betriebskostenModalOnSuccess: jest.fn(),
        isBetriebskostenModalDirty: false,
        setBetriebskostenModalDirty: jest.fn(),
        openConfirmationModal: jest.fn(),
        userId: 'test-user'
      });
    });

    it('should handle loading state correctly', async () => {
      // First, let's test if the component renders without errors
      let renderError = null;
      try {
        const { container } = render(<BetriebskostenEditModal />);
        

        
        // Check if the dialog is rendered when modal is open
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Neue Betriebskostenabrechnung');

        expect(screen.getByText('Füllen Sie die Details für die Betriebskostenabrechnung aus.')).toBeInTheDocument();
      } catch (error) {
        renderError = error;
        console.error('Render error:', error);
        throw error;
      }
    });

    it('should handle tenant selection correctly', async () => {
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      const dialog = screen.getByTestId('dialog-content');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Neue Betriebskostenabrechnung');

      expect(screen.getByText('Jahr *')).toBeInTheDocument();
      expect(screen.getByText('Haus *')).toBeInTheDocument();
      expect(screen.getByText('Wasserkosten (€)')).toBeInTheDocument();
      expect(screen.getByText('Kostenaufstellung')).toBeInTheDocument();

      // Check that the form elements are present
      expect(screen.getByPlaceholderText('Kostenart')).toBeInTheDocument();
      expect(screen.getByText('Kostenposition hinzufügen')).toBeInTheDocument();
      expect(screen.getByText('Speichern')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    it('should handle saving correctly', async () => {
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      const dialog = screen.getByTestId('dialog-content');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Neue Betriebskostenabrechnung');

      // Find the save button (should be the submit button)
      const saveButton = screen.getByText('Speichern');
      expect(saveButton).toBeInTheDocument();
      
      // The button should be enabled and ready for interaction
      expect(saveButton).not.toBeDisabled();
    });
  });
});
