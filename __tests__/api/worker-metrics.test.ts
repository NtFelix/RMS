/**
 * @jest-environment node
 */

const recordWorkerCall = jest.fn()

jest.mock('@/lib/posthog-metrics', () => ({ recordWorkerCall: (...a: unknown[]) => recordWorkerCall(...a) }))
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

function workerResponse(status: number, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: null,
    text: async () => 'body',
    headers: { get: (name: string) => headers[name] ?? null },
  }
}

describe('/api/worker metrics', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('records worker generation time and page count from the response headers', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      workerResponse(200, { 'X-PDF-Generation-Time': '120', 'X-PDF-Page-Count': '3' }),
    )
    await POST(request({ type: 'pdf', template: 'house-overview' }))
    expect(recordWorkerCall).toHaveBeenCalledWith(
      { type: 'pdf', template: 'house-overview', status: 'ok' },
      expect.any(Number),
      120,
      3,
    )
  })

  it('never uses unknown request values as metric labels', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(200))
    await POST(request({ type: 'user-supplied-value' }))
    expect(recordWorkerCall).toHaveBeenCalledWith(
      { type: 'other', template: 'none', status: 'ok' },
      expect.any(Number),
      undefined,
      undefined,
    )
  })

  it('records an error status for failed worker responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(500))
    await POST(request({ type: 'pdf' }))
    expect(recordWorkerCall).toHaveBeenCalledWith(
      { type: 'pdf', template: 'none', status: 'error' },
      expect.any(Number),
      undefined,
      undefined,
    )
  })
})
