import { render, screen } from '@testing-library/react'
import { TenantPaymentBento } from './tenant-payment-bento'
import { useTenantPayments } from '@/hooks/use-tenant-payments'

/**
 * Dashboard card "Mietzahlungen": without mieter:ansehen and finanzen:ansehen (/api/tenants-data answers 403) it shows
 * "no access", not an empty list and not a red error. Synthetic data.
 */

jest.mock('@/hooks/use-tenant-payments')
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({ openTenantPaymentEditModal: jest.fn(), openTenantPaymentOverviewModal: jest.fn() }),
}))

const base = {
  data: [] as unknown[],
  loading: false,
  error: null as string | null,
  noAccess: false,
  updatingStatus: null,
  fetchData: jest.fn(),
  toggleRentPayment: jest.fn(),
  setData: jest.fn(),
}

function mockHook(overrides: Partial<typeof base>) {
  ;(useTenantPayments as jest.Mock).mockReturnValue({ ...base, ...overrides })
}

describe('TenantPaymentBento', () => {
  it('zeigt ohne Berechtigung "kein Zugriff" statt der leeren Liste', () => {
    mockHook({ noAccess: true })

    render(<TenantPaymentBento />)

    expect(screen.getByText(/Berechtigung/)).toBeInTheDocument()
    expect(screen.queryByText('Keine aktiven Mieter gefunden.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('zeigt einen Ladefehler (z. B. fehlgeschlagene Rechtepruefung) als Hinweis, nicht als leere Liste', () => {
    mockHook({ error: 'Berechtigungen konnten nicht geprüft werden. Bitte versuchen Sie es erneut.' })

    render(<TenantPaymentBento />)

    expect(screen.getByRole('alert')).toHaveTextContent('Berechtigungen konnten nicht geprüft werden')
    expect(screen.queryByText('Keine aktiven Mieter gefunden.')).not.toBeInTheDocument()
  })

  it('zeigt mit Berechtigung ohne Mieter weiter "Keine aktiven Mieter gefunden."', () => {
    mockHook({})

    render(<TenantPaymentBento />)

    expect(screen.getByText('Keine aktiven Mieter gefunden.')).toBeInTheDocument()
  })
})
