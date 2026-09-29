/**
 * @jest-environment node
 */

jest.mock('@opentelemetry/api', () => ({ metrics: { setGlobalMeterProvider: jest.fn() } }))
jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({ OTLPMetricExporter: jest.fn() }))
jest.mock('@opentelemetry/resources', () => ({ resourceFromAttributes: jest.fn() }))
jest.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: jest.fn(),
  PeriodicExportingMetricReader: jest.fn(),
}))
jest.mock('@/lib/otlp-utils', () => ({
  SERVICE_NAME: 'mietevo',
  POSTHOG_API_KEY: undefined,
  getMetricsEndpoint: () => 'https://eu.i.posthog.com/i/v1/metrics',
}))

import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { initMetrics, flushMetrics } from '@/lib/posthog-metrics-init'

describe('posthog-metrics-init', () => {
  it('does nothing without a project token, and flush does not throw', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    initMetrics()
    expect(warn).toHaveBeenCalled()
    expect(MeterProvider).not.toHaveBeenCalled()
    await expect(flushMetrics()).resolves.toBeUndefined()
    warn.mockRestore()
  })
})
