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

jest.mock('@/app/mieter-actions');

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
    mockToast.mockReturnValue({ toast: mockToastFn, dismiss: jest.fn(), toasts: [] });

    // Mock server actions with default successful responses
    mockCreateNebenkosten.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    mockUpdateNebenkosten.mockResolvedValue({ success: true, data: null });
    mockGetNebenkostenDetailsAction.mockResolvedValue({ success: true, data: null });
    mockCreateRechnungenBatch.mockResolvedValue({ success: true, data: [] });
    mockDeleteRechnungenByNebenkostenId.mockResolvedValue({ success: true });
    mockGetMieterByHausIdAction.mockResolvedValue({ success: true, data: [] });
  });

  describe('Rendering', () => {
    it('renders create modal when no initial data is provided', async () => {
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      expect(screen.getByText('Neue Betriebskostenabrechnung')).toBeInTheDocument();

      // Wait for the loading state to finish and check for the submit button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Speichern|Laden/ })).toBeInTheDocument();
      });
    });

    it('renders edit modal when initial data is provided', async () => {
      const initialData = { id: '1' };
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: initialData,
      });

      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      expect(screen.getByText('Betriebskosten bearbeiten')).toBeInTheDocument();
    });

    it('does not render when modal is closed', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isBetriebskostenModalOpen: false,
      });

      const { container } = await act(async () => {
        return render(<BetriebskostenEditModal />);
      });
      expect(container.firstChild).toBeNull();
    });

    it('renders all form fields', async () => {
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      expect(screen.getByText('Haus *')).toBeInTheDocument(); 
      expect(screen.getByLabelText('Startdatum *')).toBeInTheDocument();
      expect(screen.getByLabelText('Enddatum *')).toBeInTheDocument();
      expect(screen.getByText('Zählerkosten (€)')).toBeInTheDocument();
      expect(screen.getByText('Kostenaufstellung')).toBeInTheDocument();
    });

    it('renders for new entry with one default cost item', async () => {
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
      expect(screen.getAllByRole('combobox')).toHaveLength(3); 
    });
  });

  describe('Data Loading and Population', () => {
    it('populates form fields when editing existing entry', async () => {
      const mockEntry = {
        id: '1',
        startdatum: '2023-01-01',
        enddatum: '2023-12-31',
        haeuser_id: 'h1',
        nebenkostenart: ['Strom', 'Wasser'],
        betrag: [100, 50],
        berechnungsart: ['pro Flaeche', 'pro Mieter'],
        wasserkosten: 20,
        zaehlerkosten: { kaltwasser: '20' },
        zaehlerverbrauch: {},
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

      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('01.01.2023')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('31.12.2023')).toBeInTheDocument();
      
      const allInputs = Array.from(document.querySelectorAll('input'));
      const values = allInputs.map(i => i.value);
      
      expect(values).toContain('Strom');
      expect(values).toContain('Wasser');
      
      const containsValue = (val: string) => {
        const localized = val.replace('.', ',');
        return values.some(v => v === localized || v === localized + ',00' || v === val);
      };
      
      expect(containsValue('20')).toBe(true);
      expect(containsValue('100')).toBe(true);
      expect(containsValue('50')).toBe(true);
    });

    it('handles error when loading details fails', async () => {
      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({
        success: false,
        message: 'Loading failed',
      });

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: '1' },
      });

      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
          title: expect.stringMatching(/Fehler beim Laden/),
        }));
      });
    });
  });

  describe('Cost Items Management', () => {
    it('allows adding and removing cost items', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      const addButton = screen.getByRole('button', { name: /Kostenposition hinzufügen/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(2);
      });

      // The remove buttons are ghost buttons with Trash icon
      const removeButtons = screen.getAllByRole('button').filter(b => 
        b.innerHTML.includes('lucide-trash') || b.title.includes('entfernen')
      );
      
      await act(async () => {
        fireEvent.click(removeButtons[1]);
      });

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
      });
    });
  });

  describe('Form Submission', () => {
    it('shows validation error for missing required fields', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      const startdatumInput = screen.getByLabelText('Startdatum *');
      const enddatumInput = screen.getByLabelText('Enddatum *');
      await user.clear(startdatumInput);
      await user.clear(enddatumInput);

      const submitButton = screen.getByRole('button', { name: /Speichern|Laden/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/Ungültige Datumsangaben|Fehlende Eingaben/),
          variant: 'destructive',
        }));
      });
    });

    it('successfully updates existing Nebenkosten entry', async () => {
      const user = userEvent.setup();
      const mockEntry = {
        id: 'test-id-123',
        startdatum: '2023-01-01',
        enddatum: '2023-12-31',
        haeuser_id: 'h1',
        nebenkostenart: ['Strom'],
        betrag: [100],
        berechnungsart: ['pauschal'],
        wasserkosten: 20,
        zaehlerkosten: {},
        zaehlerverbrauch: {},
        Haeuser: { name: 'Haus A' },
        user_id: 'u1',
        Rechnungen: [],
      };

      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({ success: true, data: mockEntry });

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: 'test-id-123' },
      });

      await act(async () => {
        render(<BetriebskostenEditModal />);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Strom')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateNebenkosten).toHaveBeenCalled();
      });

      expect(mockCloseBetriebskostenModal).toHaveBeenCalled();
    });
  });
});
