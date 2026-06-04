/**
 * PostHog Tracing (OpenTelemetry)
 *
 * Uses the full NodeSDK from @opentelemetry/sdk-node to register a
 * TracerProvider and auto-instrumentations so Next.js emits spans for
 * incoming requests, fetch calls, and rendering.  Spans are exported
 * to PostHog's OTLP /i/v1/traces endpoint.
 *
 * @see https://posthog.com/docs/tracing/start-here
 * @see https://nextjs.org/docs/app/guides/open-telemetry
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';

import { SERVICE_NAME, POSTHOG_API_KEY, POSTHOG_HOST } from './otlp-utils';

function getTracesEndpoint(): string {
  const host = POSTHOG_HOST.replace(/\/$/, '');
  return `${host}/i/v1/traces`;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize the OpenTelemetry NodeSDK for tracing.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initTracing(): void {
  if (sdk) return;

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

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': SERVICE_NAME,
      'deployment.environment': process.env.NODE_ENV || 'development',
      'service.version': process.env.npm_package_version || '1.0.0',
    }),
    spanProcessor: new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }),
  });

  sdk.start();

  console.log('[PostHog Tracing] ✅ Initialized — exporting traces to', endpoint);
}

/**
 * Gracefully shut down the SDK and flush pending spans.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
