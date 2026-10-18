/**
 * PostHog Context Extractor
 *
 * Extracts PostHog person identification (distinctId), session ID, and window ID
 * from the x-posthog-* tracing headers of incoming HTTP requests.
 *
 * Used by:
 * - OpenTelemetry HttpInstrumentation (to attach posthogDistinctId and sessionId to spans)
 * - Exception capturing in instrumentation.js
 *
 * @see https://posthog.com/docs/tracing
 */

export interface PostHogRequestContext {
  distinctId?: string;
  sessionId?: string;
  windowId?: string;
}

// IDs come from client-controlled headers: cap length and restrict to a safe charset.
const SAFE_ID = /^[\w.:$@+-]{1,200}$/;

const clean = (v: unknown): string | undefined => {
  const trimmed = typeof v === 'string' ? v.trim() : '';
  return SAFE_ID.test(trimmed) ? trimmed : undefined;
};

/**
 * Extracts PostHog session and person context from the x-posthog-* tracing headers
 * (injected by posthog-js for same-origin fetch/XHR once the user has opted in).
 */
export function extractPostHogContextFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined
): PostHogRequestContext {
  if (!headers) return {};

  const result: PostHogRequestContext = {};
  const first = (name: string) => {
    const raw = headers[name];
    return clean(Array.isArray(raw) ? raw[0] : raw);
  };

  // Node lowercases IncomingMessage.headers, so direct lookups suffice.
  const distinctId = first('x-posthog-distinct-id');
  const sessionId = first('x-posthog-session-id');
  const windowId = first('x-posthog-window-id');
  if (distinctId) result.distinctId = distinctId;
  if (sessionId) result.sessionId = sessionId;
  if (windowId) result.windowId = windowId;

  return result;
}
