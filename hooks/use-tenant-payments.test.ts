import { act, renderHook } from '@testing-library/react'
import { useTenantPayments } from './use-tenant-payments'

/**
 * /api/tenants-data needs mieter:ansehen and finanzen:ansehen: 403 PERMISSION_DENIED is "no access" (no error), a
 * failed permission check (503) and every other failure stay an error. Synthetic data.
 */

jest.mock('@/utils/supabase/client', () => ({ createClient: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }))

const TENANTS = [
  {
    id: 't1',
    name: 'Erika Beispiel',
    einzug: '2024-01-01',
    auszug: null,
    nebenkosten: [],
    Wohnungen: { id: 'a1', name: 'Wohnung 1', miete: 500 },
  },
]

type Answer = { status: number; body?: unknown }

function mockFetch(answer: Answer) {
  global.fetch = jest.fn(async () => ({
    ok: answer.status >= 200 && answer.status < 300,
    status: answer.status,
    json: async () => answer.body,
  })) as unknown as typeof fetch
}

async function load() {
  const hook = renderHook(() => useTenantPayments())
  await act(async () => {
    await hook.result.current.fetchData()
  })
  return hook
}

describe('useTenantPayments: Zugriff auf /api/tenants-data', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('laedt mit beiden Rechten die Mieter wie bisher', async () => {
    mockFetch({ status: 200, body: { tenants: TENANTS } })

    const { result } = await load()

    expect(result.current.noAccess).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([expect.objectContaining({ id: 't1', tenant: 'Erika Beispiel', mieteRaw: 500 })])
  })

  it('behandelt 403 PERMISSION_DENIED als "kein Zugriff", nicht als Fehler', async () => {
    mockFetch({ status: 403, body: { error: 'Permission denied', code: 'PERMISSION_DENIED' } })

    const { result } = await load()

    expect(result.current.noAccess).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('behandelt 503 PERMISSION_CHECK_FAILED als Fehler, nicht als "kein Zugriff"', async () => {
    mockFetch({ status: 503, body: { error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' } })

    const { result } = await load()

    expect(result.current.noAccess).toBe(false)
    expect(result.current.error).toMatch(/Berechtigungen konnten nicht geprüft werden/)
    expect(result.current.data).toEqual([])
  })

  it('behandelt ein 403 ohne Code (z. B. von einem Proxy) als Fehler', async () => {
    mockFetch({ status: 403, body: { error: 'Forbidden' } })

    const { result } = await load()

    expect(result.current.noAccess).toBe(false)
    expect(result.current.error).toBe('Failed to fetch tenant data')
  })

  it('behandelt 500 als Fehler', async () => {
    mockFetch({ status: 500, body: { error: 'Internal server error' } })

    const { result } = await load()

    expect(result.current.noAccess).toBe(false)
    expect(result.current.error).toBe('Failed to fetch tenant data')
  })

  it('setzt "kein Zugriff" bei einem erneuten erfolgreichen Laden zurueck', async () => {
    mockFetch({ status: 403, body: { error: 'Permission denied', code: 'PERMISSION_DENIED' } })
    const { result } = await load()
    expect(result.current.noAccess).toBe(true)

    mockFetch({ status: 200, body: { tenants: TENANTS } })
    await act(async () => {
      await result.current.fetchData()
    })

    expect(result.current.noAccess).toBe(false)
    expect(result.current.data).toHaveLength(1)
  })
})
