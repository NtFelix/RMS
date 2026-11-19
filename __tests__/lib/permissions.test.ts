/**
 * checkPermission tells "right missing" (denied) apart from "the check itself failed" (error); hasPermission stays a
 * fail-closed boolean on top of it. Auth and Supabase are mocks, ids are synthetic.
 */

import { ensureAuth } from '@/lib/auth-utils';
import { AuthLookupError } from '@/lib/auth-errors';
import { evaluatePermissionResult } from '@/lib/permissions-core';

// jest.setup.js replaces the module with a mock, here the real one is under test
const { checkPermission, hasPermission, requirePermission, checkOrgAdminOrOwner, isOrgAdminOrOwner } = jest.requireActual('@/lib/permissions') as typeof import('@/lib/permissions');
const { redirect } = jest.requireMock('next/navigation') as { redirect: jest.Mock };

jest.mock('@/lib/auth-utils', () => ({ ensureAuth: jest.fn() }));
jest.mock('@/lib/permissions-core', () => ({
  ...jest.requireActual('@/lib/permissions-core'),
  evaluatePermissionResult: jest.fn(),
}));

const mockEnsureAuth = ensureAuth as jest.Mock;
const mockEvaluate = evaluatePermissionResult as jest.Mock;
const rpc = jest.fn();

