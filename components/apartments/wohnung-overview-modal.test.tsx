import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react';
import { WohnungOverviewModal } from '@/components/apartments/wohnung-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { deleteTenantAction } from '@/app/mieter-actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

// Mock timers
jest.useFakeTimers();

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock the format utilities
jest.mock('@/utils/format', () => ({
  formatNumber: (num: number, fractionDigits: number = 2) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(num);
  },
  formatCurrency: (num: number) => `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)} €`,
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock server actions
jest.mock('@/app/mieter-actions', () => ({
  deleteTenantAction: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  starteLoeschenMitKautionen: jest.fn(),
}));

describe('WohnungOverviewModal', () => {
  const mockWohnungData = {
    id: '1',
    name: 'Wohnung 1',
    hausName: 'Test Haus',
    groesse: 80,
    miete: 1200,
    mieter: [
      {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefon: '+49123456789',
        einzug: '2023-01-01',
        auszug: null,
        status: 'active' as const,
      },
      {
        id: '2',
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        telefon: '+49987654321',
        einzug: '2022-01-01',
        auszug: '2022-12-31',
        status: 'inactive' as const,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllTimers();
    mockUseModalStore.mockReturnValue({
      isWohnungOverviewModalOpen: false,
      wohnungOverviewData: null,
      wohnungOverviewLoading: false,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      refreshWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    } as any);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
  });

  it('should not render when modal is closed', () => {
    render(<WohnungOverviewModal />);
    expect(screen.queryByText('Wohnungs-Übersicht')).not.toBeInTheDocument();
  });

  it('should render summary cards with correct data when modal is open', () => {
    mockUseModalStore.mockReturnValue({
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
      wohnungOverviewLoading: false,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      refreshWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    } as any);

    render(<WohnungOverviewModal />);
    
    expect(screen.getByText('Wohnungs-Übersicht: Wohnung 1')).toBeInTheDocument();
    expect(screen.getByText('Haus: Test Haus')).toBeInTheDocument();
    expect(screen.getByText('80,00 m²')).toBeInTheDocument();
    expect(screen.getByText('1.200,00 €')).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    mockUseModalStore.mockReturnValue({
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: null,
      wohnungOverviewLoading: true,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      refreshWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    } as any);

    render(<WohnungOverviewModal />);
    
    expect(screen.getByText('Wohnungs-Übersicht')).toBeInTheDocument();
    // Check for skeleton elements by class name
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should show empty state with summary cards when no tenants', () => {
    const emptyWohnungData = {
      ...mockWohnungData,
      mieter: [],
    };

    mockUseModalStore.mockReturnValue({
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: emptyWohnungData,
      wohnungOverviewLoading: false,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      refreshWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    } as any);

    render(<WohnungOverviewModal />);
    
    expect(screen.getByText('Keine Mieter')).toBeInTheDocument();
    expect(screen.getByText('Diese Wohnung hat noch keine Mieter.')).toBeInTheDocument();
    // Summary cards should still be visible
    expect(screen.getByText('80,00 m²')).toBeInTheDocument();
  });

  it('should calculate price per square meter correctly', () => {
    mockUseModalStore.mockReturnValue({
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
      wohnungOverviewLoading: false,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      refreshWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    } as any);

    render(<WohnungOverviewModal />);
    
    // Price per sqm should be 1200 / 80 = 15 €/m²
    expect(screen.getByText('15,00 €/m²')).toBeInTheDocument();
  });

  // Kautionsmanagement: Beim Klick auf "Löschen" wird zuerst die Auswirkung geladen; danach erscheint genau EIN Dialog.
  describe('Mieter löschen mit Kautionen', () => {
    const mockStart = starteLoeschenMitKautionen as jest.Mock;
    const mockDelete = deleteTenantAction as jest.MockedFunction<typeof deleteTenantAction>;
    const refreshWohnungOverviewData = jest.fn();

    async function klickeLoeschen() {
      mockUseModalStore.mockReturnValue({
        isWohnungOverviewModalOpen: true,
        wohnungOverviewData: mockWohnungData,
        wohnungOverviewLoading: false,
        wohnungOverviewError: undefined,
        closeWohnungOverviewModal: jest.fn(),
        setWohnungOverviewLoading: jest.fn(),
        setWohnungOverviewError: jest.fn(),
        setWohnungOverviewData: jest.fn(),
        refreshWohnungOverviewData,
        openTenantModal: jest.fn(),
      } as any);
      render(<WohnungOverviewModal />);

      fireEvent.contextMenu(screen.getByText('Max Mustermann'));
      fireEvent.click(await screen.findByText('Löschen'));
    }

    beforeEach(() => {
      mockStart.mockReset();
      mockStart.mockImplementation(async (_tabelle, _ids, handlers) => handlers.einfach());
      mockDelete.mockReset();
      refreshWohnungOverviewData.mockReset();
      mockDelete.mockResolvedValue({ success: true });
    });

    it('lädt zuerst die Auswirkung, fragt dann üblich und löscht ohne Prüfsumme', async () => {
      await klickeLoeschen();

      const dialog = await screen.findByRole('alertdialog');
      expect(mockStart).toHaveBeenCalledWith('Mieter', ['1'], expect.any(Object));
      expect(mockDelete).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('1', undefined));
      await waitFor(() => expect(refreshWohnungOverviewData).toHaveBeenCalled());
    });

    it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht löscht mit der Prüfsumme', async () => {
      mockStart.mockImplementation(async (_tabelle, _ids, handlers) => handlers.loeschen({ '1': 'abc' }));

      await klickeLoeschen();

      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('1', 'abc'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      await waitFor(() => expect(refreshWohnungOverviewData).toHaveBeenCalled());
    });

    it('löscht nichts und zeigt keine Frage, wenn die Übersicht abgebrochen wird', async () => {
      mockStart.mockImplementation(async () => undefined);

      await klickeLoeschen();

      await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Mieter', ['1'], expect.any(Object)));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(refreshWohnungOverviewData).not.toHaveBeenCalled();
    });
  });
});
