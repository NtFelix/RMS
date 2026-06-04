/**
 * PostHog Tracing (OpenTelemetry)
 *
 * Exports spans to PostHog via the standard OTLP/HTTP trace endpoint.
 * Next.js automatically instruments HTTP requests, fetch calls, and
 * rendering when a global TracerProvider is registered — no additional
 * instrumentation libraries needed for the basics.
 *
 * @see https://posthog.com/docs/tracing/start-here
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { trace } from '@opentelemetry/api';

import { SERVICE_NAME, POSTHOG_API_KEY, POSTHOG_HOST } from './otlp-utils';

/**
 * Derive the traces ingestion endpoint from the configured PostHog host.
 */
function getTracesEndpoint(): string {
  const host = POSTHOG_HOST.replace(/\/$/, '');
  return `${host}/i/v1/traces`;
}

let provider: NodeTracerProvider | null = null;

/**
 * Initialize the OpenTelemetry TracerProvider and register it globally.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initTracing(): void {
  if (provider) return;

  if (!POSTHOG_API_KEY) {
    console.warn(
      '[PostHog Tracing] ⚠️ POSTHOG_API_KEY not set — tracing disabled'
    );
    return;
  }

  const endpoint = getTracesEndpoint();

  const exporter = new OTLPTraceExporter({
    url: endpoint,
    headers: {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
    },
  });

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      'service.name': SERVICE_NAME,
      'deployment.environment': process.env.NODE_ENV || 'development',
      'service.version': process.env.npm_package_version || '1.0.0',
    }),
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  // Register as the global trace provider so Next.js and any OTel-
  // instrumented library automatically emits spans through it.
  trace.setGlobalTracerProvider(provider);

  console.log('[PostHog Tracing] ✅ Initialized — exporting traces to', endpoint);
}

/**
 * Gracefully shut down the tracer provider and flush pending spans.
 */
export async function shutdownTracing(): Promise<void> {
  if (provider) {
    await provider.shutdown();
    provider = null;
  }
}
