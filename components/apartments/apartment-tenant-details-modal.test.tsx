import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ApartmentTenantDetailsModal } from '@/components/apartments/apartment-tenant-details-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the format utilities
jest.mock('@/utils/format', () => ({
  formatCurrency: (value: number) => `${value.toFixed(2)} €`,
  formatNumber: (value: number) => value.toFixed(2),
}))

describe('ApartmentTenantDetailsModal', () => {
  const mockModalStore = {
    isApartmentTenantDetailsModalOpen: false,
    apartmentTenantDetailsData: undefined,
    apartmentTenantDetailsLoading: false,
    apartmentTenantDetailsError: undefined,
    closeApartmentTenantDetailsModal: jest.fn(),
    setApartmentTenantDetailsError: jest.fn(),
    setApartmentTenantDetailsLoading: jest.fn(),
    setApartmentTenantDetailsData: jest.fn(),
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue(mockModalStore as any)
  })

  it('should not render when modal is closed', () => {
    render(<ApartmentTenantDetailsModal />)
    expect(screen.queryByText('Wohnung-Mieter Details')).not.toBeInTheDocument()
  })

  it('should render loading state when modal is open and loading', () => {
    mockUseModalStore.mockReturnValue({
      ...mockModalStore,
      isApartmentTenantDetailsModalOpen: true,
      apartmentTenantDetailsLoading: true,
    } as any)

    render(<ApartmentTenantDetailsModal />)
    expect(screen.getByText('Wohnung-Mieter Details')).toBeInTheDocument()
    // Check for skeleton loading elements
    expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it('should render error state when there is an error', () => {
    mockUseModalStore.mockReturnValue({
      ...mockModalStore,
      isApartmentTenantDetailsModalOpen: true,
      apartmentTenantDetailsError: 'Failed to load data',
    } as any)

    render(<ApartmentTenantDetailsModal />)
    expect(screen.getAllByText('Fehler beim Laden')).toHaveLength(2) // Title and error message
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
  })

  it('should render apartment and tenant details when data is available', () => {
    const mockData = {
      apartment: {
        id: '1',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        hausName: 'Musterhaus',
        amenities: ['Balkon', 'Keller'],
        condition: 'Gut',
        notes: 'Renoviert 2023',
      },
      tenant: {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefon: '+49 123 456789',
        einzug: '2023-01-01',
        auszug: undefined,
        leaseTerms: '2 Jahre Mindestmietdauer',
        paymentHistory: [
          {
            id: '1',
            amount: 1200,
            date: '2023-12-01',
            status: 'paid' as const,
            description: 'Miete Dezember',
          },
        ],
        notes: 'Zuverlässiger Mieter',
      },
    }

    mockUseModalStore.mockReturnValue({
      ...mockModalStore,
      isApartmentTenantDetailsModalOpen: true,
      apartmentTenantDetailsData: mockData,
    } as any)

    render(<ApartmentTenantDetailsModal />)

    // Check apartment details
    expect(screen.getByText('Wohnungsdetails')).toBeInTheDocument()
    expect(screen.getByText('Musterhaus')).toBeInTheDocument()
    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.getByText('75.00 m²')).toBeInTheDocument()
    expect(screen.getAllByText('1200.00 €')).toHaveLength(2) // Appears in apartment details and payment history

    // Check tenant details
    expect(screen.getByText('Mieterdetails')).toBeInTheDocument()
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.getByText('max@example.com')).toBeInTheDocument()
    expect(screen.getByText('+49 123 456789')).toBeInTheDocument()
    expect(screen.getByText('Zuverlässiger Mieter')).toBeInTheDocument()

    // Check amenities
    expect(screen.getByText('Balkon')).toBeInTheDocument()
    expect(screen.getByText('Keller')).toBeInTheDocument()

    // Check edit buttons
    expect(screen.getAllByText('Bearbeiten')).toHaveLength(2) // One for apartment, one for tenant
  })

  it('should render vacant apartment state when no tenant data', () => {
    const mockData = {
      apartment: {
        id: '1',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        hausName: 'Musterhaus',
      },
      tenant: undefined,
    }

    mockUseModalStore.mockReturnValue({
      ...mockModalStore,
      isApartmentTenantDetailsModalOpen: true,
      apartmentTenantDetailsData: mockData,
    } as any)

    render(<ApartmentTenantDetailsModal />)

    expect(screen.getByText('Wohnungsdetails')).toBeInTheDocument()
    expect(screen.getByText('Keine Mieter')).toBeInTheDocument()
    expect(screen.getByText('Diese Wohnung ist derzeit nicht vermietet.')).toBeInTheDocument()
  })

  it('should call edit functions when edit buttons are clicked', async () => {
    const mockData = {
      apartment: {
        id: '1',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        hausName: 'Musterhaus',
      },
      tenant: {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefon: '+49 123 456789',
        einzug: '2023-01-01',
      },
    }

    mockUseModalStore.mockReturnValue({
      ...mockModalStore,
      isApartmentTenantDetailsModalOpen: true,
      apartmentTenantDetailsData: mockData,
    } as any)

    render(<ApartmentTenantDetailsModal />)

    const editButtons = screen.getAllByText('Bearbeiten')
    
    // Click apartment edit button
    editButtons[0].click()
    await waitFor(() => {
      expect(mockModalStore.openWohnungModal).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Wohnung 1A',
          groesse: 75,
          miete: 1200,
        }),
        [],
        expect.any(Function)
      )
    })

    // Click tenant edit button
    editButtons[1].click()
    await waitFor(() => {
      expect(mockModalStore.openTenantModal).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          telefonnummer: '+49 123 456789',
          einzug: '2023-01-01',
          wohnung_id: '1',
        }),
        [{ id: '1', name: 'Wohnung 1A' }]
      )
    })
  })
})