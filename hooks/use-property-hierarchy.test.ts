import { renderHook, waitFor } from '@testing-library/react'
import { usePropertyHierarchy } from './use-property-hierarchy'

/**
 * Hierarchy of the file tree: apartments need wohnungen:ansehen, tenants mieter:ansehen (the routes answer 403
 * without the right). Without the right they are left out, any other failure stays an error. Synthetic data.
 */

const HOUSES = [{ id: 'h1', name: 'Haus Eins', strasse: 'Teststrasse 1', ort: 'Testort' }]
const APARTMENTS = [{ id: 'a1', name: 'Wohnung 1', groesse: 50, miete: 500, haus_id: 'h1' }]
const TENANTS = [{ id: 't1', name: 'Mieter Eins', wohnung_id: 'a1', einzug: '2024-01-01' }]

type Answer = { status: number; body?: unknown }

function mockFetch(answers: Record<string, Answer>) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const answer = answers[String(url)] ?? { status: 404 }
    return {
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      json: async () => answer.body,
    } as Response
  }) as jest.Mock
}

describe('usePropertyHierarchy', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads houses, apartments and tenants for a user with both rights', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 200, body: APARTMENTS },
      '/api/mieter': { status: 200, body: TENANTS },
    })

    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.houses).toEqual(HOUSES)
    expect(result.current.apartments).toEqual(APARTMENTS)
    expect(result.current.tenants).toEqual(TENANTS)
  })

  it('leaves apartments out without wohnungen:ansehen (403), the houses stay', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 403, body: { error: 'Verboten' } },
      '/api/mieter': { status: 200, body: TENANTS },
    })

    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.houses).toEqual(HOUSES)
    expect(result.current.apartments).toEqual([])
  })

  it('leaves tenants out without mieter:ansehen (403), the apartments stay', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 200, body: APARTMENTS },
      '/api/mieter': { status: 403, body: { error: 'Verboten' } },
    })

    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.apartments).toEqual(APARTMENTS)
    expect(result.current.tenants).toEqual([])
  })

  it('still reports a technical failure as an error', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 500, body: { error: 'boom' } },
      '/api/mieter': { status: 200, body: TENANTS },
    })

    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch apartments')
  })
})
