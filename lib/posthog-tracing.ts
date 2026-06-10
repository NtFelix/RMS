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
import { diag, DiagLogLevel } from '@opentelemetry/api';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

import { SERVICE_NAME, POSTHOG_API_KEY, POSTHOG_HOST } from './otlp-utils';
import { posthogLogger } from './posthog-logger';

const safeStringify = (val: unknown): string => {
  if (val instanceof Error) {
    return val.stack || val.message;
  }
  if (typeof val === 'object' && val !== null) {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

const createPostHogDiagLogger = () => {
  const log = (severity: 'debug' | 'info' | 'warn' | 'error') => (message: unknown, ...args: unknown[]) => {
    const text = typeof message === 'string' ? message : safeStringify(message);
    const formattedMessage = args.length > 0
      ? `${text} ${args.map(safeStringify).join(' ')}`
      : text;

    const consoleMethod = severity === 'error' ? console.error : severity === 'warn' ? console.warn : console.log;
    consoleMethod(`[OTel ${severity.toUpperCase()}] ${formattedMessage}`);

    posthogLogger[severity](`[OTel] ${text}`, {
      'otel.message': text,
      'otel.args': args.length > 0 ? safeStringify(args) : undefined,
      'otel.diagnostic': true
    });
  };

  return {
    verbose: log('debug'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
};

diag.setLogger(createPostHogDiagLogger(), DiagLogLevel.INFO);

function getTracesEndpoint(): string {
  const host = POSTHOG_HOST.replace(/\/$/, '');
  return `${host}/i/v1/traces`;
}

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (sdk) return;

  // Prevent the SDK from creating a default PeriodicExportingMetricReader
  // that would try to export to localhost:4318 and fail.
  process.env.OTEL_METRICS_EXPORTER = 'none';

  // Enable verbose Next.js OpenTelemetry spans (render, metadata, component
  // resolution, etc.) that are hidden by default.
  process.env.NEXT_OTEL_VERBOSE = '1';

  const endpoint = getTracesEndpoint();

  console.log('[PostHog Tracing] 🚀 Initializing...', {
    serviceName: SERVICE_NAME,
    endpoint,
    hasApiKey: !!POSTHOG_API_KEY,
    environment: process.env.NODE_ENV || 'development'
  });

  if (!POSTHOG_API_KEY) {
    console.warn('[PostHog Tracing] ⚠️ POSTHOG_API_KEY not set — tracing disabled');
    return;
  }

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
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        scheduledDelayMillis: 1000,
        exportTimeoutMillis: 10000,
        maxQueueSize: 1024,
        maxExportBatchSize: 128,
      }),
    ],
    instrumentations: [
      new HttpInstrumentation(),
    ],
  });

  sdk.start();

  console.log('[PostHog Tracing] ✅ Initialized — exporting traces to', endpoint);

  const handleShutdown = () => {
    shutdownTracing().catch(() => {});
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
