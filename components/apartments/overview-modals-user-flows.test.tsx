import React from 'react'
import { render, screen } from '@testing-library/react'
import { useModalStore } from '@/hooks/use-modal-store'
import { ApartmentTenantDetailsModal } from '@/components/apartments/apartment-tenant-details-modal'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

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