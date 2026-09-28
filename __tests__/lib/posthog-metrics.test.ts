/**
 * @jest-environment node
 */

const add = jest.fn()
const record = jest.fn()
const createCounter = jest.fn(() => ({ add }))
const createGauge = jest.fn(() => ({ record }))
const createHistogram = jest.fn(() => ({ record }))

jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({ createCounter, createGauge, createHistogram }),
    setGlobalMeterProvider: jest.fn(),
  },
}))

jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({ OTLPMetricExporter: jest.fn() }))
jest.mock('@opentelemetry/resources', () => ({ resourceFromAttributes: jest.fn() }))
jest.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: jest.fn(),
  PeriodicExportingMetricReader: jest.fn(),
}))

jest.mock('@/lib/otlp-utils', () => ({
  SERVICE_NAME: 'mietevo',
  POSTHOG_API_KEY: undefined,
  POSTHOG_HOST: 'https://eu.i.posthog.com/',
}))

import {
  count,
  gauge,
  histogram,
  timed,
  timedAction,
  recordWorkerCall,
  getMetricsEndpoint,
  initMetrics,
  flushMetrics,
} from '@/lib/posthog-metrics'

describe('posthog-metrics', () => {
  beforeEach(() => jest.clearAllMocks())

  it('builds the OTLP metrics endpoint without a double slash', () => {
    expect(getMetricsEndpoint()).toBe('https://eu.i.posthog.com/i/v1/metrics')
  })

  it('creates the counter once and reuses it', () => {
    count('checkout.completed')
    count('checkout.completed', 2, { plan: 'pro' })
    expect(createCounter).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenNthCalledWith(1, 1, undefined)
    expect(add).toHaveBeenNthCalledWith(2, 2, { plan: 'pro' })
  })

  it('records gauges and histograms with their unit', () => {
    gauge('cart.items', 3)
    histogram('api.request.duration', 187, { route: '/x' }, { unit: 'ms' })
    expect(createGauge).toHaveBeenCalledWith('cart.items', undefined)
    expect(createHistogram).toHaveBeenCalledWith('api.request.duration', { unit: 'ms' })
    expect(record).toHaveBeenCalledWith(3, undefined)
    expect(record).toHaveBeenCalledWith(187, { route: '/x' })
  })

  it('timed records duration with ok status and returns the result', async () => {
    await expect(timed('op.duration', async () => 42, { op: 'a' })).resolves.toBe(42)
    expect(record).toHaveBeenCalledWith(expect.any(Number), { op: 'a', status: 'ok' })
  })

  it('timed records error status and rethrows', async () => {
    await expect(timed('op.fail', async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(record).toHaveBeenCalledWith(expect.any(Number), { status: 'error' })
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

  it('recordWorkerCall records request, generation time and page count', () => {
    recordWorkerCall({ type: 'pdf', template: 'none', status: 'ok' }, 900, 120, 3)
    expect(add).toHaveBeenCalledWith(1, { type: 'pdf', template: 'none', status: 'ok' })
    expect(record).toHaveBeenCalledWith(900, { type: 'pdf', template: 'none', status: 'ok' })
    expect(record).toHaveBeenCalledWith(120, { type: 'pdf', template: 'none' })
    expect(record).toHaveBeenCalledWith(3, { type: 'pdf', template: 'none' })
  })

  it('recordWorkerCall skips missing generation time and zero page counts', () => {
    recordWorkerCall({ type: 'csv', template: 'none', status: 'ok' }, 50, undefined, 0)
    expect(record).toHaveBeenCalledTimes(1)
  })

  it('init is a no-op without a project token and flush does not throw', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    initMetrics()
    expect(warn).toHaveBeenCalled()
    await expect(flushMetrics()).resolves.toBeUndefined()
    warn.mockRestore()
  })
})
