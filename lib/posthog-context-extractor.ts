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

const clean = (v: unknown): string | undefined => {
  const trimmed = typeof v === 'string' ? v.trim() : '';
  return trimmed || undefined;
};

const POSTHOG_COOKIE_PATTERN = /(?:^|;\s*)ph_[^=;]+_posthog=([^;]+)/;

/**
 * Extracts PostHog session and person context from HTTP headers or a cookie header.
 */
export function extractPostHogContextFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined
): PostHogRequestContext {
  if (!headers) return {};

  const result: PostHogRequestContext = {};
  let cookieHeader: string | undefined;

  // Single pass over the headers (names matched case-insensitively), no intermediate copy:
  // runs for every HTTP request via the OpenTelemetry request hook.
  for (const [key, raw] of Object.entries(headers)) {
    const value = clean(Array.isArray(raw) ? raw[0] : raw);
    if (!value) continue;
    switch (key.toLowerCase()) {
      // Custom PostHog tracing headers (injected by posthog-js when tracing_headers is enabled)
      case 'x-posthog-distinct-id': result.distinctId = value; break;
      case 'x-posthog-session-id': result.sessionId = value; break;
      case 'x-posthog-window-id': result.windowId = value; break;
      case 'cookie': cookieHeader = value; break;
    }
  }

  // Cookie fallback if distinctId or sessionId are not already provided via headers
  if ((!result.distinctId || !result.sessionId) && cookieHeader?.includes('_posthog=')) {
    const encoded = POSTHOG_COOKIE_PATTERN.exec(cookieHeader)?.[1];
    if (encoded) {
      try {
        const data = JSON.parse(decodeURIComponent(encoded));
        result.distinctId ??= clean(data.distinct_id);
        result.sessionId ??=
          clean(Array.isArray(data.$sesid) ? data.$sesid[1] : undefined) ??
          clean(data.$session_id) ??
          clean(data.sessionId);
      } catch {
        // Silently ignore corrupted or unparseable cookies
      }
    }
  }

  return result;
}
