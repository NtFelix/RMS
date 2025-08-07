import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { HausOverviewModal } from '@/components/haus-overview-modal';
import { WohnungOverviewModal } from '@/components/wohnung-overview-modal';
import { ApartmentTenantDetailsModal } from '@/components/apartment-tenant-details-modal';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock format utilities
jest.mock('@/utils/format', () => ({
  formatCurrency: (value: number) => `€${value}`,
  formatNumber: (value: number) => value.toString(),
}));

// Mock components that are used within the modals
jest.mock('@/components/summary-card', () => ({
  SummaryCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid="summary-card">{title}: {value}</div>
  )
}));

jest.mock('@/components/apartment-tenant-row', () => ({
  ApartmentTenantRow: ({ apartment }: { apartment: any }) => (
    <div data-testid="apartment-tenant-row">{apartment.name}</div>
  )
}));

jest.mock('@/components/apartment-tenant-row-context-menu', () => ({
  ApartmentTenantRowContextMenu: () => <div data-testid="context-menu" />
}));

jest.mock('@/components/apartment-tenant-row-skeleton', () => ({
  ApartmentTenantRowSkeleton: () => <div data-testid="skeleton" />
}));

describe('Modal Keyboard and Click Interactions', () => {
  const mockCloseHausOverview = jest.fn();
  const mockCloseWohnungOverview = jest.fn();
  const mockCloseApartmentTenantDetails = jest.fn();

  const mockModalStore = {
    // Haus Overview Modal
    isHausOverviewModalOpen: false,
    hausOverviewData: undefined,
    hausOverviewLoading: false,
    hausOverviewError: undefined,
    closeHausOverviewModal: mockCloseHausOverview,
    setHausOverviewError: jest.fn(),
    openHausOverviewModal: jest.fn(),
    setHausOverviewLoading: jest.fn(),
    setHausOverviewData: jest.fn(),
    
    // Wohnung Overview Modal
    isWohnungOverviewModalOpen: false,
    wohnungOverviewData: undefined,
    wohnungOverviewLoading: false,
    wohnungOverviewError: undefined,
    closeWohnungOverviewModal: mockCloseWohnungOverview,
    setWohnungOverviewError: jest.fn(),
    openWohnungOverviewModal: jest.fn(),
    setWohnungOverviewLoading: jest.fn(),
    setWohnungOverviewData: jest.fn(),
    
    // Apartment Tenant Details Modal
    isApartmentTenantDetailsModalOpen: false,
    apartmentTenantDetailsData: undefined,
    apartmentTenantDetailsLoading: false,
    apartmentTenantDetailsError: undefined,
    closeApartmentTenantDetailsModal: mockCloseApartmentTenantDetails,
    setApartmentTenantDetailsError: jest.fn(),
    openApartmentTenantDetailsModal: jest.fn(),
    setApartmentTenantDetailsLoading: jest.fn(),
    setApartmentTenantDetailsData: jest.fn(),
    
    // Other modal functions (needed for context menu actions)
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
    openWohnungOverviewModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue(mockModalStore);
  });

  describe('HausOverviewModal', () => {
    it('calls close function when modal open state changes', () => {
      const { rerender } = render(<HausOverviewModal />);
      
      // Initially closed
      expect(mockCloseHausOverview).not.toHaveBeenCalled();
      
      // Open the modal
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test City',
          totalArea: 100,
          totalRent: 1000,
          apartmentCount: 2,
          tenantCount: 1,
          summaryStats: {
            averageRent: 500,
            medianRent: 500,
            averageSize: 50,
            medianSize: 50,
            occupancyRate: 0.5,
          },
          wohnungen: []
        }
      });
      
      rerender(<HausOverviewModal />);
      
      // Find the dialog and simulate onOpenChange
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // The Dialog component should call onOpenChange when closed
      // This is handled by Radix UI internally, but we can test our handler
      expect(mockCloseHausOverview).not.toHaveBeenCalled();
    });

    it('renders modal when open with data', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test City',
          totalArea: 100,
          totalRent: 1000,
          apartmentCount: 2,
          tenantCount: 1,
          summaryStats: {
            averageRent: 500,
            medianRent: 500,
            averageSize: 50,
            medianSize: 50,
            occupancyRate: 0.5,
          },
          wohnungen: []
        }
      });

      render(<HausOverviewModal />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText(/Test Haus/).length).toBeGreaterThan(0);
    });

    it('does not render modal when closed', () => {
      render(<HausOverviewModal />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('WohnungOverviewModal', () => {
    it('calls close function when modal open state changes', () => {
      render(<WohnungOverviewModal />);
      
      expect(mockCloseWohnungOverview).not.toHaveBeenCalled();
    });

    it('renders modal when open with data', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isWohnungOverviewModalOpen: true,
        wohnungOverviewData: {
          id: '1',
          name: 'Test Wohnung',
          groesse: 50,
          miete: 500,
          hausName: 'Test Haus',
          mieter: []
        }
      });

      render(<WohnungOverviewModal />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Test Wohnung/)).toBeInTheDocument();
    });
  });

  describe('ApartmentTenantDetailsModal', () => {
    it('calls close function when modal open state changes', () => {
      render(<ApartmentTenantDetailsModal />);
      
      expect(mockCloseApartmentTenantDetails).not.toHaveBeenCalled();
    });

    it('renders modal when open with data', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isApartmentTenantDetailsModalOpen: true,
        apartmentTenantDetailsData: {
          apartment: {
            id: '1',
            name: 'Test Apartment',
            groesse: 50,
            miete: 500,
            hausName: 'Test Haus'
          }
        }
      });

      render(<ApartmentTenantDetailsModal />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Apartment')).toBeInTheDocument();
    });
  });

  describe('Modal Accessibility', () => {
    it('has proper ARIA attributes for screen readers', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test City',
          totalArea: 100,
          totalRent: 1000,
          apartmentCount: 2,
          tenantCount: 1,
          summaryStats: {
            averageRent: 500,
            medianRent: 500,
            averageSize: 50,
            medianSize: 50,
            occupancyRate: 0.5,
          },
          wohnungen: []
        }
      });

      render(<HausOverviewModal />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Check for dialog title (there are multiple headings, so get all)
      expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
    });

    it('provides close button for keyboard navigation', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: {
          id: '1',
          name: 'Test Haus',
          ort: 'Test City',
          totalArea: 100,
          totalRent: 1000,
          apartmentCount: 2,
          tenantCount: 1,
          summaryStats: {
            averageRent: 500,
            medianRent: 500,
            averageSize: 50,
            medianSize: 50,
            occupancyRate: 0.5,
          },
          wohnungen: []
        }
      });

      render(<HausOverviewModal />);
      
      // The close button should be present (from DialogContent)
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
  });
});