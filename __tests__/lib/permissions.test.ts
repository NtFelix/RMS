/**
 * checkPermission tells "right missing" (denied) apart from "the check itself failed" (error); hasPermission stays a
 * fail-closed boolean on top of it. Auth and Supabase are mocks, ids are synthetic.
 */

import { ensureAuth } from '@/lib/auth-utils';
import { evaluatePermissionResult } from '@/lib/permissions-core';

// jest.setup.js replaces the module with a mock, here the real one is under test
const { checkPermission, hasPermission, requirePermission } = jest.requireActual('@/lib/permissions') as typeof import('@/lib/permissions');
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
