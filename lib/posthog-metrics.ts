/**
 * PostHog Metrics - recording helpers
 *
 * Thin wrappers over the OpenTelemetry metrics API. They are safe no-ops until
 * `initMetrics()` (lib/posthog-metrics-init.ts, started from instrumentation.js)
 * registers a MeterProvider that exports to PostHog. This module imports only
 * `@opentelemetry/api`, so server actions and route handlers can use it without
 * pulling the OpenTelemetry SDK into their bundles.
 *
 * Attribute values must be low-cardinality (route, status, plan) - never user IDs.
 *
 * @see https://posthog.com/docs/metrics
 */

import { metrics, type Attributes, type Counter, type Histogram } from '@opentelemetry/api';

import { SERVICE_NAME } from './otlp-utils';

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();

function getOrCreate<T>(cache: Map<string, T>, name: string, create: () => T): T {
    let instrument = cache.get(name);
    if (!instrument) {
        instrument = create();
        cache.set(name, instrument);
    }
    return instrument;
}

/** Increment a monotonically increasing value (requests, completions). */
export function count(name: string, value = 1, attributes?: Attributes): void {
    getOrCreate(counters, name, () => metrics.getMeter(SERVICE_NAME).createCounter(name)).add(value, attributes);
}

/** Record a sample of a distribution (request duration, payload size). `unit` applies when the instrument is first created. */
export function histogram(name: string, value: number, attributes?: Attributes, unit?: string): void {
    getOrCreate(histograms, name, () => metrics.getMeter(SERVICE_NAME).createHistogram(name, { unit })).record(value, attributes);
}

type ActionStatus = 'success' | 'failed' | 'error';

/**
 * Record one server action run as `server_action.duration` (ms), tagged with the
 * action name and outcome. The action name must be a fixed string, never user input.
 */
export function recordActionDuration(action: string, durationMs: number, status: ActionStatus): void {
    histogram('server_action.duration', durationMs, { action, status }, 'ms');
}

/**
 * Time a server action. `success: false` results (the repo's error convention) are
 * recorded as `failed`; thrown errors as `error` and rethrown unchanged.
 */
export async function timedAction<T>(action: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    let status: ActionStatus = 'success';
    try {
        const result = await fn();
        if ((result as { success?: unknown } | null)?.success === false) status = 'failed';
        return result;
    } catch (error) {
        status = 'error';
        throw error;
    } finally {
        recordActionDuration(action, performance.now() - start, status);
    }
}

/**
 * Wrap a server action so every call is timed, in the style of `withLogging`:
 * `export const myAction = withTiming('myAction', myActionImpl)`.
 * Don't wrap an action that `withLogging` already wraps - both record `server_action.duration`.
 */
export function withTiming<A extends unknown[], R>(
    action: string,
    fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
    return async (...args) => timedAction(action, () => fn(...args));
}
