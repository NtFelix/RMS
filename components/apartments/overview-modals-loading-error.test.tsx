import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { HausOverviewModal } from '@/components/houses/haus-overview-modal';
import { WohnungOverviewModal } from '@/components/apartments/wohnung-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

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

  describe('HausOverviewModal', () => {
    const mockHausOverviewStore = {
      isHausOverviewModalOpen: true,
      hausOverviewData: undefined,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: jest.fn(),
      setHausOverviewLoading: jest.fn(),
      setHausOverviewError: jest.fn(),
      setHausOverviewData: jest.fn(),
      openWohnungModal: jest.fn(),
    };

    it('displays loading skeleton when loading', () => {
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewLoading: true,
      } as any);

      render(<HausOverviewModal />);

      // Should show skeleton loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows progress indicator for slow loading after 1 second', async () => {
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewLoading: true,
      } as any);

      render(<HausOverviewModal />);

      // Fast forward 1 second to trigger slow loading indicator
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Haus-Übersicht wird geladen...')).toBeInTheDocument();
      });

      // Should show progress bar
      expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('displays enhanced error state with retry functionality', () => {
      const mockRetry = jest.fn();
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewError: 'Network error occurred',
      } as any);

      render(<HausOverviewModal />);

      // Should show error message (there are multiple elements with this text, so use getAllByText)
      expect(screen.getAllByText('Fehler beim Laden')).toHaveLength(2);
      expect(screen.getByText(/Network error occurred/)).toBeInTheDocument();

      // Should show retry button
      const retryButton = screen.getByText('Erneut versuchen');
      expect(retryButton).toBeInTheDocument();

      // Should show close button
      expect(screen.getByText('Schließen')).toBeInTheDocument();
    });

    it('handles timeout error after 2 seconds', async () => {
      // First render with loading state to set loadingStartTime
      const { rerender } = render(<HausOverviewModal />);
      
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewLoading: true,
      } as any);

      rerender(<HausOverviewModal />);

      // Advance time to set loadingStartTime
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Then show timeout error
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewError: 'Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.',
      } as any);

      rerender(<HausOverviewModal />);

      expect(screen.getByText(/Das Laden dauert länger als erwartet/)).toBeInTheDocument();
      // The timeout message should appear since we had a loading state
      await waitFor(() => {
        expect(screen.getByText('Ladezeit überschritten (max. 2 Sekunden)')).toBeInTheDocument();
      });
    });

    it('displays empty state when no Wohnungen exist', () => {
      mockUseModalStore.mockReturnValue({
        ...mockHausOverviewStore,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test Stadt',
          wohnungen: [],
        },
      } as any);

      render(<HausOverviewModal />);

      expect(screen.getByText('Keine Wohnungen')).toBeInTheDocument();
      expect(screen.getByText('Dieses Haus hat noch keine Wohnungen.')).toBeInTheDocument();
    });
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
      expect(screen.getByText('Schließen')).toBeInTheDocument();
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

  describe('Progress Tracking', () => {
    it('completes progress when loading finishes successfully', async () => {
      const { rerender } = render(<HausOverviewModal />);

      // Start with loading state
      mockUseModalStore.mockReturnValue({
        isHausOverviewModalOpen: true,
        hausOverviewLoading: true,
        hausOverviewData: undefined,
        hausOverviewError: undefined,
        closeHausOverviewModal: jest.fn(),
        setHausOverviewLoading: jest.fn(),
        setHausOverviewError: jest.fn(),
        setHausOverviewData: jest.fn(),
        openWohnungModal: jest.fn(),
      } as any);

      rerender(<HausOverviewModal />);

      // Advance time to trigger slow loading
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Then finish loading
      mockUseModalStore.mockReturnValue({
        isHausOverviewModalOpen: true,
        hausOverviewLoading: false,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test Stadt',
          wohnungen: [],
        },
        hausOverviewError: undefined,
        closeHausOverviewModal: jest.fn(),
        setHausOverviewLoading: jest.fn(),
        setHausOverviewError: jest.fn(),
        setHausOverviewData: jest.fn(),
        openWohnungModal: jest.fn(),
      } as any);

      rerender(<HausOverviewModal />);

      // Progress should complete and then reset
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should no longer show loading indicators
      expect(screen.queryByText('Daten werden geladen...')).not.toBeInTheDocument();
    });
  });
});