import { act, renderHook, waitFor } from '@testing-library/react'
import { PERMISSION_CHECK_FAILED_ERROR, usePropertyHierarchy } from './use-property-hierarchy'

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
      '/api/wohnungen': { status: 403, body: { error: 'Permission denied', code: 'PERMISSION_DENIED' } },
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
      '/api/mieter': { status: 403, body: { error: 'Permission denied', code: 'PERMISSION_DENIED' } },
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
  it('treats a 403 without the permission code (not from the permission check, e.g. a proxy) as an error, not as "no right"', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 403, body: '<html>Forbidden</html>' },
      '/api/mieter': { status: 200, body: TENANTS },
    })

    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch apartments')
  })

  it('refetch loads again: after a failure it ends with the data and without the error', async () => {
    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 500 },
      '/api/mieter': { status: 200, body: TENANTS },
    })
    const { result } = renderHook(() => usePropertyHierarchy())
    await waitFor(() => expect(result.current.error).not.toBeNull())

    mockFetch({
      '/api/haeuser': { status: 200, body: HOUSES },
      '/api/wohnungen': { status: 200, body: APARTMENTS },
      '/api/mieter': { status: 200, body: TENANTS },
    })
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.apartments).toEqual(APARTMENTS)
  })
  describe('the permission check of the server failed (503 PERMISSION_CHECK_FAILED)', () => {
    const CHECK_FAILED = { status: 503, body: { error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' } }

    it.each(['/api/wohnungen', '/api/mieter'])('%s: sets an error instead of silently leaving the list out', async (url) => {
      mockFetch({
        '/api/haeuser': { status: 200, body: HOUSES },
        '/api/wohnungen': url === '/api/wohnungen' ? CHECK_FAILED : { status: 200, body: APARTMENTS },
        '/api/mieter': url === '/api/mieter' ? CHECK_FAILED : { status: 200, body: TENANTS },
      })

      const { result } = renderHook(() => usePropertyHierarchy())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.error).toBe(PERMISSION_CHECK_FAILED_ERROR)
      expect(result.current.error).not.toBeNull()
    })

    it('a 503 without that code is an ordinary error', async () => {
      mockFetch({
        '/api/haeuser': { status: 200, body: HOUSES },
        '/api/wohnungen': { status: 503, body: '<html>Service Unavailable</html>' },
        '/api/mieter': { status: 200, body: TENANTS },
      })

      const { result } = renderHook(() => usePropertyHierarchy())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.error).toBe('Failed to fetch apartments')
    })

    it('the code on a 403 does not count as a failed check, a 503 does not count as "no right"', async () => {
      mockFetch({
        '/api/haeuser': { status: 200, body: HOUSES },
        '/api/wohnungen': { status: 403, body: { code: 'PERMISSION_CHECK_FAILED' } },
        '/api/mieter': { status: 503, body: { code: 'PERMISSION_DENIED' } },
      })

      const { result } = renderHook(() => usePropertyHierarchy())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.error).toBe('Failed to fetch apartments')
      expect(result.current.apartments).toEqual([])
    })

    it('refetch after the failure ends with the data and without the error', async () => {
      mockFetch({
        '/api/haeuser': { status: 200, body: HOUSES },
        '/api/wohnungen': CHECK_FAILED,
        '/api/mieter': { status: 200, body: TENANTS },
      })
      const { result } = renderHook(() => usePropertyHierarchy())
      await waitFor(() => expect(result.current.error).toBe(PERMISSION_CHECK_FAILED_ERROR))

      mockFetch({
        '/api/haeuser': { status: 200, body: HOUSES },
        '/api/wohnungen': { status: 200, body: APARTMENTS },
        '/api/mieter': { status: 200, body: TENANTS },
      })
      act(() => result.current.refetch())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.error).toBeNull()
      expect(result.current.apartments).toEqual(APARTMENTS)
      expect(result.current.tenants).toEqual(TENANTS)
    })
  })
})
