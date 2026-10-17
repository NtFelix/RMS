export async function register() {
  // Add global error handler for uncaught exceptions to prevent server crashes on ECONNRESET
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      // Ignore ECONNRESET errors from aborted requests which are common in Next.js 15
      const isAborted = err?.message?.includes('aborted');
      const isEconnReset = err?.code === 'ECONNRESET';
      
      if (isAborted && isEconnReset) {
        // Ignore ECONNRESET errors which are common in Next.js/Node during client aborts
        return;
      }
      console.error('Uncaught Exception:', err);
      // For other errors, we might want to let the process exit or log them
    });
  }

  // Initialize PostHog observability (OpenTelemetry-based logging + tracing)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Tracing first: HttpInstrumentation patches http when it is created, before the other modules load.
    const { initTracing } = await import('./lib/posthog-tracing');
    initTracing();

    const [{ initMetrics }, { initLogger, posthogLogger }] = await Promise.all([
      import('./lib/posthog-metrics-init'),
      import('./lib/posthog-logger'),
    ]);
    initMetrics();
    initLogger();

    // Log application startup
    posthogLogger.info('Application started', {
      'app.name': 'mietevo',
      'app.version': process.env.npm_package_version || '1.0.0',
      'runtime': 'nodejs',
      'node.version': process.version,
    });
  }
}

export const onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Count the failure (low-cardinality attributes only)
    try {
      const { count } = await import('./lib/posthog-metrics');
      count('request.errors', 1, {
        'context.routeType': context?.routeType || 'unknown',
        'request.method': request?.method || 'unknown',
      });
    } catch (metricsError) {
      console.error('Failed to record request error metric:', metricsError);
    }

    // Log to PostHog logs
    try {
      const { posthogLogger } = await import('./lib/posthog-logger');
      posthogLogger.error('Unhandled request error', {
        'error.message': err?.message || 'Unknown error',
        'error.name': err?.name || 'Error',
        'error.stack': err?.stack?.substring(0, 500), // Truncate stack trace
        'request.path': request?.url ? new URL(request.url).pathname : 'unknown',
        'request.method': request?.method || 'unknown',
        'context.routeType': context?.routeType || 'unknown',
        'context.routePath': context?.routePath || 'unknown',
      });
      await posthogLogger.flush(); // Ensure error is sent immediately
    } catch (logError) {
      console.error('Failed to log request error to PostHog:', logError);
    }

    // Also send as exception to PostHog events
    try {
      const { getPostHogServer } = require('./app/posthog-server')
      const posthog = await getPostHogServer()
      let distinctId
      try {
        const { extractPostHogContextFromHeaders } = await import('./lib/posthog-context-extractor')
        distinctId = extractPostHogContextFromHeaders(request?.headers).distinctId
      } catch (e) {
        console.error('Error extracting PostHog context:', e)
      }
      await posthog.captureException(err, distinctId)
    } catch (posthogError) {
      console.error('Failed to capture exception in PostHog:', posthogError);
    }
  }
}

