import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceEditModal } from '@/components/finance/finance-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('FinanceEditModal', () => {
  // Suppress React act() warnings - these are expected in modal tests
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn((message) => {
      if (
        typeof message === 'string' &&
        (message.includes('Warning: An update to') ||
          message.includes('not wrapped in act'))
      ) {
        return;
      }
      originalError(message);
    });
  });

  afterAll(() => {
    console.error = originalError;
  });

  const mockServerAction = jest.fn();
  const mockCloseFinanceModal = jest.fn();
  const mockSetFinanceModalDirty = jest.fn();
  const mockFinanceModalOnSuccess = jest.fn();

  const defaultStoreState = {
    isFinanceModalOpen: true,
    closeFinanceModal: mockCloseFinanceModal,
    financeInitialData: null,
    financeModalWohnungen: [
      { id: '1', name: 'Wohnung 1' },
      { id: '2', name: 'Wohnung 2' },
    ],
    financeModalOnSuccess: mockFinanceModalOnSuccess,
    isFinanceModalDirty: false,
    setFinanceModalDirty: mockSetFinanceModalDirty,
    openConfirmationModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue(defaultStoreState);
  });

  describe('Rendering', () => {
    it('renders create modal when no initial data is provided', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      expect(screen.getByText('Transaktion hinzufügen')).toBeInTheDocument();
      expect(screen.getByText('Füllen Sie die erforderlichen Felder aus.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
    });

    it('renders edit modal when initial data is provided', () => {
      const initialData = {
        id: '1',
        name: 'Test Transaction',
        betrag: 100.50,
        ist_einnahmen: true,
        wohnung_id: '1',
        datum: '2024-01-15',
        notiz: 'Test note',
      };

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        financeInitialData: initialData,
      });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      expect(screen.getByText('Transaktion bearbeiten')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aktualisieren' })).toBeInTheDocument();
    });

    it('does not render when modal is closed', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isFinanceModalOpen: false,
      });

      const { container } = render(<FinanceEditModal serverAction={mockServerAction} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders all form fields', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      expect(screen.getByLabelText('Bezeichnung')).toBeInTheDocument();
      expect(screen.getByLabelText('Betrag (€)')).toBeInTheDocument();
      expect(screen.getByLabelText('Datum')).toBeInTheDocument();
      expect(screen.getByText('Wohnung')).toBeInTheDocument();
      expect(screen.getByText('Typ')).toBeInTheDocument();
      expect(screen.getByLabelText('Notiz')).toBeInTheDocument();
    });
  });

  describe('Form Population', () => {
    it('populates form fields with initial data', () => {
      const initialData = {
        id: '1',
        name: 'Test Transaction',
        betrag: 100.50,
        ist_einnahmen: true,
        wohnung_id: '1',
        datum: '2024-01-15',
        notiz: 'Test note',
      };

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        financeInitialData: initialData,
      });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      expect(screen.getByDisplayValue('Test Transaction')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test note')).toBeInTheDocument();
    });

    it('handles empty initial data gracefully', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      const nameInput = screen.getByLabelText('Bezeichnung') as HTMLInputElement;
      const betragInput = screen.getByLabelText('Betrag (€)') as HTMLInputElement;
      const notizInput = screen.getByLabelText('Notiz') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(betragInput.value).toBe('');
      expect(notizInput.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('updates form data when user types in input fields', async () => {
      const user = userEvent.setup();
      render(<FinanceEditModal serverAction={mockServerAction} />);

      const nameInput = screen.getByLabelText('Bezeichnung');
      await user.type(nameInput, 'New Transaction');

      expect(nameInput).toHaveValue('New Transaction');
      expect(mockSetFinanceModalDirty).toHaveBeenCalledWith(true);
    });

    it('updates betrag field correctly', async () => {
      const user = userEvent.setup();
      render(<FinanceEditModal serverAction={mockServerAction} />);

      const betragInput = screen.getByLabelText('Betrag (€)');
      await user.type(betragInput, '150.75');

      expect(betragInput).toHaveValue(150.75);
      expect(mockSetFinanceModalDirty).toHaveBeenCalledWith(true);
    });

    it('renders transaction type selector', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      // Just verify the type selector is rendered
      const typeSelect = screen.getByRole('combobox', { name: 'Typ' });
      expect(typeSelect).toBeInTheDocument();

      // Verify the label is present
      expect(screen.getByText('Typ')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data for new transaction', async () => {
      const user = userEvent.setup();
      mockServerAction.mockResolvedValue({ success: true, data: { id: 'new-id' } });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockServerAction).toHaveBeenCalledWith(null, {
          name: 'Test Transaction',
          betrag: 100.50,
          ist_einnahmen: false,
          wohnung_id: null,
          datum: null,
          notiz: null,
          dokument_id: null,
          tags: null,
        });
      });
    });

    it('submits form with correct data for existing transaction', async () => {
      const user = userEvent.setup();
      const initialData = {
        id: '1',
        name: 'Existing Transaction',
        betrag: 200,
        ist_einnahmen: true,
        wohnung_id: '1',
        datum: '2024-01-15',
        notiz: 'Existing note',
      };

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        financeInitialData: initialData,
      });

      mockServerAction.mockResolvedValue({ success: true, data: initialData });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      const submitButton = screen.getByRole('button', { name: 'Aktualisieren' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockServerAction).toHaveBeenCalledWith('1', {
          name: initialData.name,
          betrag: initialData.betrag,
          ist_einnahmen: initialData.ist_einnahmen,
          wohnung_id: initialData.wohnung_id,
          datum: initialData.datum,
          notiz: initialData.notiz,
          dokument_id: null,
          tags: null,
        });
      });
    });

    it('shows validation error for missing required fields', async () => {
      const user = userEvent.setup();
      render(<FinanceEditModal serverAction={mockServerAction} />);

      // Remove required attributes to bypass HTML5 validation
      const nameInput = screen.getByLabelText('Bezeichnung');
      const betragInput = screen.getByLabelText('Betrag (€)');

      nameInput.removeAttribute('required');
      betragInput.removeAttribute('required');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Name und Betrag sind erforderlich.',
          variant: 'destructive',
        });
      });

      expect(mockServerAction).not.toHaveBeenCalled();
    });

    it('shows success toast on successful submission', async () => {
      const user = userEvent.setup();
      mockServerAction.mockResolvedValue({ success: true, data: { id: 'new-id' } });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Finanzeintrag erstellt',
          description: 'Der Finanzeintrag "Test Transaction" wurde erfolgreich erstellt.',
          variant: 'success',
        });
      });
    });

    it('shows error toast on submission failure', async () => {
      const user = userEvent.setup();
      mockServerAction.mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Database error',
          variant: 'destructive',
        });
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();
      let resolveServerAction: (value: any) => void;
      const serverActionPromise = new Promise(resolve => {
        resolveServerAction = resolve;
      });
      mockServerAction.mockReturnValue(serverActionPromise);

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: 'Wird gespeichert...' })).toBeDisabled();
      expect(screen.getByLabelText('Bezeichnung')).toBeDisabled();

      resolveServerAction!({ success: true });
    });
  });

  describe('Modal Closing', () => {
    it('calls closeFinanceModal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<FinanceEditModal serverAction={mockServerAction} />);

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);

      expect(mockCloseFinanceModal).toHaveBeenCalledWith({ force: true });
    });

    it('closes modal after successful submission', async () => {
      const user = userEvent.setup();
      mockServerAction.mockResolvedValue({ success: true, data: { id: 'new-id' } });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCloseFinanceModal).toHaveBeenCalled();
      });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      const successData = { id: 'new-id', name: 'Test Transaction' };
      mockServerAction.mockResolvedValue({ success: true, data: successData });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFinanceModalOnSuccess).toHaveBeenCalledWith(successData);
      });
    });
  });

  describe('Dirty State Management', () => {
    it('sets dirty state to false when modal opens', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      expect(mockSetFinanceModalDirty).toHaveBeenCalledWith(false);
    });

    it('sets dirty state to true when form data changes', async () => {
      const user = userEvent.setup();
      render(<FinanceEditModal serverAction={mockServerAction} />);

      const nameInput = screen.getByLabelText('Bezeichnung');
      await user.type(nameInput, 'Test');

      expect(mockSetFinanceModalDirty).toHaveBeenCalledWith(true);
    });

    it('resets dirty state to false after successful submission', async () => {
      const user = userEvent.setup();
      mockServerAction.mockResolvedValue({ success: true, data: { id: 'new-id' } });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      await user.type(screen.getByLabelText('Bezeichnung'), 'Test Transaction');
      await user.type(screen.getByLabelText('Betrag (€)'), '100.50');

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetFinanceModalDirty).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Apartment Selection', () => {
    it('renders apartment combobox', () => {
      render(<FinanceEditModal serverAction={mockServerAction} />);

      // Now we can use a more robust selector with the accessible name
      const apartmentCombobox = screen.getByRole('combobox', { name: 'Wohnung' });
      expect(apartmentCombobox).toBeInTheDocument();

      // Check that the label exists
      expect(screen.getByText('Wohnung')).toBeInTheDocument();
    });

    it('handles empty apartment list gracefully', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        financeModalWohnungen: [],
      });

      render(<FinanceEditModal serverAction={mockServerAction} />);

      const apartmentCombobox = screen.getByRole('combobox', { name: 'Wohnung' });
      expect(apartmentCombobox).toBeInTheDocument();
      expect(screen.getByText('Wohnung')).toBeInTheDocument();
    });
  });
});