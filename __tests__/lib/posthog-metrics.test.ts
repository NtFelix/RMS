/**
 * @jest-environment node
 */

const add = jest.fn()
const record = jest.fn()
const createCounter = jest.fn(() => ({ add }))
const createHistogram = jest.fn(() => ({ record }))

jest.mock('@opentelemetry/api', () => ({
  metrics: { getMeter: () => ({ createCounter, createHistogram }) },
}))

import { count, histogram, timedAction, withTiming } from '@/lib/posthog-metrics'

describe('posthog-metrics', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates the counter once and reuses it', () => {
    count('checkout.completed')
    count('checkout.completed', 2, { plan: 'pro' })
    expect(createCounter).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenNthCalledWith(1, 1, undefined)
    expect(add).toHaveBeenNthCalledWith(2, 2, { plan: 'pro' })
  })

  it('records histograms with their unit', () => {
    histogram('api.request.duration', 187, { route: '/x' }, 'ms')
    expect(createHistogram).toHaveBeenCalledWith('api.request.duration', { unit: 'ms' })
    expect(record).toHaveBeenCalledWith(187, { route: '/x' })
  })

  it('timedAction records success for successful results', async () => {
    await timedAction('someAction', async () => ({ success: true }))
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'success' })
  })

  it('timedAction records failed for success:false results and returns them', async () => {
    const result = { success: false, message: 'nope' }
    await expect(timedAction('someAction', async () => result)).resolves.toBe(result)
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'failed' })
  })

  it('timedAction records error and rethrows', async () => {
    await expect(timedAction('someAction', async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'someAction', status: 'error' })
  })

  it('withTiming passes arguments through and times the call', async () => {
    const wrapped = withTiming('sum', async (a: number, b: number) => ({ success: true, total: a + b }))
    await expect(wrapped(1, 2)).resolves.toEqual({ success: true, total: 3 })
    expect(record).toHaveBeenCalledWith(expect.any(Number), { action: 'sum', status: 'success' })
  })
})
