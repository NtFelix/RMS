import { render, screen, waitFor } from '@testing-library/react'
import { MeterVerwaltungModal } from '@/components/water-meters/meter-verwaltung-modal'
import { toast } from '@/hooks/use-toast'

jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }))
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({ openWasserZaehlerModal: jest.fn() }),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function renderModal() {
  return render(
    <MeterVerwaltungModal isOpen onClose={jest.fn()} hausId="haus-1" hausName="Testhaus" />
  )
}

describe('MeterVerwaltungModal - Wohnungen laden', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('zeigt bei 200 die Wohnungen des Hauses', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, [
        { id: 'w1', name: 'Wohnung A', groesse: 50, miete: 500, haus_id: 'haus-1' },
        { id: 'w2', name: 'Wohnung B', groesse: 60, miete: 600, haus_id: 'haus-2' },
      ])
    )
    renderModal()

    expect(await screen.findByText('Wohnung A')).toBeInTheDocument()
    expect(screen.queryByText('Wohnung B')).not.toBeInTheDocument()
    expect(screen.queryByText('Kein Zugriff auf Wohnungen')).not.toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
  })

  it('zeigt bei 403 mit PERMISSION_DENIED den Hinweis ohne Fehler-Toast', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(403, { error: 'Forbidden', code: 'PERMISSION_DENIED' })
    )
    renderModal()

    expect(await screen.findByText('Kein Zugriff auf Wohnungen')).toBeInTheDocument()
    expect(screen.getByText(/Wohnungen ansehen/)).toBeInTheDocument()
    expect(screen.queryByText('Zähler verwalten', { selector: 'button' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Keine Wohnungen in diesem Haus/)).not.toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
  })

  it.each([
    ['500', jsonResponse(500, { error: 'Internal' })],
    ['403 ohne Code', jsonResponse(403, { error: 'Forbidden' })],
    ['403 mit anderem Code', jsonResponse(403, { code: 'SOMETHING_ELSE' })],
  ])('zeigt bei %s einen Fehler-Toast und nicht den Kein-Zugriff-Hinweis', async (_label, res) => {
    mockFetch.mockResolvedValue(res)
    renderModal()

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Wohnungen konnten nicht geladen werden.' })
      )
    )
    expect(screen.queryByText('Kein Zugriff auf Wohnungen')).not.toBeInTheDocument()
  })

  it('zeigt bei Netzwerkfehler einen Fehler-Toast', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    renderModal()

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })))
    expect(screen.queryByText('Kein Zugriff auf Wohnungen')).not.toBeInTheDocument()
  })

  it('403 ohne lesbaren Body ist ein Fehler', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => {
        throw new Error('no json')
      },
    })
    renderModal()

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })))
    expect(screen.queryByText('Kein Zugriff auf Wohnungen')).not.toBeInTheDocument()
  })
})
