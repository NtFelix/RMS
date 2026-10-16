/**
 * @jest-environment node
 */

let mockApiKey: string | undefined
const mockSetGlobalMeterProvider = jest.fn()
const mockRegisterShutdownHandler = jest.fn()
const mockShutdown = jest.fn().mockResolvedValue(undefined)

jest.mock('@opentelemetry/api', () => ({
  metrics: { setGlobalMeterProvider: (...a: unknown[]) => mockSetGlobalMeterProvider(...a) },
}))
jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({ OTLPMetricExporter: jest.fn() }))
jest.mock('@opentelemetry/resources', () => ({ resourceFromAttributes: jest.fn() }))
jest.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: jest.fn(() => ({ shutdown: mockShutdown, forceFlush: jest.fn() })),
  PeriodicExportingMetricReader: jest.fn(),
}))
jest.mock('@/lib/otlp-utils', () => ({
  get POSTHOG_API_KEY() {
    return mockApiKey
  },
  getMetricsEndpoint: () => 'https://eu.i.posthog.com/i/v1/metrics',
  getSdkResourceAttributes: () => ({}),
  registerShutdownHandler: (...a: unknown[]) => mockRegisterShutdownHandler(...a),
}))

import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { initMetrics } from '@/lib/posthog-metrics-init'

describe('posthog-metrics-init', () => {
  let warn: jest.SpyInstance
  let log: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    log = jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('does nothing without a project token', () => {
    mockApiKey = undefined
    initMetrics()
    expect(warn).toHaveBeenCalled()
    expect(MeterProvider).not.toHaveBeenCalled()
  })

  it('does not claim to be initialized when another global MeterProvider already exists', () => {
    mockApiKey = 'phc_test'
    mockSetGlobalMeterProvider.mockReturnValue(false)

    initMetrics()

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already registered'))
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Initialized'), expect.anything())
    expect(mockRegisterShutdownHandler).not.toHaveBeenCalled()
    expect(mockShutdown).toHaveBeenCalled()
  })

  it('registers the provider and a shutdown handler on success', () => {
    mockApiKey = 'phc_test'
    mockSetGlobalMeterProvider.mockReturnValue(true)

    initMetrics()

    expect(log).toHaveBeenCalledWith(expect.stringContaining('Initialized'), expect.anything())
    expect(mockRegisterShutdownHandler).toHaveBeenCalledTimes(1)
  })
})
