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

const modal = (hausId: string) => (
    <MeterAblesungenModal
      isOpen
      onClose={jest.fn()}
      hausId={hausId}
      hausName="Musterhaus"
      startdatum="2024-01-01"
      enddatum="2024-12-31"
      nebenkostenId="n1"
    />
  )

const renderModal = () => render(modal('h1'))

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
    // no verdict per meter: "Kein Zugriff" would claim a denial that was never decided
    expect(screen.getByText('Z-001')).toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Wohnung, Zähler-ID oder Typ suchen...')).toBeInTheDocument()

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

  describe('Zustand beim Hauswechsel und bei Ladefehlern', () => {
    let consoleError: jest.SpyInstance
    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation()
    })
    afterEach(() => consoleError.mockRestore())

    const failedCheckData = { ...baseData, mieter: [], tenantAccess: false, permissionCheckFailed: true }
    const otherHouseData = {
      wohnungen: [{ id: 'w2', name: 'Wohnung 2B', groesse: 50 }],
      meters: [{ id: 'm2', custom_id: 'Z-002', wohnung_id: 'w2', eichungsdatum: '2099-01-01', zaehler_typ: 'kaltwasser', einheit: 'm³' }],
      readings: [],
      mieter: [{ id: 't2', name: 'Anderer Mieter', wohnung_id: 'w2' }],
    }

    it('Hauswechsel: Zähler, Mietername und Tenant-Zustand des alten Hauses verschwinden sofort, bis das neue Haus geladen ist', async () => {
      mockAction.mockResolvedValueOnce({ success: true, data: failedCheckData })
      const { rerender } = renderModal()
      expect(await screen.findByText(TENANT_CHECK_FAILED_MESSAGE)).toBeInTheDocument()

      let resolveNext: (value: unknown) => void = () => {}
      mockAction.mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve }))
      rerender(modal('h2'))

      await waitFor(() => expect(screen.queryByText('Z-001')).not.toBeInTheDocument())
      expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()

      resolveNext({ success: true, data: otherHouseData })
      expect(await screen.findByText('Anderer Mieter')).toBeInTheDocument()
      expect(screen.queryByText('Z-001')).not.toBeInTheDocument()
    })

    it('Hauswechsel: eine späte Antwort des alten Hauses überschreibt das neue Haus nicht', async () => {
      let resolveOld: (value: unknown) => void = () => {}
      mockAction.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      const { rerender } = renderModal()

      mockAction.mockResolvedValueOnce({ success: true, data: otherHouseData })
      rerender(modal('h2'))
      expect(await screen.findByText('Anderer Mieter')).toBeInTheDocument()

      resolveOld({ success: true, data: failedCheckData })
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(screen.getByText('Anderer Mieter')).toBeInTheDocument()
      expect(screen.queryByText('Z-001')).not.toBeInTheDocument()
      expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    })

    it('Hauswechsel: die späte Antwort des alten Hauses beendet die Ladeanzeige des neuen Hauses nicht', async () => {
      let resolveOld: (value: unknown) => void = () => {}
      mockAction.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      const { rerender } = renderModal()
      mockAction.mockReturnValueOnce(new Promise(() => {})) // the new house stays loading
      rerender(modal('h2'))
      await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2))

      resolveOld({ success: true, data: failedCheckData })
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(screen.getByText('Lade Zählerdaten...')).toBeInTheDocument()
    })

    it('Hauswechsel mit Ladefehler: nichts vom alten Haus bleibt stehen', async () => {
      mockAction.mockResolvedValueOnce({ success: true, data: failedCheckData })
      const { rerender } = renderModal()
      expect(await screen.findByText(TENANT_CHECK_FAILED_MESSAGE)).toBeInTheDocument()

      mockAction.mockResolvedValueOnce({ success: false, message: 'Fehler' })
      rerender(modal('h2'))

      await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.queryByText('Z-001')).not.toBeInTheDocument())
      expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    })

    it('"Erneut laden" schlägt fehl: Liste und Hinweis werden zurückgesetzt (kein halber Altzustand)', async () => {
      mockAction.mockResolvedValueOnce({ success: true, data: failedCheckData })
      renderModal()
      const reload = await screen.findByRole('button', { name: /Erneut laden/ })

      mockAction.mockResolvedValueOnce({ success: false, message: 'Fehler' })
      fireEvent.click(reload)
      await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2))

      await waitFor(() => expect(screen.queryByText('Z-001')).not.toBeInTheDocument())
      expect(screen.queryByText(TENANT_CHECK_FAILED_MESSAGE)).not.toBeInTheDocument()
    })
  })
})
