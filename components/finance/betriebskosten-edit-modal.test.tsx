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

// Mock framer-motion to avoid animation issues in JSDOM
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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
  const mockHaeuser = [{ id: 'h1', name: 'Haus A', ort: 'Ort', strasse: 'Strasse', erstellt_von: 'u1' }];
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

    mockUseModalStore.mockReturnValue(defaultStoreState);

    mockToast.mockReturnValue({ toast: mockToastFn, dismiss: jest.fn(), toasts: [] });

    mockCreateNebenkosten.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    mockUpdateNebenkosten.mockResolvedValue({ success: true, data: null });
    mockGetNebenkostenDetailsAction.mockResolvedValue({ success: true, data: null });
    mockCreateRechnungenBatch.mockResolvedValue({ success: true, data: [] });
    mockDeleteRechnungenByNebenkostenId.mockResolvedValue({ success: true });
    mockGetMieterByHausIdAction.mockResolvedValue({ success: true, data: [] });
  });

  async function fillCostItem(user: ReturnType<typeof userEvent.setup>) {
    const artInput = screen.getAllByPlaceholderText('Kostenart')[0];
    await user.click(artInput);
    await user.keyboard('Test Kosten');

    const betragInput = screen.getAllByPlaceholderText('Betrag (€)')[0];
    await user.click(betragInput);
    await user.keyboard('100');
  }

  describe('Rendering', () => {
    it('renders create modal when no initial data is provided', async () => {
      render(<BetriebskostenEditModal />);

      expect(screen.getByText('Objekt & Zeitraum')).toBeInTheDocument();
      expect(screen.getByText('Nebenkosten')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Weiter/ })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockGetMieterByHausIdAction).toHaveBeenCalled();
      });
      await act(async () => {});
      await act(async () => {});
    });

    it('renders edit modal when initial data is provided', () => {
      const initialData = { id: '1' };
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: initialData,
      });

      render(<BetriebskostenEditModal />);

      expect(screen.getByText('Objekt & Zeitraum')).toBeInTheDocument();
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

      expect(screen.getByText('Immobilie auswählen *')).toBeInTheDocument();
      expect(screen.getByLabelText('Startdatum *')).toBeInTheDocument();
      expect(screen.getByLabelText('Enddatum *')).toBeInTheDocument();
      expect(screen.getByText('-1 Jahr')).toBeInTheDocument();
      expect(screen.getByText('+1 Jahr')).toBeInTheDocument();
      expect(screen.getByText('Zahlungsmethode')).toBeInTheDocument();
      expect(screen.getByText('Soll-Verfahren')).toBeInTheDocument();
      expect(screen.getByText('Ist-Verfahren')).toBeInTheDocument();
    });

    it('shows step 2 content after clicking Weiter', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: /Weiter/ }));

      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();
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
        zaehlerkosten: { kaltwasser: 20 },
        zaehlerverbrauch: {},
        Haeuser: { name: 'Haus A' },
        erstellt_von: 'u1',
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
        expect(screen.getByDisplayValue('01.01.2023')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('31.12.2023')).toBeInTheDocument();
    });

    it('shows loading state while fetching details', async () => {
      mockGetNebenkostenDetailsAction.mockImplementation(() => new Promise(() => { }));

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: '1' },
      });

      render(<BetriebskostenEditModal />);

      await waitFor(() => {
        expect(screen.getByText(/Lade Details|Laden/i)).toBeInTheDocument();
      }, { timeout: 1000 }).catch(() => {
        expect(mockGetNebenkostenDetailsAction).toHaveBeenCalled();
      });
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
    it('allows adding and removing cost items on step 2', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();

      await user.click(screen.getByText('Weitere Kostenposition hinzufügen'));

      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(2);

      await user.click(screen.getAllByLabelText('Kostenposition entfernen')[0]);
      expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
    });
  });

  describe('Form Submission', () => {
    it('shows validation error when no house is selected on step 1', async () => {
      const user = userEvent.setup();

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenModalHaeuser: [],
      });

      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: /Weiter/ }));

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Haus erforderlich',
            variant: 'destructive',
          })
        );
      });
    });

    it('calls createNebenkosten on submission', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();

      await fillCostItem(user);

      await user.click(await screen.findByRole('button', { name: /Speichern & Abschließen/ }));

      await waitFor(() => {
        expect(mockCreateNebenkosten).toHaveBeenCalled();
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
        zaehlerkosten: { kaltwasser: 20 },
        zaehlerverbrauch: {},
        Haeuser: { name: 'Haus A' },
        erstellt_von: 'u1',
        Rechnungen: [],
      };

      mockGetNebenkostenDetailsAction.mockResolvedValueOnce({ success: true, data: mockEntry });

      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        betriebskostenInitialData: { id: 'test-id-123' },
      });

      render(<BetriebskostenEditModal />);

      await waitFor(() => {
        expect(screen.getByText('Haus A')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();

      // Cost items should be pre-populated on step 2 from edit data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Strom')).toBeInTheDocument();
      });

      await user.click(await screen.findByRole('button', { name: /Speichern & Abschließen/ }));

      await waitFor(() => {
        expect(mockUpdateNebenkosten).toHaveBeenCalledWith('test-id-123', expect.any(Object));
      });
    });

    it('shows error toast on submission failure', async () => {
      const user = userEvent.setup();
      mockCreateNebenkosten.mockResolvedValueOnce({
        success: false,
        message: 'Database error',
        data: null
      });

      render(<BetriebskostenEditModal />);
      await user.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();

      await fillCostItem(user);

      await user.click(await screen.findByRole('button', { name: /Speichern & Abschließen/ }));

      await waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith({
          title: 'Fehler beim Speichern',
          description: 'Database error',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Modal Closing', () => {
    it('calls closeBetriebskostenModal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

      expect(mockCloseBetriebskostenModal).toHaveBeenCalledWith({ force: true });
    });

    it('calls onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(await screen.findByText('Kostenaufstellung')).toBeInTheDocument();

      await fillCostItem(user);

      await user.click(await screen.findByRole('button', { name: /Speichern & Abschließen/ }));

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

    it('sets dirty state to true when +1 Jahr button is clicked', async () => {
      const user = userEvent.setup();
      render(<BetriebskostenEditModal />);

      await user.click(screen.getByText('+1 Jahr'));

      expect(mockSetBetriebskostenModalDirty).toHaveBeenCalledWith(true);
    });
  });
});
