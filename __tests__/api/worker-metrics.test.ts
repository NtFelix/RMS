/**
 * @jest-environment node
 */

const count = jest.fn()
const histogram = jest.fn()

jest.mock('@/lib/posthog-metrics', () => ({
  count: (...a: unknown[]) => count(...a),
  histogram: (...a: unknown[]) => histogram(...a),
}))
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

  it('records the round trip, worker generation time and page count from the response headers', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      workerResponse(200, { 'X-PDF-Generation-Time': '120', 'X-PDF-Page-Count': '3' }),
    )
    await POST(request({ type: 'pdf', template: 'house-overview' }))

    const labels = { type: 'pdf', template: 'house-overview' }
    const attrs = { ...labels, status: 'ok' }
    expect(count).toHaveBeenCalledWith('worker.requests', 1, attrs)
    expect(histogram).toHaveBeenCalledWith('worker.request.duration', expect.any(Number), attrs, 'ms')
    expect(histogram).toHaveBeenCalledWith('worker.generation.duration', 120, labels, 'ms')
    expect(histogram).toHaveBeenCalledWith('worker.pdf.pages', 3, labels, 'pages')
  })

  it('skips page count for non-PDF responses and missing headers', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(200, { 'X-PDF-Page-Count': '0' }))
    await POST(request({ type: 'csv' }))
    expect(histogram).toHaveBeenCalledTimes(1) // only worker.request.duration
  })

  it('never uses unknown request values as metric labels', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(200))
    await POST(request({ type: 'user-supplied-value' }))
    expect(count).toHaveBeenCalledWith('worker.requests', 1, { type: 'other', template: 'none', status: 'ok' })
  })

  it('counts retries and times only the final attempt', async () => {
    jest.useFakeTimers()
    try {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValue(workerResponse(200))
      const pending = POST(request({ type: 'pdf' }))
      await jest.advanceTimersByTimeAsync(1000 + 2000)
      await pending

      expect(count).toHaveBeenCalledWith('worker.retries', 2, { type: 'pdf', template: 'none' })
      const durationCall = histogram.mock.calls.find(([name]) => name === 'worker.request.duration')
      expect(durationCall?.[1]).toBeLessThan(1000) // backoff sleeps (1s + 2s) are not part of it
    } finally {
      jest.useRealTimers()
    }
  })

  it('does not break the proxy response when recording metrics throws', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(400))
    count.mockImplementation(() => {
      throw new Error('metrics down')
    })
    const response = await POST(request({ type: 'pdf' }))
    expect(response.status).toBe(400) // the worker's own status, not a masked 500 'Proxy failed'
    count.mockReset()
  })

  it('records an error status for failed worker responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(workerResponse(500))
    await POST(request({ type: 'pdf' }))
    expect(count).toHaveBeenCalledWith('worker.requests', 1, { type: 'pdf', template: 'none', status: 'error' })
  })
})
