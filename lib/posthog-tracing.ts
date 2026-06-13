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
import { diag, DiagConsoleLogger, DiagLogLevel, DiagLogFunction } from '@opentelemetry/api';

import { SERVICE_NAME, POSTHOG_API_KEY, POSTHOG_HOST } from './otlp-utils';
import { posthogLogger } from './posthog-logger';

/**
 * A custom OpenTelemetry Diagnostic Logger that forwards logs to PostHog
 */
const createPostHogDiagLogger = () => {
  const log = (severity: 'debug' | 'info' | 'warn' | 'error'): DiagLogFunction => (message, ...args) => {
    // Format the message with args
    const formattedMessage = args.length > 0 
      ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : message;
    
    // Always log to console as well for Docker logs
    const consoleMethod = severity === 'error' ? console.error : severity === 'warn' ? console.warn : console.log;
    consoleMethod(`[OTel ${severity.toUpperCase()}] ${formattedMessage}`);

    // Forward to PostHog logs
    posthogLogger[severity](`[OTel] ${message}`, {
      'otel.message': message,
      'otel.args': args.length > 0 ? JSON.stringify(args) : undefined,
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

// Enable diagnostic logging for OpenTelemetry
// We forward these to PostHog logs so we can see why traces might be failing in Docker
diag.setLogger(createPostHogDiagLogger(), DiagLogLevel.INFO);

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

  const endpoint = getTracesEndpoint();

  console.log('[PostHog Tracing] 🚀 Initializing...', {
    serviceName: SERVICE_NAME,
    endpoint,
    hasApiKey: !!POSTHOG_API_KEY,
    apiKeyPrefix: POSTHOG_API_KEY ? `${POSTHOG_API_KEY.substring(0, 8)}...` : 'none',
    environment: process.env.NODE_ENV || 'development'
  });

  if (!POSTHOG_API_KEY) {
    console.warn(
      '[PostHog Tracing] ⚠️ POSTHOG_API_KEY not set — tracing disabled'
    );
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
    spanProcessor: new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: process.env.NODE_ENV === 'production' ? 5000 : 1000,
      exportTimeoutMillis: 30000,
    }),
  });

  sdk.start();

  console.log('[PostHog Tracing] ✅ Initialized — exporting traces to', endpoint);

  // Handle graceful shutdown
  const handleShutdown = () => {
    shutdownTracing()
      .then(() => {
        console.log('[PostHog Tracing] 🛑 SDK shut down successfully');
        process.exit(0);
      })
      .catch((err) => {
        console.error('[PostHog Tracing] ❌ Error during shutdown:', err);
        process.exit(1);
      });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
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
