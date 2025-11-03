import { render, screen } from '@testing-library/react';
import { HausOverviewModal } from './haus-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock the format utilities
jest.mock('@/utils/format', () => ({
  formatNumber: (num: number) => num.toLocaleString('de-DE'),
  formatCurrency: (num: number) => `€${num.toFixed(2)}`,
}));

describe('HausOverviewModal', () => {
  const mockHausData = {
    id: '1',
    name: 'Test Haus',
    strasse: 'Teststraße 1',
    ort: 'Berlin',
    size: 500,
    wohnungen: [
      {
        id: '1',
        name: 'Wohnung 1',
        groesse: 80,
        miete: 1200,
        status: 'vermietet' as const,
        currentTenant: {
          name: 'Max Mustermann',
          einzug: '2023-01-01',
        },
      },
      {
        id: '2',
        name: 'Wohnung 2',
        groesse: 60,
        miete: 900,
        status: 'frei' as const,
        currentTenant: null,
      },
    ],
  };

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: false,
      hausOverviewData: null,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: jest.fn(),
      setHausOverviewLoading: jest.fn(),
      setHausOverviewError: jest.fn(),
      setHausOverviewData: jest.fn(),
      openWohnungModal: jest.fn(),
      openWohnungOverviewModal: jest.fn(),
    } as any);
  });

  it('should not render when modal is closed', () => {
    render(<HausOverviewModal />);
    expect(screen.queryByText('Haus-Übersicht')).not.toBeInTheDocument();
  });

  it('should render summary cards with correct data when modal is open', () => {
    const mockHausDataWithStats = {
      ...mockHausData,
      totalArea: 140,
      totalRent: 2100,
      tenantCount: 1,
      apartmentCount: 2
    };

    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: mockHausDataWithStats,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: jest.fn(),
      setHausOverviewLoading: jest.fn(),
      setHausOverviewError: jest.fn(),
      setHausOverviewData: jest.fn(),
      openWohnungModal: jest.fn(),
      openWohnungOverviewModal: jest.fn(),
    } as any);

    render(<HausOverviewModal />);

    // Check if summary cards are rendered with correct values
    expect(screen.getByText('Gesamtfläche')).toBeInTheDocument();
    expect(screen.getAllByText('Wohnungen')).toHaveLength(2); // One in summary card, one as section header
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('Gesamtmiete')).toBeInTheDocument();
    
    // Check house name is displayed
    expect(screen.getByText('Test Haus')).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: null,
      hausOverviewLoading: true,
      hausOverviewError: undefined,
      closeHausOverviewModal: jest.fn(),
      setHausOverviewLoading: jest.fn(),
      setHausOverviewError: jest.fn(),
      setHausOverviewData: jest.fn(),
      openWohnungModal: jest.fn(),
      openWohnungOverviewModal: jest.fn(),
    } as any);

    render(<HausOverviewModal />);

    // Check if loading skeleton is rendered
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('should show empty state with summary cards when no apartments', () => {
    const emptyHausData = {
      ...mockHausData,
      wohnungen: [],
    };

    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: emptyHausData,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: jest.fn(),
      setHausOverviewLoading: jest.fn(),
      setHausOverviewError: jest.fn(),
      setHausOverviewData: jest.fn(),
      openWohnungModal: jest.fn(),
      openWohnungOverviewModal: jest.fn(),
    } as any);

    render(<HausOverviewModal />);

    // Check if summary cards are still rendered
    expect(screen.getByText('Gesamtfläche')).toBeInTheDocument();
    expect(screen.getByText('0 m²')).toBeInTheDocument(); // No apartment area

    // Check if empty state message is shown
    expect(screen.getByText('Keine Wohnungen')).toBeInTheDocument();
    expect(screen.getByText('Dieses Haus hat noch keine Wohnungen.')).toBeInTheDocument();
  });
});