describe('checkPermission / hasPermission', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    mockEnsureAuth.mockResolvedValue({ supabase: { rpc }, user: { id: 'user-1' } });
    rpc.mockResolvedValue({ data: 'org-1', error: null });
    mockEvaluate.mockResolvedValue('allowed');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['allowed', 'denied', 'error'] as const)('passes the result "%s" of the evaluation on; hasPermission is true only for allowed', async (result) => {
    mockEvaluate.mockResolvedValue(result);

    expect(await checkPermission('mieter', 'ansehen')).toBe(result);
    expect(await hasPermission('mieter', 'ansehen')).toBe(result === 'allowed');
    expect(mockEvaluate).toHaveBeenCalledWith({ rpc }, 'user-1', 'org-1', 'mieter', 'ansehen');
  });

  it('personal account (no organisation) is allowed without asking the evaluation', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    expect(await checkPermission('mieter', 'ansehen')).toBe('allowed');
    expect(await hasPermission('mieter', 'ansehen')).toBe(true);
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('a failed current_organisation_id lookup is an error (not denied) and hasPermission stays false, logged', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    expect(await checkPermission('mieter', 'ansehen')).toBe('error');
    expect(await hasPermission('mieter', 'ansehen')).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('current_organisation_id'), { message: 'rpc failed' });
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('an exception (thrown rpc or evaluation) is an error and hasPermission stays false, logged', async () => {
    rpc.mockRejectedValueOnce(new Error('network down'));
    expect(await checkPermission('mieter', 'ansehen')).toBe('error');

    mockEvaluate.mockRejectedValueOnce(new Error('boom'));
    expect(await checkPermission('mieter', 'ansehen')).toBe('error');

    rpc.mockRejectedValueOnce(new Error('network down'));
    expect(await hasPermission('mieter', 'ansehen')).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('mieter:ansehen'), expect.any(Error));
  });

  it('not authenticated is denied (as before: false), not an error', async () => {
    mockEnsureAuth.mockRejectedValue(new Error('Nicht authentifiziert. Bitte melden Sie sich an.'));

    expect(await checkPermission('mieter', 'ansehen')).toBe('denied');
    expect(await hasPermission('mieter', 'ansehen')).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('a failed user lookup (AuthLookupError, same message as "not signed in") is an error, not denied; logged once', async () => {
    mockEnsureAuth.mockRejectedValue(new AuthLookupError());

    expect(await checkPermission('mieter', 'ansehen')).toBe('error');
    expect(await hasPermission('mieter', 'ansehen')).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(2); // one line per call, not two
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('mieter:ansehen'), expect.any(AuthLookupError));
    expect(rpc).not.toHaveBeenCalled();
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('an unexpected exception of ensureAuth (neither "not signed in" nor a lookup error) is an error', async () => {
    mockEnsureAuth.mockRejectedValue(new Error('cookies() failed'));

    expect(await checkPermission('mieter', 'ansehen')).toBe('error');
  });

  it('"not signed in" is no failure: denied, nothing logged', async () => {
    mockEnsureAuth.mockRejectedValue(new Error('Nicht authentifiziert. Bitte melden Sie sich an.'));

    expect(await checkPermission('mieter', 'ansehen')).toBe('denied');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('an error of the evaluation is logged by the evaluation only (checkPermission adds no second line)', async () => {
    mockEvaluate.mockResolvedValue('error');

    expect(await checkPermission('mieter', 'ansehen')).toBe('error');
    expect(console.error).not.toHaveBeenCalled(); // the mock evaluation logs nothing, so checkPermission must not either
  });

  it('requirePermission still redirects to /unauthorized for denied AND for a failed check (no loosening)', async () => {
    mockEvaluate.mockResolvedValue('denied');
    await requirePermission('mieter', 'ansehen');
    mockEvaluate.mockResolvedValue('error');
    await requirePermission('mieter', 'ansehen');
    expect(redirect).toHaveBeenCalledTimes(2);
    expect(redirect).toHaveBeenCalledWith('/unauthorized');

    redirect.mockClear();
    mockEvaluate.mockResolvedValue('allowed');
    await requirePermission('mieter', 'ansehen');
    expect(redirect).not.toHaveBeenCalled();
  });
});

/** rpc mock that answers by function name: current_organisation_id and is_org_admin_or_owner */
function mockRpc({ orgId = 'org-1', orgError = null, isAdmin = true, adminError = null }: {
  orgId?: string | null; orgError?: unknown; isAdmin?: boolean | null | undefined; adminError?: unknown;
}) {
  rpc.mockImplementation(async (name: string) =>
    name === 'current_organisation_id'
      ? { data: orgError ? null : orgId, error: orgError }
      : { data: adminError ? null : isAdmin, error: adminError });
}

describe('checkOrgAdminOrOwner / isOrgAdminOrOwner', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    mockEnsureAuth.mockResolvedValue({ supabase: { rpc }, user: { id: 'user-1' } });
    mockRpc({ isAdmin: true });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('owner/admin (database function true) is allowed; anything else is denied; isOrgAdminOrOwner follows', async () => {
    expect(await checkOrgAdminOrOwner()).toBe('allowed');
    expect(await isOrgAdminOrOwner()).toBe(true);
    expect(rpc).toHaveBeenCalledWith('is_org_admin_or_owner');

    for (const isAdmin of [false, null]) {
      mockRpc({ isAdmin });
      expect(await checkOrgAdminOrOwner()).toBe('denied');
      expect(await isOrgAdminOrOwner()).toBe(false);
    }
  });

  it('a failed rpc (error object or exception) is an error, not denied; isOrgAdminOrOwner stays false (fail-closed), logged', async () => {
    mockRpc({ isAdmin: undefined, adminError: { message: 'rpc failed' } });
    expect(await checkOrgAdminOrOwner()).toBe('error');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('isOrgAdminOrOwner'), { message: 'rpc failed' });

    rpc.mockImplementation(async () => { throw new Error('network down'); });
    expect(await checkOrgAdminOrOwner()).toBe('error');

    mockRpc({ isAdmin: undefined, adminError: { message: 'rpc failed' } });
    expect(await isOrgAdminOrOwner()).toBe(false);
  });

  it('personal account (no organisation) is allowed without asking the database function; a failed organisation lookup is an error', async () => {
    mockRpc({ orgId: null, isAdmin: false });
    expect(await checkOrgAdminOrOwner()).toBe('allowed');
    expect(await isOrgAdminOrOwner()).toBe(true);
    expect(rpc).not.toHaveBeenCalledWith('is_org_admin_or_owner');

    mockRpc({ orgError: { message: 'org lookup failed' } });
    expect(await checkOrgAdminOrOwner()).toBe('error');
    expect(await isOrgAdminOrOwner()).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('current_organisation_id'), { message: 'org lookup failed' });
    expect(rpc).not.toHaveBeenCalledWith('is_org_admin_or_owner');
  });

  it('not signed in is denied (nothing logged); a failed user lookup or unexpected ensureAuth exception is an error', async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error('Nicht authentifiziert. Bitte melden Sie sich an.'));
    expect(await checkOrgAdminOrOwner()).toBe('denied');
    expect(console.error).not.toHaveBeenCalled();

    mockEnsureAuth.mockRejectedValueOnce(new AuthLookupError());
    expect(await checkOrgAdminOrOwner()).toBe('error');

    mockEnsureAuth.mockRejectedValueOnce(new Error('cookies() failed'));
    expect(await checkOrgAdminOrOwner()).toBe('error');
    expect(await isOrgAdminOrOwner()).toBe(true); // mocks are consumed, default is admin again
    expect(rpc).toHaveBeenCalledWith('is_org_admin_or_owner');
  });
});
