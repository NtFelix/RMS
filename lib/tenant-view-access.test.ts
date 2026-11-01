/** @jest-environment node */

import { checkPermission } from '@/lib/permissions';
import { checkTenantViewAccess, TENANT_CHECK_RETRY_DELAY_MS } from '@/lib/tenant-view-access';

/**
 * checkTenantViewAccess: `mieter:ansehen` with ONE retry after a failed check (`error`), never for `denied`.
 * Fail-closed: only an answer of `allowed` ever gives `canViewTenants: true`.
 */

const mockCheck = checkPermission as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation();
});

describe('checkTenantViewAccess', () => {
  it('allowed: no retry', async () => {
    mockCheck.mockResolvedValueOnce('allowed');

    expect(await checkTenantViewAccess({ delayMs: 0 })).toEqual({ canViewTenants: true });
    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockCheck).toHaveBeenCalledWith('mieter', 'ansehen');
  });

  it('denied: a decision, so no retry and no failure signal', async () => {
    mockCheck.mockResolvedValue('denied');

    expect(await checkTenantViewAccess({ delayMs: 0 })).toEqual({ canViewTenants: false, permissionCheckFailed: false });
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  it('error, then allowed: the single retry succeeds', async () => {
    mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');

    expect(await checkTenantViewAccess({ delayMs: 0 })).toEqual({ canViewTenants: true });
    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it('error, then denied: the right is missing after all, no failure signal', async () => {
    mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('denied');

    expect(await checkTenantViewAccess({ delayMs: 0 })).toEqual({ canViewTenants: false, permissionCheckFailed: false });
    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it('error twice: fail-closed with the failure signal, and exactly one retry (no loop)', async () => {
    mockCheck.mockResolvedValue('error');

    expect(await checkTenantViewAccess({ delayMs: 0 })).toEqual({ canViewTenants: false, permissionCheckFailed: true });
    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it('waits before the retry, not before the first check', async () => {
    jest.useFakeTimers();
    try {
      mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');

      const pending = checkTenantViewAccess();
      await jest.advanceTimersByTimeAsync(TENANT_CHECK_RETRY_DELAY_MS - 1);
      expect(mockCheck).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(await pending).toEqual({ canViewTenants: true });
      expect(mockCheck).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the pause small (150-300 ms)', () => {
    expect(TENANT_CHECK_RETRY_DELAY_MS).toBeGreaterThanOrEqual(150);
    expect(TENANT_CHECK_RETRY_DELAY_MS).toBeLessThanOrEqual(300);
  });

  it('lets an exception of the check through (no silent "allowed")', async () => {
    mockCheck.mockRejectedValueOnce(new Error('boom'));

    await expect(checkTenantViewAccess({ delayMs: 0 })).rejects.toThrow('boom');
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });
});
