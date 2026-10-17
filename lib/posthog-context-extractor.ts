/**
 * PostHog Context Extractor
 *
 * Extracts PostHog person identification (distinctId), session ID, and window ID
 * from incoming HTTP headers and cookies.
 *
 * Used by:
 * - OpenTelemetry HttpInstrumentation (to attach posthogDistinctId and sessionId to spans)
 * - Error logging and exception capturing in instrumentation.js
 *
 * Attributes match PostHog's expectations for linking Traces to Persons & Session Replay:
 * - posthogDistinctId / distinct_id
 * - sessionId / $session_id
 * - $window_id / windowId
 *
 * @see https://posthog.com/docs/tracing
 */

export interface PostHogRequestContext {
  distinctId?: string;
  sessionId?: string;
  windowId?: string;
}

/**
 * Extracts PostHog session and person context from HTTP headers or a cookie header.
 */
export function extractPostHogContextFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined
): PostHogRequestContext {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const result: PostHogRequestContext = {};

  const lowercasedHeaders: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowercasedHeaders[key.toLowerCase()] = value;
  }

  const getHeader = (name: string): string | undefined => {
    const val = lowercasedHeaders[name.toLowerCase()];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  // 1. Check custom PostHog tracing headers (injected by posthog-js when tracing_headers is enabled)
  const distinctHeader = getHeader('x-posthog-distinct-id');
  if (distinctHeader && typeof distinctHeader === 'string' && distinctHeader.trim()) {
    result.distinctId = distinctHeader.trim();
  }

  const sessionHeader = getHeader('x-posthog-session-id');
  if (sessionHeader && typeof sessionHeader === 'string' && sessionHeader.trim()) {
    result.sessionId = sessionHeader.trim();
  }

  const windowHeader = getHeader('x-posthog-window-id');
  if (windowHeader && typeof windowHeader === 'string' && windowHeader.trim()) {
    result.windowId = windowHeader.trim();
  }

  // 2. Cookie fallback if distinctId or sessionId are not already provided via headers
  const cookieHeader = getHeader('cookie');
  if ((!result.distinctId || !result.sessionId) && cookieHeader && typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/ph_.*?_posthog=([^;]+)/);
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const data = JSON.parse(decoded);

        if (!result.distinctId && typeof data.distinct_id === 'string' && data.distinct_id.trim()) {
          result.distinctId = data.distinct_id.trim();
        }

        if (!result.sessionId) {
          if (Array.isArray(data.$sesid) && typeof data.$sesid[1] === 'string' && data.$sesid[1].trim()) {
            result.sessionId = data.$sesid[1].trim();
          } else if (typeof data.$session_id === 'string' && data.$session_id.trim()) {
            result.sessionId = data.$session_id.trim();
          } else if (typeof data.sessionId === 'string' && data.sessionId.trim()) {
            result.sessionId = data.sessionId.trim();
          }
        }
      } catch {
        // Silently ignore corrupted or unparseable cookies
      }
    }
  }

  return result;
}
