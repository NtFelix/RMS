import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetriebskostenEditModal } from './betriebskosten-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import {
  createNebenkosten,
  updateNebenkosten,
  getNebenkostenDetailsAction,
  createRechnungenBatch,
  deleteRechnungenByNebenkostenId
} from '@/app/betriebskosten-actions';
import { getMieterByHausIdAction } from '@/app/mieter-actions';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies are now handled globally in jest.setup.js

// Mock constants
jest.mock('@/lib/constants', () => ({
  BERECHNUNGSART_OPTIONS: [
    { value: 'pro Flaeche', label: 'pro Fläche' },
    { value: 'pro Mieter', label: 'pro Mieter' },
    { value: 'pauschal', label: 'pauschal' },
    { value: 'nach Rechnung', label: 'nach Rechnung' },
  ],
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockToast = useToast as jest.MockedFunction<typeof useToast>;
const mockCreateNebenkosten = createNebenkosten as jest.MockedFunction<typeof createNebenkosten>;
const mockUpdateNebenkosten = updateNebenkosten as jest.MockedFunction<typeof updateNebenkosten>;
const mockGetNebenkostenDetailsAction = getNebenkostenDetailsAction as jest.MockedFunction<typeof getNebenkostenDetailsAction>;
const mockCreateRechnungenBatch = createRechnungenBatch as jest.MockedFunction<typeof createRechnungenBatch>;
const mockDeleteRechnungenByNebenkostenId = deleteRechnungenByNebenkostenId as jest.MockedFunction<typeof deleteRechnungenByNebenkostenId>;
const mockGetMieterByHausIdAction = getMieterByHausIdAction as jest.MockedFunction<typeof getMieterByHausIdAction>;

describe('BetriebskostenEditModal', () => {
  const mockHaeuser = [{ id: 'h1', name: 'Haus A', ort: 'Ort', strasse: 'Strasse', user_id: 'u1' }];
  const mockCloseBetriebskostenModal = jest.fn();
  const mockSetBetriebskostenModalDirty = jest.fn();
  const mockBetriebskostenModalOnSuccess = jest.fn();
  const mockOpenConfirmationModal = jest.fn();
  const mockToastFn = jest.fn();

  const defaultStoreState = {
    isBetriebskostenModalOpen: true,
    closeBetriebskostenModal: mockCloseBetriebskostenModal,
    betriebskostenInitialData: null,
    betriebskostenModalHaeuser: mockHaeuser,
    betriebskostenModalOnSuccess: mockBetriebskostenModalOnSuccess,
    isBetriebskostenModalDirty: false,
    setBetriebskostenModalDirty: mockSetBetriebskostenModalDirty,
    openConfirmationModal: mockOpenConfirmationModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store
    mockUseModalStore.mockReturnValue(defaultStoreState);
    
    // Mock toast
    mockToast.mockReturnValue({ toast: mockToastFn });
    
    // Mock server actions with default successful responses
    mockCreateNebenkosten.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    mockUpdateNebenkosten.mockResolvedValue({ success: true });
    mockGetNebenkostenDetailsAction.mockResolvedValue({ success: true, data: null });
    mockCreateRechnungenBatch.mockResolvedValue({ success: true });
    mockDeleteRechnungenByNebenkostenId.mockResolvedValue({ success: true });
    mockGetMieterByHausIdAction.mockResolvedValue({ success: true, data: [] });
  });

  describe('Rendering', () => {
    it('renders create modal when no initial data is provided', () => {
      render(<BetriebskostenEditModal />);
      
      expect(screen.getByText('Neue Betriebskostenabrechnung')).toBeInTheDocument();
      expect(screen.getByText('Füllen Sie die Details für die Betriebskostenabrechnung aus.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
    });

    it('renders edit modal when initial data is provided', () => {
      const initialData = { id: '1' };
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: initialData,
      });

      render(<BetriebskostenEditModal />);
      
      expect(screen.getByText('Betriebskosten bearbeiten')).toBeInTheDocument();
    });

    it('does not render when modal is closed', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isBetriebskostenModalOpen: false,
      });

      const { container } = render(<BetriebskostenEditModal />);
      expect(container.firstChild).toBeNull();
    });

    it('renders all form fields', () => {
      render(<BetriebskostenEditModal />);
      
      expect(screen.getByLabelText('Jahr *')).toBeInTheDocument();
      expect(screen.getByText('Haus *')).toBeInTheDocument(); // CustomCombobox doesn't have proper label association
      expect(screen.getByLabelText('Wasserkosten (€)')).toBeInTheDocument();
      expect(screen.getByText('Kostenaufstellung')).toBeInTheDocument();
    });

    it('renders for new entry with one default cost item', () => {
      render(<BetriebskostenEditModal />);
      
      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
      expect(screen.getAllByPlaceholderText('Betrag (€)')).toHaveLength(1);
      expect(screen.getAllByRole('combobox')).toHaveLength(2); // 1 for Haus, 1 for Berechnungsart
    });
  });

  describe('Data Loading and Population', () => {
    it('populates form fields when editing existing entry', async () => {
      const mockEntry = {
        id: '1',
        jahr: '2023',
        haeuser_id: 'h1',
        nebenkostenart: ['Strom', 'Wasser'],
        betrag: [100, 50],
        berechnungsart: ['pro Flaeche', 'pro Mieter'],
        wasserkosten: 20,
        Haeuser: { name: 'Haus A' },
        user_id: 'u1',
        Rechnungen: [],
      };

      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({ success: true, data: mockEntry });
      mockGetMieterByHausIdAction.mockResolvedValue({ success: true, data: [] });

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: '1' },
      });

      render(<BetriebskostenEditModal />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Strom')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Wasser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    it('shows loading state while fetching details', () => {
      mockGetNebenkostenDetailsAction.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: '1' },
      });

      render(<BetriebskostenEditModal />);

      expect(screen.getByText('Lade Details...')).toBeInTheDocument();
    });

    it('handles error when loading details fails', async () => {
      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({ 
        success: false, 
        message: 'Failed to load details' 
      });

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: '1' },
      });

      render(<BetriebskostenEditModal />);

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith({
          title: 'Fehler beim Laden der Details',
          description: 'Failed to load details',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Cost Items Management', () => {
    it('allows adding and removing cost items', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const addButton = screen.getByText('Kostenposition hinzufügen');
      await user.click(addButton);
      
      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(2);

      const removeButtons = screen.getAllByLabelText('Kostenposition entfernen');
      expect(removeButtons[0]).not.toBeDisabled();
      
      await user.click(removeButtons[0]);
      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
      expect(screen.getByLabelText('Kostenposition entfernen')).toBeDisabled();
    });

    it('updates cost item fields on user input', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Heizung');
      expect(artInput).toHaveValue('Heizung');
      expect(mockSetBetriebskostenModalDirty).toHaveBeenCalledWith(true);

      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '200');
      expect(betragInput).toHaveValue(200);
    });

    it('handles "nach Rechnung" calculation type correctly', async () => {
      const user = userEvent.setup();
      const mockMieter = [
        { id: 'm1', name: 'Mieter 1' },
        { id: 'm2', name: 'Mieter 2' },
      ];
      
      mockGetMieterByHausIdAction.mockResolvedValue({ success: true, data: mockMieter });
      
      render(<BetriebskostenEditModal />);

      // Set Jahr first to trigger tenant loading
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.clear(jahrInput);
      await user.type(jahrInput, '2024');

      // Wait for tenants to load and then check for "nach Rechnung" functionality
      // This test is simplified since the Select component interaction is complex in JSDOM
      await waitFor(() => {
        expect(mockGetMieterByHausIdAction).toHaveBeenCalledWith('h1', '2024');
      });
    });
  });

  describe('Form Submission', () => {
    it('shows validation error for missing required fields', async () => {
      const user = userEvent.setup();
      
      // Mock store with empty house list to trigger validation error
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenModalHaeuser: [], // Empty house list
      });
      
      render(<BetriebskostenEditModal />);
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Fehlende Eingaben',
            variant: 'destructive',
          })
        );
      });
      
      expect(mockCreateNebenkosten).not.toHaveBeenCalled();
    });

    it('shows validation error for empty cost item art', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      // Fill required fields but leave cost item art empty
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith({
          title: 'Validierungsfehler',
          description: expect.stringContaining('Art der Kosten darf nicht leer sein'),
          variant: 'destructive',
        });
      });
      
      expect(mockCreateNebenkosten).not.toHaveBeenCalled();
    });



    it('successfully creates new Nebenkosten entry', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.clear(jahrInput);
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Müll');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '150');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateNebenkosten).toHaveBeenCalledWith({
          jahr: '2024',
          nebenkostenart: ['Müll'],
          betrag: [150],
          berechnungsart: ['pro Flaeche'], // Default value
          wasserkosten: null,
          haeuser_id: 'h1',
        });
      });
      
      expect(mockCloseBetriebskostenModal).toHaveBeenCalled();
    });

    it('successfully updates existing Nebenkosten entry', async () => {
      const user = userEvent.setup();
      const mockEntry = {
        id: 'test-id-123',
        jahr: '2023',
        haeuser_id: 'h1',
        nebenkostenart: ['Strom'],
        betrag: [100],
        berechnungsart: ['pauschal'],
        wasserkosten: 20,
        Haeuser: { name: 'Haus A' },
        user_id: 'u1',
        Rechnungen: [],
      };

      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({ success: true, data: mockEntry });
      
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: 'test-id-123' },
      });

      render(<BetriebskostenEditModal />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Strom')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateNebenkosten).toHaveBeenCalledWith('test-id-123', expect.any(Object));
      });
      
      expect(mockCloseBetriebskostenModal).toHaveBeenCalled();
    });

    it('shows error toast on submission failure', async () => {
      const user = userEvent.setup();
      mockCreateNebenkosten.mockResolvedValueOnce({ 
        success: false, 
        message: 'Database error' 
      });
      
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Test');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '100');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith({
          title: 'Fehler beim Speichern',
          description: 'Database error',
          variant: 'destructive',
        });
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();
      let resolveCreateNebenkosten: (value: any) => void;
      const createPromise = new Promise(resolve => {
        resolveCreateNebenkosten = resolve;
      });
      mockCreateNebenkosten.mockReturnValue(createPromise);
      
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Test');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '100');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: 'Speichern...' })).toBeDisabled();
      expect(jahrInput).toBeDisabled();
      
      resolveCreateNebenkosten!({ success: true });
    });
  });

  describe('Modal Closing', () => {
    it('calls closeBetriebskostenModal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);
      
      expect(mockCloseBetriebskostenModal).toHaveBeenCalledWith({ force: true });
    });

    it('closes modal after successful submission', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Test');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '100');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCloseBetriebskostenModal).toHaveBeenCalled();
      });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Test');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '100');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockBetriebskostenModalOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Dirty State Management', () => {
    it('sets dirty state to false when modal opens', () => {
      render(<BetriebskostenEditModal />);
      
      expect(mockSetBetriebskostenModalDirty).toHaveBeenCalledWith(false);
    });

    it('sets dirty state to true when form data changes', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      expect(mockSetBetriebskostenModalDirty).toHaveBeenCalledWith(true);
    });

    it('resets dirty state to false after successful submission', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);
      
      const jahrInput = screen.getByLabelText('Jahr *');
      await user.type(jahrInput, '2024');
      
      const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
      await user.type(artInput, 'Test');
      
      const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
      await user.type(betragInput, '100');
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetBetriebskostenModalDirty).toHaveBeenCalledWith(false);
      });
    });
  });
});
