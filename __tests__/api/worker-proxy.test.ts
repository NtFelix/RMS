/**
 * @jest-environment node
 */

/**
 * The generic worker proxy attaches the shared worker key to every call of a signed-in user. Templates with confidential
 * figures (the deposit statement) must therefore be refused here: they belong to their own route.
 */

jest.mock('@/lib/posthog-metrics', () => ({ count: jest.fn(), histogram: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}))

import { POST } from '@/app/api/worker/route'

// jest.setup.js replaces global Request/Response with stubs, so plain objects are used here.
function request(body: unknown) {
  return { url: 'http://localhost/api/worker', json: async () => body } as unknown as Request
}

function workerResponse(status: number) {
  return { ok: status < 300, status, body: null, text: async () => 'body', headers: { get: () => null } }
}

describe('/api/worker internal-only templates', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it.each(['kaution-abrechnung', ' Kaution-Abrechnung '])('refuses the template %p without calling the worker', async (template) => {
    global.fetch = jest.fn()
    const response = await POST(request({ type: 'pdf', template, data: { kontostand: 99999 } }))
    expect(response.status).toBe(403)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still forwards the other templates', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(200))
    const response = await POST(request({ type: 'pdf', template: 'house-overview' }))
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
