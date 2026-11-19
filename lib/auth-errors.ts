import { isAuthRetryableFetchError } from '@supabase/supabase-js';

/** Message of the "not signed in" error of ensureAuth (callers such as istNichtAngemeldetFehler match its start). */
export const NOT_AUTHENTICATED_MESSAGE = 'Nicht authentifiziert. Bitte melden Sie sich an.';

/**
 * Thrown by ensureAuth when the lookup of the user itself failed for a technical reason (network, gateway, rate limit,
 * unreadable answer), as opposed to "there is no valid session". The message is the same as for "not signed in", so
 * every caller that only reads the message behaves as before; only code that tells the two apart (checkPermission)
 * looks at the class.
 */
export class AuthLookupError extends Error {
  constructor(options?: { cause?: unknown }) {
    super(NOT_AUTHENTICATED_MESSAGE, options);
    this.name = 'AuthLookupError';
  }
}

/**
 * `true` if an error of supabase.auth.getUser() says "the lookup failed" and NOT "there is no (valid) session":
 * retryable fetch errors (network, 502/503/504), any 5xx, 429, and unreadable answers (AuthUnknownError). Everything
 * else (missing session, invalid or expired token, 4xx) counts as "not signed in".
 */
export function isTransientAuthError(error: { name?: string; status?: number }): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  if (error.name === 'AuthUnknownError') return true;
  return typeof error.status === 'number' && (error.status >= 500 || error.status === 429);
}

/**
 * `true` only for the "there is no valid session" error of ensureAuth. A failed lookup (AuthLookupError, same message)
 * and any unexpected exception are not.
 */
export function isNotAuthenticatedError(error: unknown): boolean {
  return !(error instanceof AuthLookupError) && error instanceof Error && error.message.startsWith('Nicht authentifiziert');
}
