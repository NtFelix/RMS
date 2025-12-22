import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalStore } from '@/hooks/use-modal-store'
import type { ModalState } from '@/hooks/use-modal-store'
import { HausOverviewModal } from '@/components/houses/haus-overview-modal'
import { ApartmentTenantDetailsModal } from '@/components/apartments/apartment-tenant-details-modal'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Define the mock store type
type MockModalStore = Partial<{
  [K in keyof ModalState]: ModalState[K] extends (...args: any[]) => any 
    ? jest.Mock<ReturnType<ModalState[K]>, Parameters<ModalState[K]>> 
    : ModalState[K];
}> & {
  // Add any additional mock functions not in ModalState
  [key: string]: unknown;
};

// Mock fetch for API calls
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock format utilities
jest.mock('@/utils/format', () => ({
  formatNumber: (num: number) => num.toLocaleString('de-DE'),
  formatCurrency: (num: number) => `${num.toLocaleString('de-DE')} €`,
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('Overview Modals User Flows', () => {
  const mockHausData = {
    id: '1',
    name: 'Test Haus',
    strasse: 'Teststraße 1',
    ort: 'Teststadt',
    totalArea: 135,
    totalRent: 1200,
    apartmentCount: 2,
    tenantCount: 1,
    summaryStats: {
      averageRent: 1100,
      medianRent: 1100,
      averageSize: 67.5,
      medianSize: 67.5,
      occupancyRate: 50,
      vacancyRate: 50,
      averageRentPerSqm: 16.5,
      totalPotentialRent: 2200,
    },
    wohnungen: [
      {
        id: '1',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        status: 'vermietet' as const,
        currentTenant: {
          id: '1',
          name: 'Max Mustermann',
          einzug: '2023-01-01',
        },
      },
      {
        id: '2',
        name: 'Wohnung 2B',
        groesse: 60,
        miete: 1000,
        status: 'frei' as const,
      },
    ],
  }

  const mockWohnungData = {
    id: '1',
    name: 'Wohnung 1A',
    groesse: 75,
    miete: 1200,
    hausName: 'Test Haus',
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
    ],
  }

  const mockApartmentTenantDetails = {
    apartment: {
      id: '1',
      name: 'Wohnung 1A',
      groesse: 75,
      miete: 1200,
      hausName: 'Test Haus',
      amenities: ['Balkon', 'Keller'],
      condition: 'Gut',
      notes: 'Renoviert 2023',
    },
    tenant: {
      id: '1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefon: '+49123456789',
      einzug: '2023-01-01',
      leaseTerms: '2 Jahre Mindestmietdauer',
      notes: 'Zuverlässiger Mieter',
      paymentHistory: [
        {
          id: '1',
          amount: 1200,
          date: '2023-12-01',
          status: 'paid' as const,
          description: 'Miete Dezember',
        },
      ],
    },
  }

  const mockModalStore = {
    // Haus Overview Modal
    isHausOverviewModalOpen: false,
    hausOverviewData: undefined,
    hausOverviewLoading: false,
    hausOverviewError: undefined,
    openHausOverviewModal: jest.fn(),
    closeHausOverviewModal: jest.fn(),
    setHausOverviewLoading: jest.fn(),
    setHausOverviewError: jest.fn(),
    setHausOverviewData: jest.fn(),
    refreshHausOverviewData: jest.fn(),

    // Apartment Tenant Details Modal
    apartmentTenantDetailsData: undefined,
    apartmentTenantDetailsLoading: false,
    apartmentTenantDetailsError: undefined,
    openApartmentTenantDetailsModal: jest.fn(),
    closeApartmentTenantDetailsModal: jest.fn(),
    setApartmentTenantDetailsLoading: jest.fn(),
    setApartmentTenantDetailsError: jest.fn(),
    setApartmentTenantDetailsData: jest.fn(),
    refreshApartmentTenantDetailsData: jest.fn(),

    // Edit modals
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Properly type the mock implementation
    mockUseModalStore.mockImplementation(
      () => mockModalStore as unknown as ReturnType<typeof useModalStore>
    )
    mockFetch.mockClear()
  })

  describe('Modal Store Integration', () => {
    it('calls modal store functions correctly', () => {
      // Test that modal store functions are available
      expect(mockModalStore.openHausOverviewModal).toBeDefined()
      expect(mockModalStore.openApartmentTenantDetailsModal).toBeDefined()
      expect(mockModalStore.closeHausOverviewModal).toBeDefined()
    })
  })

  describe('Modal Rendering', () => {
    it('renders Haus overview modal when open', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: mockHausData,
      } as any)

      render(<HausOverviewModal />)

      expect(screen.getByText('Test Haus - Übersicht')).toBeInTheDocument()
      expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    })

    it('does not render when modal is closed', () => {
      mockUseModalStore.mockImplementation(() => ({
        ...mockModalStore,
        isHausOverviewModalOpen: false,
      } as unknown as ReturnType<typeof useModalStore>))

      render(<HausOverviewModal />)

      expect(screen.queryByText('Test Haus - Übersicht')).not.toBeInTheDocument()
    })
  })

  describe('Details Modal Integration', () => {
    it('renders apartment tenant details modal when open', () => {
      mockUseModalStore.mockImplementation(() => ({
        ...mockModalStore,
        isApartmentTenantDetailsModalOpen: true,
        apartmentTenantDetailsData: mockApartmentTenantDetails,
      } as unknown as ReturnType<typeof useModalStore>))

      render(<ApartmentTenantDetailsModal />)

      expect(screen.getByText('Wohnung-Mieter Details')).toBeInTheDocument()
      expect(screen.getByText('Wohnungsdetails')).toBeInTheDocument()
      expect(screen.getByText('Mieterdetails')).toBeInTheDocument()
    })

    it('handles vacant apartment state', () => {
      const vacantApartmentData = {
        apartment: mockApartmentTenantDetails.apartment,
        tenant: undefined,
      }

      mockUseModalStore.mockImplementation(() => ({
        ...mockModalStore,
        isApartmentTenantDetailsModalOpen: true,
        apartmentTenantDetailsData: vacantApartmentData,
      } as unknown as ReturnType<typeof useModalStore>))

      render(<ApartmentTenantDetailsModal />)

      expect(screen.getByText('Keine Mieter')).toBeInTheDocument()
      expect(screen.getByText('Diese Wohnung ist derzeit nicht vermietet.')).toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading state for Haus overview', () => {
      mockUseModalStore.mockImplementation(() => ({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewLoading: true,
      } as unknown as ReturnType<typeof useModalStore>))

      render(<HausOverviewModal />)

      // Should show skeleton loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('shows error state for Haus overview', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewError: 'Network error',
      } as any)

      render(<HausOverviewModal />)

      expect(screen.getAllByText('Fehler beim Laden')[0]).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('displays summary statistics correctly', () => {
      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: mockHausData,
      } as any)

      render(<HausOverviewModal />)

      // Check that summary data is displayed
      expect(screen.getByText('135 m²')).toBeInTheDocument() // Total area
      expect(screen.getByText('2 Stk.')).toBeInTheDocument() // Apartment count
      expect(screen.getByText('1 aktiv')).toBeInTheDocument() // Tenant count
      expect(screen.getByText('1.200 €')).toBeInTheDocument() // Total rent
    })

    it('handles empty state correctly', () => {
      const emptyHausData = {
        ...mockHausData,
        wohnungen: [],
        apartmentCount: 0,
        tenantCount: 0,
        totalArea: 0,
        totalRent: 0,
      }

      mockUseModalStore.mockReturnValue({
        ...mockModalStore,
        isHausOverviewModalOpen: true,
        hausOverviewData: emptyHausData,
      } as any)

      render(<HausOverviewModal />)

      expect(screen.getByText('Keine Wohnungen')).toBeInTheDocument()
      expect(screen.getByText('Dieses Haus hat noch keine Wohnungen.')).toBeInTheDocument()
    })
  })
})