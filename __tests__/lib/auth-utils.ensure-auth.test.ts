/**
 * ensureAuth keeps its message for every caller but tells a failed user lookup (AuthLookupError) apart from "no valid
 * session". jest.setup.js replaces the module with a mock, here the real one is under test. Supabase is a mock.
 */

import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, AuthUnknownError } from '@supabase/supabase-js';
import { AuthLookupError, isNotAuthenticatedError } from '@/lib/auth-errors';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const { ensureAuth } = jest.requireActual('@/lib/auth-utils') as typeof import('@/lib/auth-utils');

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }));

const getUser = jest.fn();

async function ensureAuthError(): Promise<unknown> {
  try {
    await ensureAuth();
  } catch (error) {
    return error;
  }
  throw new Error('ensureAuth did not throw');
}

describe('ensureAuth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ;(createSupabaseServerClient as jest.Mock).mockResolvedValue({ auth: { getUser } });
  });

  it('returns the user and the client for a valid session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    expect((await ensureAuth()).user).toEqual({ id: 'user-1' });
  });

  it.each([
    ['no user, no error', { data: { user: null }, error: null }],
    ['missing session', { data: { user: null }, error: new AuthSessionMissingError() }],
    ['invalid token (401)', { data: { user: null }, error: new AuthApiError('invalid JWT', 401, 'bad_jwt') }],
    ['user not found (403)', { data: { user: null }, error: new AuthApiError('user not found', 403, 'user_not_found') }],
  ])('%s: "not signed in" (plain error, same message as always)', async (_label, result) => {
    getUser.mockResolvedValue(result);

    const error = await ensureAuthError();

    expect(error).not.toBeInstanceOf(AuthLookupError);
    expect(isNotAuthenticatedError(error)).toBe(true);
    expect((error as Error).message).toBe('Nicht authentifiziert. Bitte melden Sie sich an.');
  });

  it.each([
    ['network failure', new AuthRetryableFetchError('fetch failed', 0)],
    ['gateway timeout (504)', new AuthRetryableFetchError('timeout', 504)],
    ['server error (500)', new AuthApiError('boom', 500, 'unexpected_failure')],
    ['rate limit (429)', new AuthApiError('too many', 429, 'over_request_rate_limit')],
    ['unreadable answer', new AuthUnknownError('not json', new Error('x'))],
  ])('%s: AuthLookupError with the same message, cause kept, not "not signed in"', async (_label, authError) => {
    getUser.mockResolvedValue({ data: { user: null }, error: authError });

    const error = await ensureAuthError();

    expect(error).toBeInstanceOf(AuthLookupError);
    expect(isNotAuthenticatedError(error)).toBe(false);
    expect((error as Error).message).toBe('Nicht authentifiziert. Bitte melden Sie sich an.');
    expect((error as Error).cause).toBe(authError);
  });
});
