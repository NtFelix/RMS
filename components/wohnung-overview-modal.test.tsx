import { render, screen } from '@testing-library/react';
import { WohnungOverviewModal } from './wohnung-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';

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

    // Check if modal title is rendered
    expect(screen.getByText('Wohnungs-Übersicht: Wohnung 1')).toBeInTheDocument();

    // Check if summary cards are rendered with correct values
    expect(screen.getByText('Wohnungsgröße')).toBeInTheDocument();
    expect(screen.getByText('80,00 m²')).toBeInTheDocument();

    expect(screen.getByText('Monatsmiete')).toBeInTheDocument();
    expect(screen.getByText('1.200,00 €')).toBeInTheDocument();

    expect(screen.getByText('Mieter Status')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument(); // Active/Total tenants

    expect(screen.getByText('Belegung')).toBeInTheDocument();
    // Should show days since current tenant moved in
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

    // Check if loading skeleton is rendered with summary cards
    expect(screen.getByText('Wohnungsgröße')).toBeInTheDocument();
    expect(screen.getByText('Monatsmiete')).toBeInTheDocument();
    expect(screen.getByText('Mieter Status')).toBeInTheDocument();
    expect(screen.getByText('Belegung')).toBeInTheDocument();
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

    // Check if summary cards are still rendered
    expect(screen.getByText('Wohnungsgröße')).toBeInTheDocument();
    expect(screen.getByText('80,00 m²')).toBeInTheDocument();

    expect(screen.getByText('Mieter Status')).toBeInTheDocument();
    expect(screen.getByText('0/0')).toBeInTheDocument(); // No tenants

    // Check if empty state message is shown
    expect(screen.getByText('Keine Mieter')).toBeInTheDocument();
    expect(screen.getByText('Diese Wohnung hat noch keine Mieter.')).toBeInTheDocument();
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

    // Check if price per square meter is calculated correctly (1200 / 80 = 15)
    expect(screen.getByText('15,00 €/m²')).toBeInTheDocument();
  });
});