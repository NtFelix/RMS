/**
 * @jest-environment node
 */

const add = jest.fn()
const record = jest.fn()
const createCounter = jest.fn(() => ({ add }))
const createHistogram = jest.fn(() => ({ record }))

let mockProvider = { getMeter: () => ({ createCounter, createHistogram }) }

jest.mock('@opentelemetry/api', () => ({
  metrics: { getMeterProvider: () => mockProvider },
}))

import { count, histogram, isTimed, withTiming } from '@/lib/posthog-metrics'

describe('posthog-metrics', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates the counter once and reuses it', () => {
    count('checkout.completed')
    count('checkout.completed', 2, { plan: 'pro' })
    expect(createCounter).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenNthCalledWith(1, 1, undefined)
    expect(add).toHaveBeenNthCalledWith(2, 2, { plan: 'pro' })
  })

  it('recreates instruments when the global provider changes (no-op instruments are not pinned)', () => {
    count('late.init')
    expect(createCounter).toHaveBeenCalledTimes(1)

    mockProvider = { getMeter: () => ({ createCounter, createHistogram }) } // e.g. initMetrics() registered the real provider
    count('late.init')
    expect(createCounter).toHaveBeenCalledTimes(2)
  })

  it('records histograms with their unit', () => {
    histogram('api.request.duration', 187, { route: '/x' }, 'ms')
    expect(createHistogram).toHaveBeenCalledWith('api.request.duration', { unit: 'ms' })
    expect(record).toHaveBeenCalledWith(187, { route: '/x' })
  })

  it('withTiming records success for successful results', async () => {
    await withTiming('someAction', async () => ({ success: true }))()
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'success' })
  })

  it('withTiming records failed for success:false results and returns them', async () => {
    const result = { success: false, message: 'nope' }
    await expect(withTiming('someAction', async () => result)()).resolves.toBe(result)
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'failed' })
  })

  it('withTiming records error and rethrows', async () => {
    await expect(withTiming('someAction', async () => { throw new Error('boom') })()).rejects.toThrow('boom')
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'error' })
  })

  it('withTiming passes arguments through and times the call', async () => {
    const wrapped = withTiming('sum', async (a: number, b: number) => ({ success: true, total: a + b }))
    await expect(wrapped(1, 2)).resolves.toEqual({ success: true, total: 3 })
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'sum', status: 'success' })
  })

  it('withTiming does not wrap an already-timed function a second time', async () => {
    const once = withTiming('sum', async () => ({ success: true }))
    expect(isTimed(once)).toBe(true)
    expect(withTiming('sum', once)).toBe(once)
  })

  it('keeps one histogram instrument per name and unit', () => {
    histogram('x', 1, undefined, 'ms')
    histogram('x', 2, undefined, 's')
    histogram('x', 3, undefined, 'ms')
    expect(createHistogram).toHaveBeenCalledTimes(2)
  })
})
