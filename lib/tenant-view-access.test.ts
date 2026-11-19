/** @jest-environment node */

import { checkPermission } from '@/lib/permissions';
import { applyTenantAccess, checkTenantViewAccess, TENANT_CHECK_RETRY_DELAY_MS, withheldTenantFields } from '@/lib/tenant-view-access';

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

  describe('abort (the caller returned without tenant data)', () => {
    it('during the pause: no second check, fail-closed and ends at once (no full pause)', async () => {
      jest.useFakeTimers();
      try {
        mockCheck.mockResolvedValue('error');
        const controller = new AbortController();

        const pending = checkTenantViewAccess({ signal: controller.signal });
        await jest.advanceTimersByTimeAsync(TENANT_CHECK_RETRY_DELAY_MS - 50);
        controller.abort();

        expect(await pending).toEqual({ canViewTenants: false, permissionCheckFailed: true });
        expect(mockCheck).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0); // the pause timer is gone
      } finally {
        jest.useRealTimers();
      }
    });

    it('before the first answer: the failed check is not repeated', async () => {
      mockCheck.mockResolvedValue('error');
      const controller = new AbortController();

      const pending = checkTenantViewAccess({ delayMs: 0, signal: controller.signal });
      controller.abort();

      expect(await pending).toEqual({ canViewTenants: false, permissionCheckFailed: true });
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('never turns into allowed: an aborted signal does not change a decision (allowed stays, denied stays)', async () => {
      const controller = new AbortController();
      controller.abort();

      mockCheck.mockResolvedValueOnce('allowed');
      expect(await checkTenantViewAccess({ signal: controller.signal })).toEqual({ canViewTenants: true });
      mockCheck.mockResolvedValueOnce('denied');
      expect(await checkTenantViewAccess({ signal: controller.signal })).toEqual({
        canViewTenants: false,
        permissionCheckFailed: false,
      });
    });

    it('not aborted: the retry runs as without a signal', async () => {
      mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');

      expect(await checkTenantViewAccess({ delayMs: 0, signal: new AbortController().signal })).toEqual({
        canViewTenants: true,
      });
      expect(mockCheck).toHaveBeenCalledTimes(2);
    });
  });

  it('lets an exception of the check through (no silent "allowed")', async () => {
    mockCheck.mockRejectedValueOnce(new Error('boom'));

    await expect(checkTenantViewAccess({ delayMs: 0 })).rejects.toThrow('boom');
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });
});

describe('withheldTenantFields', () => {
  it('missing right: tenantAccess false, no failure signal', () => {
    expect(withheldTenantFields({ canViewTenants: false, permissionCheckFailed: false })).toEqual({ tenantAccess: false });
  });

  it('failed check: tenantAccess false plus the failure signal', () => {
    expect(withheldTenantFields({ canViewTenants: false, permissionCheckFailed: true })).toEqual({
      tenantAccess: false,
      permissionCheckFailed: true,
    });
  });
});

describe('applyTenantAccess', () => {
  const tenants = [{ id: 't1' }];

  it('allowed: the tenants, no extra fields', () => {
    expect(applyTenantAccess({ canViewTenants: true }, tenants)).toEqual({ mieter: tenants });
  });

  it('missing right: empty list and tenantAccess false, no failure signal', () => {
    expect(applyTenantAccess({ canViewTenants: false, permissionCheckFailed: false }, tenants)).toEqual({
      mieter: [],
      tenantAccess: false,
    });
  });

  it('failed check: empty list, tenantAccess false and the failure signal', () => {
    expect(applyTenantAccess({ canViewTenants: false, permissionCheckFailed: true }, tenants)).toEqual({
      mieter: [],
      tenantAccess: false,
      permissionCheckFailed: true,
    });
  });
});
