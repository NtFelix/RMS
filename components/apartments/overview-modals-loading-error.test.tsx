import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WohnungOverviewModal } from '@/components/apartments/wohnung-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock format utilities
jest.mock('@/utils/format', () => ({
  formatNumber: (num: number) => num.toString(),
  formatCurrency: (num: number) => `€${num}`,
}));

describe('Overview Modals Loading and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('WohnungOverviewModal', () => {
    const mockWohnungOverviewStore = {
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: undefined,
      wohnungOverviewLoading: false,
      wohnungOverviewError: undefined,
      closeWohnungOverviewModal: jest.fn(),
      setWohnungOverviewLoading: jest.fn(),
      setWohnungOverviewError: jest.fn(),
      setWohnungOverviewData: jest.fn(),
      openTenantModal: jest.fn(),
    };

    it('displays loading skeleton when loading', () => {
      mockUseModalStore.mockReturnValue({
        ...mockWohnungOverviewStore,
        wohnungOverviewLoading: true,
      } as any);

      render(<WohnungOverviewModal />);

      // Should show skeleton loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows progress indicator for slow loading with tenant-specific message', async () => {
      mockUseModalStore.mockReturnValue({
        ...mockWohnungOverviewStore,
        wohnungOverviewLoading: true,
      } as any);

      render(<WohnungOverviewModal />);

      // Fast forward 1 second to trigger slow loading indicator
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Mieter-Daten werden geladen...')).toBeInTheDocument();
      });

      expect(screen.getByText('Dies kann bei umfangreichen Mieter-Historien etwas dauern.')).toBeInTheDocument();
    });

    it('displays enhanced error state with retry functionality', () => {
      mockUseModalStore.mockReturnValue({
        ...mockWohnungOverviewStore,
        wohnungOverviewError: 'Database connection failed',
      } as any);

      render(<WohnungOverviewModal />);

      // Should show error message
      expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();

      // Should show retry and close buttons
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      expect(screen.getAllByText('Schließen').length).toBeGreaterThanOrEqual(1);
    });

    it('displays empty state when no Mieter exist', () => {
      mockUseModalStore.mockReturnValue({
        ...mockWohnungOverviewStore,
        wohnungOverviewData: {
          id: '1',
          name: 'Wohnung 1A',
          groesse: 75,
          miete: 800,
          hausName: 'Test Haus',
          mieter: [],
        },
      } as any);

      render(<WohnungOverviewModal />);

      expect(screen.getByText('Keine Mieter')).toBeInTheDocument();
      expect(screen.getByText('Diese Wohnung hat noch keine Mieter.')).toBeInTheDocument();
    });
  });

});