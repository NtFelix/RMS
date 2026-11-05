/**
 * Wasserzähler-Modal im Store: Der Mieter-Zustand (visible / hidden / check-failed) kommt vom Aufrufer, gilt ohne Angabe
 * als visible und wird beim Schließen zurückgesetzt, damit nichts von einem früheren Haus stehen bleibt.
 */
const { useModalStore } = jest.requireActual('@/hooks/use-modal-store') as typeof import('@/hooks/use-modal-store')

const nebenkosten = { id: 'nk1' } as any
const state = () => useModalStore.getState()

describe('Wasserzähler-Modal: tenantView im Store', () => {
  beforeEach(() => state().closeWasserzaehlerModal({ force: true }))

  it('ist ohne Angabe visible', () => {
    state().openWasserzaehlerModalOptimized(nebenkosten, [])
    expect(state().wasserzaehlerTenantView).toBe('visible')
  })

  it.each(['hidden', 'check-failed'] as const)('übernimmt %s vom Aufrufer (optimiert und Legacy)', (view) => {
    state().openWasserzaehlerModalOptimized(nebenkosten, [], undefined, view)
    expect(state().wasserzaehlerTenantView).toBe(view)

    state().closeWasserzaehlerModal({ force: true })
    state().openWasserzaehlerModal(nebenkosten, [], null, undefined, view)
    expect(state().wasserzaehlerTenantView).toBe(view)
  })

  it('setzt den Zustand beim Schließen zurück', () => {
    state().openWasserzaehlerModalOptimized(nebenkosten, [], undefined, 'check-failed')
    state().closeWasserzaehlerModal({ force: true })
    expect(state().wasserzaehlerTenantView).toBe('visible')
  })

  it('setWasserzaehlerOptimizedData ersetzt Daten und Zustand gemeinsam', () => {
    state().openWasserzaehlerModalOptimized(nebenkosten, [], undefined, 'check-failed')
    state().setWasserzaehlerOptimizedData([], 'hidden')
    expect(state().wasserzaehlerTenantView).toBe('hidden')
    expect(state().wasserzaehlerOptimizedData).toEqual([])
  })
})
