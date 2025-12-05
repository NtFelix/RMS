export async function register() {
  // Initialize PostHog logging (OpenTelemetry-based)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initLogger, posthogLogger } = await import('./lib/posthog-logger');
    initLogger();

    // Log application startup
    posthogLogger.info('Application started', {
      'app.name': 'mietfluss',
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

    // Also send as exception to PostHog events
    try {
      const { getPostHogServer } = require('./app/posthog-server')
      const posthog = await getPostHogServer()
      let distinctId = null
      if (request.headers.cookie) {
        const cookieString = request.headers.cookie
        const postHogCookieMatch =
          cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
        if (postHogCookieMatch && postHogCookieMatch[1]) {
          try {
            const decodedCookie = decodeURIComponent(postHogCookieMatch[1])
            const postHogData = JSON.parse(decodedCookie)
            distinctId = postHogData.distinct_id
          } catch (e) {
            console.error('Error parsing PostHog cookie:', e)
          }
        }
      }
      await posthog.captureException(err, distinctId || undefined)
    } catch (posthogError) {
      console.error('Failed to capture exception in PostHog:', posthogError);
    }
  }
}

