/**
 * @jest-environment node
 */

import { syncSupportIdentity } from '@/lib/posthog-support'

const setIdentity = jest.fn()
const posthog = { setIdentity } as unknown as Parameters<typeof syncSupportIdentity>[0]

describe('syncSupportIdentity', () => {
  const originalFetch = global.fetch

  beforeEach(() => jest.clearAllMocks())
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sets the identity from a successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ distinctId: 'user-ok', hash: 'abc' }), { status: 200 }),
    )

    const identity = await syncSupportIdentity(posthog, 'user-ok')

    expect(identity).toEqual({ distinctId: 'user-ok', hash: 'abc' })
    expect(setIdentity).toHaveBeenCalledWith('user-ok', 'abc')
  })

  it('cancels the response body on an error status so the request does not stay open', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, body: { cancel } })

    const identity = await syncSupportIdentity(posthog, 'user-503')

    expect(identity).toBeNull()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(setIdentity).not.toHaveBeenCalled()
  })

  it('does not cache a failed lookup, so the next call retries', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, body: null })
      .mockResolvedValueOnce(new Response(JSON.stringify({ distinctId: 'user-retry', hash: 'def' }), { status: 200 }))

    expect(await syncSupportIdentity(posthog, 'user-retry')).toBeNull()
    expect(await syncSupportIdentity(posthog, 'user-retry')).toEqual({ distinctId: 'user-retry', hash: 'def' })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
