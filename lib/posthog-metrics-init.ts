/**
 * PostHog Metrics - SDK setup
 *
 * Registers a global MeterProvider that exports metrics to PostHog's OTLP
 * /i/v1/metrics endpoint every 10 seconds (the interval the PostHog SDKs use).
 * Only instrumentation.js should import this; everything else records metrics
 * through lib/posthog-metrics.ts.
 *
 * @see https://posthog.com/docs/metrics
 */

import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { SERVICE_NAME, POSTHOG_API_KEY, getMetricsEndpoint } from './otlp-utils';

const EXPORT_INTERVAL_MS = 10_000;
const EXPORT_TIMEOUT_MS = 5_000;

let meterProvider: MeterProvider | null = null;

export function initMetrics(): void {
    if (meterProvider) return;

    if (!POSTHOG_API_KEY) {
        console.warn('[PostHog Metrics] ⚠️ POSTHOG_API_KEY not set — metrics disabled');
        return;
    }

    const endpoint = getMetricsEndpoint();

    meterProvider = new MeterProvider({
        resource: resourceFromAttributes({
            'service.name': SERVICE_NAME,
            'deployment.environment': process.env.NODE_ENV || 'development',
            'service.version': process.env.npm_package_version || '1.0.0',
        }),
        readers: [
            new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter({
                    url: endpoint,
                    headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
                }),
                exportIntervalMillis: EXPORT_INTERVAL_MS,
                exportTimeoutMillis: EXPORT_TIMEOUT_MS,
            }),
        ],
    });

    metrics.setGlobalMeterProvider(meterProvider);

    console.log('[PostHog Metrics] ✅ Initialized — exporting metrics to', endpoint);

    const handleShutdown = () => {
        shutdownMetrics().catch(() => {});
    };
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
}

/** Force-export pending metrics (short-lived scripts, before process exit). */
export async function flushMetrics(): Promise<void> {
    await meterProvider?.forceFlush();
}

async function shutdownMetrics(): Promise<void> {
    if (!meterProvider) return;
    const provider = meterProvider;
    meterProvider = null;
    await provider.shutdown();
}
