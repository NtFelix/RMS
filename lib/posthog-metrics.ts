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

// The API's default provider is a no-op (not a proxy that upgrades later), so instruments
// created before initMetrics() registers the real provider would stay no-ops forever.
// Drop the caches whenever the global provider changes.
let cachedProvider: unknown;

function getMeterProvider() {
    const provider = metrics.getMeterProvider();
    if (provider !== cachedProvider) {
        counters.clear();
        histograms.clear();
        cachedProvider = provider;
    }
    return provider;
}

/** Increment a monotonically increasing value (requests, completions). */
export function count(name: string, value = 1, attributes?: Attributes): void {
    const provider = getMeterProvider();
    let counter = counters.get(name);
    if (!counter) {
        counter = provider.getMeter(SERVICE_NAME).createCounter(name);
        counters.set(name, counter);
    }
    counter.add(value, attributes);
}

/** Record a sample of a distribution (request duration, payload size). Instruments are cached per name and unit, so one name is never recorded under two units. */
export function histogram(name: string, value: number, attributes?: Attributes, unit?: string): void {
    const provider = getMeterProvider();
    const key = `${name}|${unit ?? ''}`;
    let instrument = histograms.get(key);
    if (!instrument) {
        instrument = provider.getMeter(SERVICE_NAME).createHistogram(name, { unit });
        histograms.set(key, instrument);
    }
    instrument.record(value, attributes);
}

type ActionStatus = 'success' | 'failed' | 'error';

/** Outcome of an action result under the repo's convention: `success: false` means failed. */
export function actionStatus(result: unknown): 'success' | 'failed' {
    return (result as { success?: unknown } | null)?.success === false ? 'failed' : 'success';
}

/**
 * Record one server action run as `server_action.duration` (ms), tagged with the
 * action name and outcome. The action name must be a fixed string, never user input.
 */
export function recordActionDuration(action: string, durationMs: number, status: ActionStatus): void {
    histogram('server_action.duration', durationMs, { action, status }, 'ms');
}

// Functions that already record `server_action.duration`, so no second wrapper records it again.
const timedFunctions = new WeakSet<object>();

/** Mark `fn` as recording `server_action.duration` itself (used by `withLogging`). */
export function markTimed<F extends object>(fn: F): F {
    timedFunctions.add(fn);
    return fn;
}

export function isTimed(fn: object): boolean {
    return timedFunctions.has(fn);
}

/**
 * Wrap a server action so every call is timed, in the style of `withLogging`:
 * `export const myAction = withTiming('myAction', myActionImpl)`.
 * `success: false` results (the repo's error convention) are recorded as `failed`; thrown errors
 * as `error` and rethrown unchanged. A function that `withLogging` already wraps (or that is
 * already timed) is returned as is, so an action never records the metric twice.
 */
export function withTiming<A extends unknown[], R>(
    action: string,
    fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
    if (isTimed(fn)) return fn;
    return markTimed(async (...args: A) => {
        const start = performance.now();
        let status: ActionStatus = 'success';
        try {
            const result = await fn(...args);
            status = actionStatus(result);
            return result;
        } catch (error) {
            status = 'error';
            throw error;
        } finally {
            recordActionDuration(action, performance.now() - start, status);
        }
    });
}
