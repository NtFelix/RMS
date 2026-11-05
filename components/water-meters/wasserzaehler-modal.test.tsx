import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WasserzaehlerModal } from '@/components/water-meters/wasserzaehler-modal'
import { getMeterModalDataAction } from '@/app/betriebskosten-actions'
import { TENANT_CHECK_FAILED_MESSAGE } from '@/lib/tenant-access'

/**
 * Betriebskosten-Wasserzähler-Modal: Mit mieter:ansehen steht der Mieter da, ohne "Kein Zugriff" (nie der Name), bei
 * fehlgeschlagener Prüfung der Hinweis mit "Erneut laden" und kein "Kein Zugriff". Alle Daten sind synthetisch.
 */

jest.mock('@/app/betriebskosten-actions', () => ({ getMeterModalDataAction: jest.fn() }))
// Stable references: the modal's effect depends on `toast`, a new function per render would loop
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))

const mockStore: Record<string, any> = {}
jest.mock('@/hooks/use-modal-store', () => ({ useModalStore: () => mockStore }))

const mockAction = getMeterModalDataAction as jest.Mock
const setOptimizedData = jest.fn()

const row = {
  mieter_id: 't1',
  mieter_name: 'Test Mieter',
  wohnung_name: 'Wohnung 1A',
  wohnung_groesse: 60,
  meter_id: 'm1',
  meter_type: 'kaltwasser',
  custom_id: 'Z-001',
  current_reading: null,
  previous_reading: null,
}

const setStore = (optimizedData: unknown[], tenantView?: 'visible' | 'hidden' | 'check-failed') => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key])
  Object.assign(mockStore, {
    isWasserzaehlerModalOpen: true,
    wasserzaehlerNebenkosten: {
      id: 'nk1',
      startdatum: '2024-01-01',
      enddatum: '2024-12-31',
      Haeuser: { name: 'Musterhaus' },
    },
    wasserzaehlerMieterList: [],
    wasserzaehlerExistingReadings: undefined,
    wasserzaehlerOptimizedData: optimizedData,
    ...(tenantView ? { wasserzaehlerTenantView: tenantView } : {}),
    wasserzaehlerOnSave: jest.fn(),
    isWasserzaehlerModalDirty: false,
    closeWasserzaehlerModal: jest.fn(),
    setWasserzaehlerModalDirty: jest.fn(),
    setWasserzaehlerOptimizedData: setOptimizedData,
  })
}

describe('WasserzaehlerModal Mieteranzeige', () => {
  beforeEach(() => jest.clearAllMocks())

  it('zeigt mit Zugriff den Mieternamen und nie "Kein Zugriff"', () => {
    setStore([row], 'visible')
    render(<WasserzaehlerModal />)

    expect(screen.getByText('Test Mieter')).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
    expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mieter oder Wohnung suchen...')).toBeInTheDocument()
  })

  it('ohne gesetzten Zustand gilt visible (Aufrufer ohne Signal)', () => {
    setStore([row])
    render(<WasserzaehlerModal />)

    expect(screen.getByText('Test Mieter')).toBeInTheDocument()
  })

  it('zeigt ohne mieter:ansehen "Kein Zugriff" und keine Mieter, ohne Fehlerhinweis', () => {
    setStore([], 'hidden')
    render(<WasserzaehlerModal />)

    expect(screen.getByText('Kein Zugriff')).toBeInTheDocument()
    expect(screen.queryByText('Keine Mieter für diesen Zeitraum und dieses Haus gefunden.')).not.toBeInTheDocument()
    expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
  })

  it('zeigt ohne mieter:ansehen "Kein Zugriff" statt des Namens, auch wenn eine Zeile ankäme', () => {
    setStore([row], 'hidden')
    render(<WasserzaehlerModal />)

    expect(screen.getByText('Kein Zugriff')).toBeInTheDocument()
    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.queryByText('Test Mieter')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Wohnung suchen...')).toBeInTheDocument()
  })

  it('zeigt bei Prüfungsfehler den Hinweis, aber weder "Kein Zugriff" noch "Keine Mieter gefunden"', () => {
    setStore([], 'check-failed')
    render(<WasserzaehlerModal />)

    expect(screen.getByText(TENANT_CHECK_FAILED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Erneut laden/ })).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
    expect(screen.queryByText('Keine Mieter für diesen Zeitraum und dieses Haus gefunden.')).not.toBeInTheDocument()
  })

  it('"Erneut laden" holt die Daten neu und übernimmt Daten und Zustand in den Store', async () => {
    setStore([], 'check-failed')
    mockAction.mockResolvedValue({ success: true, data: [row] })
    render(<WasserzaehlerModal />)

    fireEvent.click(screen.getByRole('button', { name: /Erneut laden/ }))

    await waitFor(() => expect(setOptimizedData).toHaveBeenCalledWith([row], 'visible'))
    expect(mockAction).toHaveBeenCalledWith('nk1')
  })

  it('"Erneut laden" meldet bei weiterhin gesperrter Prüfung wieder check-failed, nie Namen', async () => {
    setStore([], 'check-failed')
    mockAction.mockResolvedValue({ success: true, data: [], tenantAccess: false, permissionCheckFailed: true })
    render(<WasserzaehlerModal />)

    fireEvent.click(screen.getByRole('button', { name: /Erneut laden/ }))

    await waitFor(() => expect(setOptimizedData).toHaveBeenCalledWith([], 'check-failed'))
  })

  it('"Erneut laden" ohne Recht meldet hidden', async () => {
    setStore([], 'check-failed')
    mockAction.mockResolvedValue({ success: true, data: [], tenantAccess: false })
    render(<WasserzaehlerModal />)

    fireEvent.click(screen.getByRole('button', { name: /Erneut laden/ }))

    await waitFor(() => expect(setOptimizedData).toHaveBeenCalledWith([], 'hidden'))
  })

  it('"Erneut laden" lässt bei einem Ladefehler den Store unverändert', async () => {
    setStore([], 'check-failed')
    mockAction.mockResolvedValue({ success: false, message: 'boom' })
    render(<WasserzaehlerModal />)

    fireEvent.click(screen.getByRole('button', { name: /Erneut laden/ }))

    await waitFor(() => expect(mockAction).toHaveBeenCalled())
    expect(setOptimizedData).not.toHaveBeenCalled()
    expect(screen.getByText(TENANT_CHECK_FAILED_MESSAGE)).toBeInTheDocument()
  })
})
