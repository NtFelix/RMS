import React from 'react'
import { render, screen } from '@testing-library/react'
import { WohnungOverviewModal } from '@/components/apartments/wohnung-overview-modal'
import { ApartmentTenantDetailsModal } from '@/components/apartments/apartment-tenant-details-modal'
import { useModalStore } from '@/hooks/use-modal-store'

/**
 * Ohne mieter:ansehen steht an der Stelle des Mieters "Kein Zugriff" (kein Fehler, kein leerer Wert, nicht "Keine
 * Mieter"); der Status frei/vermietet bleibt sichtbar. Alle Daten sind synthetisch.
 */

jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

jest.mock('@/app/mieter-actions', () => ({ deleteTenantAction: jest.fn() }))
jest.mock('@/lib/kautionen-loeschen', () => ({ starteLoeschenMitKautionen: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }))

describe('WohnungOverviewModal ohne mieter:ansehen', () => {
  const storeBase = {
    isWohnungOverviewModalOpen: true,
    wohnungOverviewLoading: false,
    wohnungOverviewError: undefined,
    closeWohnungOverviewModal: jest.fn(),
    setWohnungOverviewLoading: jest.fn(),
    setWohnungOverviewError: jest.fn(),
    setWohnungOverviewData: jest.fn(),
    refreshWohnungOverviewData: jest.fn(),
    openTenantModal: jest.fn(),
  }

  it('zeigt "Kein Zugriff" statt "Keine Mieter"/"0/0" und den Status aus den Daten', () => {
    mockUseModalStore.mockReturnValue({
      ...storeBase,
      wohnungOverviewData: {
        id: '1', name: 'Wohnung 1', hausName: 'Musterhaus', groesse: 80, miete: 1200,
        mieter: [], tenantAccess: false, status: 'vermietet',
      },
    } as any)

    render(<WohnungOverviewModal />)

    expect(screen.getAllByText('Kein Zugriff').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Vermietet')).toBeInTheDocument()
    expect(screen.queryByText('Keine Mieter')).not.toBeInTheDocument()
    expect(screen.queryByText('0/0')).not.toBeInTheDocument()
    expect(screen.queryByText('Leer')).not.toBeInTheDocument()
    expect(screen.queryByText('Fehler beim Laden')).not.toBeInTheDocument()
  })

  it('zeigt mit Recht und ohne Mieter weiter "Keine Mieter"', () => {
    mockUseModalStore.mockReturnValue({
      ...storeBase,
      wohnungOverviewData: { id: '1', name: 'Wohnung 1', hausName: 'Musterhaus', groesse: 80, miete: 1200, mieter: [] },
    } as any)

    render(<WohnungOverviewModal />)

    expect(screen.getByText('Keine Mieter')).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
  })
})

describe('ApartmentTenantDetailsModal ohne mieter:ansehen', () => {
  const storeBase = {
    isApartmentTenantDetailsModalOpen: true,
    apartmentTenantDetailsLoading: false,
    apartmentTenantDetailsError: undefined,
    closeApartmentTenantDetailsModal: jest.fn(),
    setApartmentTenantDetailsError: jest.fn(),
    setApartmentTenantDetailsLoading: jest.fn(),
    setApartmentTenantDetailsData: jest.fn(),
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
  }
  const apartment = { id: '1', name: 'Wohnung 1A', groesse: 80, miete: 1200, hausName: 'Musterhaus' }

  it('zeigt "Kein Zugriff" statt "Keine Mieter"', () => {
    mockUseModalStore.mockReturnValue({
      ...storeBase,
      apartmentTenantDetailsData: { apartment, tenantAccess: false },
    } as any)

    render(<ApartmentTenantDetailsModal />)

    expect(screen.getByText('Kein Zugriff')).toBeInTheDocument()
    expect(screen.queryByText('Keine Mieter')).not.toBeInTheDocument()
    expect(screen.queryByText('Mieterdetails')).not.toBeInTheDocument()
  })

  it('zeigt mit Recht und ohne Mieter weiter "Keine Mieter"', () => {
    mockUseModalStore.mockReturnValue({ ...storeBase, apartmentTenantDetailsData: { apartment } } as any)

    render(<ApartmentTenantDetailsModal />)

    expect(screen.getByText('Keine Mieter')).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
  })
})
