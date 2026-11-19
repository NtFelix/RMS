import { render, screen } from '@testing-library/react'
import TenantPaymentOverviewModal from './tenant-payment-overview-modal'
import { useTenantPayments } from '@/hooks/use-tenant-payments'

/**
 * Modal "Mietzahlungen": without mieter:ansehen and finanzen:ansehen (/api/tenants-data answers 403) it shows "no
 * access", not an empty list and not the red load error. Synthetic data.
 */

jest.mock('@/hooks/use-tenant-payments')
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    isTenantPaymentOverviewModalOpen: true,
    closeTenantPaymentOverviewModal: jest.fn(),
    openTenantPaymentEditModal: jest.fn(),
  }),
}))
jest.mock('@/utils/supabase/client', () => ({ createClient: jest.fn(() => ({})) }))

const base = {
  data: [] as unknown[],
  loading: false,
  error: null as string | null,
  noAccess: false,
  updatingStatus: null,
  fetchData: jest.fn(),
  toggleRentPayment: jest.fn(),
}

function mockHook(overrides: Partial<typeof base>) {
  ;(useTenantPayments as jest.Mock).mockReturnValue({ ...base, ...overrides })
}

describe('TenantPaymentOverviewModal', () => {
  it('zeigt ohne Berechtigung "Kein Zugriff" statt der leeren Liste oder des Ladefehlers', () => {
    mockHook({ noAccess: true })

    render(<TenantPaymentOverviewModal />)

    expect(screen.getByText('Kein Zugriff')).toBeInTheDocument()
    expect(screen.getByText(/Berechtigung \(Mieter und Finanzen ansehen\)/)).toBeInTheDocument()
  })

  it('zeigt einen Ladefehler weiter als Fehler, nicht als "Kein Zugriff"', () => {
    mockHook({ error: 'Mietzahlungen konnten nicht geladen werden.' })

    render(<TenantPaymentOverviewModal />)

    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
    expect(screen.getByText(/Mietzahlungen konnten nicht geladen werden./)).toBeInTheDocument()
  })
})
