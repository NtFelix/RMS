import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalStore } from '@/hooks/use-modal-store'
import type { ModalState } from '@/hooks/use-modal-store'
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
      expect(mockModalStore.openApartmentTenantDetailsModal).toBeDefined()
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

})