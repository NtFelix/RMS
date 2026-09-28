/**
 * PostHog Metrics (OpenTelemetry)
 *
 * Sends application metrics (counters, gauges, histograms) to PostHog's OTLP
 * /i/v1/metrics endpoint. Mirrors the `posthog.metrics.*` API from the PostHog
 * SDKs, but runs on a server-side MeterProvider so it can be used from server
 * actions, route handlers and background jobs.
 *
 * Until `initMetrics()` has run (or when no project token is configured) all
 * helpers are safe no-ops.
 *
 * Attribute values must be low-cardinality (route, status, plan) - never user IDs.
 *
 * @see https://posthog.com/docs/metrics
 */

import { metrics, type Attributes, type Counter, type Gauge, type Histogram } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { SERVICE_NAME, POSTHOG_API_KEY, POSTHOG_HOST } from './otlp-utils';

// PostHog SDKs aggregate in memory and send every 10 seconds.
const EXPORT_INTERVAL_MS = 10_000;
const EXPORT_TIMEOUT_MS = 5_000;

export interface MetricOptions {
    /** Unit of the recorded value, e.g. `ms` or `bytes`. Only applied when the instrument is first created. */
    unit?: string;
}

export function getMetricsEndpoint(): string {
    const host = POSTHOG_HOST.replace(/\/$/, '');
    return `${host}/i/v1/metrics`;
}

let meterProvider: MeterProvider | null = null;

const counters = new Map<string, Counter>();
const gauges = new Map<string, Gauge>();
const histograms = new Map<string, Histogram>();

function getMeter() {
    return metrics.getMeter(SERVICE_NAME);
}

function getOrCreate<T>(cache: Map<string, T>, name: string, create: () => T): T {
    let instrument = cache.get(name);
    if (!instrument) {
        instrument = create();
        cache.set(name, instrument);
    }
    return instrument;
}

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

/** Increment a monotonically increasing value (requests, completions). */
export function count(name: string, value = 1, attributes?: Attributes): void {
    getOrCreate(counters, name, () => getMeter().createCounter(name)).add(value, attributes);
}

/** Record a value that goes up and down (queue depth, memory usage). */
export function gauge(name: string, value: number, attributes?: Attributes, options?: MetricOptions): void {
    getOrCreate(gauges, name, () => getMeter().createGauge(name, options)).record(value, attributes);
}

/** Record a sample of a distribution (request duration, payload size). */
export function histogram(name: string, value: number, attributes?: Attributes, options?: MetricOptions): void {
    getOrCreate(histograms, name, () => getMeter().createHistogram(name, options)).record(value, attributes);
}

/**
 * Time an async operation and record its duration (ms) as a histogram.
 * Adds a `status` attribute (`ok` | `error`) and rethrows errors unchanged.
 */
export async function timed<T>(name: string, fn: () => Promise<T>, attributes?: Attributes): Promise<T> {
    const start = performance.now();
    let status = 'ok';
    try {
        return await fn();
    } catch (error) {
        status = 'error';
        throw error;
    } finally {
        histogram(name, performance.now() - start, { ...attributes, status }, { unit: 'ms' });
    }
}

/** Force-export pending metrics (short-lived scripts, before process exit). */
export async function flushMetrics(): Promise<void> {
    await meterProvider?.forceFlush();
}

export async function shutdownMetrics(): Promise<void> {
    if (!meterProvider) return;
    const provider = meterProvider;
    meterProvider = null;
    counters.clear();
    gauges.clear();
    histograms.clear();
    await provider.shutdown();
}

export const posthogMetrics = { count, gauge, histogram, timed, flush: flushMetrics };
export default posthogMetrics;
