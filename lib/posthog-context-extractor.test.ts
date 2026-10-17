/**
 * @jest-environment node
 */

import { extractPostHogContextFromHeaders } from './posthog-context-extractor';

describe('extractPostHogContextFromHeaders', () => {
  it('returns empty object when headers is undefined or empty', () => {
    expect(extractPostHogContextFromHeaders(undefined)).toEqual({});
    expect(extractPostHogContextFromHeaders({})).toEqual({});
  });

  it('extracts distinctId, sessionId, and windowId from custom headers', () => {
    const headers = {
      'x-posthog-distinct-id': 'user-123',
      'x-posthog-session-id': 'session-abc',
      'x-posthog-window-id': 'window-xyz',
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({
      distinctId: 'user-123',
      sessionId: 'session-abc',
      windowId: 'window-xyz',
    });
  });

  it('handles case-insensitive header names', () => {
    const headers = {
      'X-POSTHOG-DISTINCT-ID': 'user-456',
      'X-PostHog-Session-Id': 'session-def',
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({
      distinctId: 'user-456',
      sessionId: 'session-def',
    });
  });

  it('falls back to cookie when headers are missing', () => {
    const cookiePayload = JSON.stringify({
      distinct_id: 'user-cookie-789',
      $sesid: [1712345678000, 'session-cookie-999', 1712345678000],
    });
    const headers = {
      cookie: `other_cookie=123; ph_phc_mytoken_posthog=${encodeURIComponent(cookiePayload)}; another_cookie=456`,
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({
      distinctId: 'user-cookie-789',
      sessionId: 'session-cookie-999',
    });
  });

  it('handles cookie with string sessionId or $session_id', () => {
    const cookiePayload = JSON.stringify({
      distinct_id: 'user-direct-1',
      $session_id: 'session-direct-1',
    });
    const headers = {
      cookie: `ph_sample_posthog=${encodeURIComponent(cookiePayload)}`,
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({
      distinctId: 'user-direct-1',
      sessionId: 'session-direct-1',
    });
  });

  it('prefers headers over cookie values when both are present', () => {
    const cookiePayload = JSON.stringify({
      distinct_id: 'user-from-cookie',
      $sesid: [1712345678000, 'session-from-cookie', 1712345678000],
    });
    const headers = {
      'x-posthog-distinct-id': 'user-from-header',
      'x-posthog-session-id': 'session-from-header',
      cookie: `ph_sample_posthog=${encodeURIComponent(cookiePayload)}`,
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({
      distinctId: 'user-from-header',
      sessionId: 'session-from-header',
    });
  });

  it('handles corrupted cookie gracefully without throwing', () => {
    const headers = {
      cookie: 'ph_sample_posthog=not-json-content',
    };

    expect(extractPostHogContextFromHeaders(headers)).toEqual({});
  });
});
