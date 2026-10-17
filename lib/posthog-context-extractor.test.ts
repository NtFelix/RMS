/**
 * @jest-environment node
 */

import { extractPostHogContextFromHeaders } from './posthog-context-extractor';

describe('extractPostHogContextFromHeaders', () => {
  it('returns empty object when headers is undefined or empty', () => {
    expect(extractPostHogContextFromHeaders(undefined)).toEqual({});
    expect(extractPostHogContextFromHeaders({})).toEqual({});
  });

  it('extracts distinctId, sessionId, and windowId from tracing headers', () => {
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

  it('uses the first value of array-valued headers', () => {
    expect(extractPostHogContextFromHeaders({ 'x-posthog-distinct-id': ['first', 'second'] })).toEqual({
      distinctId: 'first',
    });
  });

  it('trims values and ignores empty or whitespace-only ones', () => {
    expect(
      extractPostHogContextFromHeaders({
        'x-posthog-distinct-id': '  user-1  ',
        'x-posthog-session-id': '   ',
        'x-posthog-window-id': '',
      })
    ).toEqual({ distinctId: 'user-1' });
  });

  it('rejects over-long or unsafe values', () => {
    expect(
      extractPostHogContextFromHeaders({
        'x-posthog-distinct-id': 'a'.repeat(201),
        'x-posthog-session-id': 'bad value\n<script>',
      })
    ).toEqual({});
  });

  it('accepts email-style distinct ids', () => {
    expect(extractPostHogContextFromHeaders({ 'x-posthog-distinct-id': 'a.b+c@example.com' })).toEqual({
      distinctId: 'a.b+c@example.com',
    });
  });

  it('ignores cookies (identity only comes from the tracing headers)', () => {
    const cookie = `ph_phc_x_posthog=${encodeURIComponent(JSON.stringify({ distinct_id: 'from-cookie' }))}`;
    expect(extractPostHogContextFromHeaders({ cookie })).toEqual({});
  });
});
