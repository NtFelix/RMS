import { captureServerEvent } from './lib/posthog-server-events'

function getDistinctIdFromCookie(cookieHeader) {
  if (!cookieHeader) {
    return null
  }

  const postHogCookieMatch = cookieHeader.match(/ph_phc_.*?_posthog=([^;]+)/)
  if (!postHogCookieMatch || !postHogCookieMatch[1]) {
    return null
  }

  try {
    const decodedCookie = decodeURIComponent(postHogCookieMatch[1])
    const postHogData = JSON.parse(decodedCookie)
    return postHogData.distinct_id || null
  } catch (error) {
    console.error('Error parsing PostHog cookie:', error)
    return null
  }
}

export async function register() {
  // Add global error handler for uncaught exceptions to prevent server crashes on ECONNRESET
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      if (err.message === 'aborted' && err['code'] === 'ECONNRESET') {
        // Ignore ECONNRESET errors which are common in Next.js/Node during client aborts
        // console.warn('Ignored ECONNRESET error'); 
        return;
      }
      console.error('Uncaught Exception:', err);
      // For other errors, we might want to let the process exit or log them
    });
  }

  // Initialize PostHog logging (OpenTelemetry-based)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initLogger, posthogLogger } = await import('./lib/posthog-logger');
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

    // Also send as exception-style event without relying on posthog-node.
    try {
      const distinctId = getDistinctIdFromCookie(request?.headers?.cookie)
      await captureServerEvent({
        distinctId: distinctId || 'server-error',
        event: '$exception',
        properties: {
          $exception_message: err?.message || 'Unknown error',
          $exception_type: err?.name || 'Error',
          $exception_source: 'instrumentation',
          request_path: request?.url ? new URL(request.url).pathname : 'unknown',
          request_method: request?.method || 'unknown',
          route_type: context?.routeType || 'unknown',
          route_path: context?.routePath || 'unknown',
        },
      })
    } catch (posthogError) {
      console.error('Failed to capture exception in PostHog:', posthogError);
    }
  }
}
