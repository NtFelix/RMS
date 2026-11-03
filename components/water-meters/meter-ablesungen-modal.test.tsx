import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MeterAblesungenModal } from '@/components/water-meters/meter-ablesungen-modal'
import { getMeterForHausAction } from '@/app/meter-actions'
import { TENANT_CHECK_FAILED_MESSAGE } from '@/lib/tenant-access'

/**
 * Zähler-Modal: Ohne mieter:ansehen steht an der Stelle des Mieters "Kein Zugriff" (nicht der Name, nicht leer); bei
 * fehlgeschlagener Prüfung zusätzlich der Hinweis mit "Erneut laden". Alle Daten sind synthetisch.
 */

jest.mock('@/app/meter-actions', () => ({ getMeterForHausAction: jest.fn() }))
jest.mock('@/hooks/use-modal-store', () => ({ useModalStore: () => ({ openAblesungenModal: jest.fn() }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/components/water-meters/meter-import-modal', () => ({ MeterImportModal: () => null }))

const mockAction = getMeterForHausAction as jest.Mock

const baseData = {
  wohnungen: [{ id: 'w1', name: 'Wohnung 1A', groesse: 60 }],
  meters: [{ id: 'm1', custom_id: 'Z-001', wohnung_id: 'w1', eichungsdatum: '2099-01-01', zaehler_typ: 'kaltwasser', einheit: 'm³' }],
  readings: [],
}

const renderModal = () =>
  render(
    <MeterAblesungenModal
      isOpen
      onClose={jest.fn()}
      hausId="h1"
      hausName="Musterhaus"
      startdatum="2024-01-01"
      enddatum="2024-12-31"
      nebenkostenId="n1"
    />
  )

describe('MeterAblesungenModal Mieteranzeige', () => {
  beforeEach(() => jest.clearAllMocks())

  it('zeigt mit Zugriff den Mieternamen und nie "Kein Zugriff"', async () => {
    mockAction.mockResolvedValue({
      success: true,
      data: { ...baseData, mieter: [{ id: 't1', name: 'Test Mieter', wohnung_id: 'w1' }] },
    })
    renderModal()

    expect(await screen.findByText('Test Mieter')).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
    expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
  })

  it('zeigt ohne mieter:ansehen "Kein Zugriff" statt des Mieters, ohne Fehlerhinweis', async () => {
    mockAction.mockResolvedValue({ success: true, data: { ...baseData, mieter: [], tenantAccess: false } })
    renderModal()

    expect(await screen.findByText('Kein Zugriff')).toBeInTheDocument()
    expect(screen.getByText('Z-001')).toBeInTheDocument()
    expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Wohnung, Zähler-ID oder Typ suchen...')).toBeInTheDocument()
  })

  it('zeigt bei fehlgeschlagener Prüfung den Hinweis; "Erneut laden" lädt neu', async () => {
    mockAction.mockResolvedValue({
      success: true,
      data: { ...baseData, mieter: [], tenantAccess: false, permissionCheckFailed: true },
    })
    renderModal()

    expect(await screen.findByText(TENANT_CHECK_FAILED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Kein Zugriff')).toBeInTheDocument()

    mockAction.mockResolvedValue({
      success: true,
      data: { ...baseData, mieter: [{ id: 't1', name: 'Test Mieter', wohnung_id: 'w1' }] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Erneut laden/ }))

    await waitFor(() => expect(screen.getByText('Test Mieter')).toBeInTheDocument())
    expect(mockAction).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
  })
})
