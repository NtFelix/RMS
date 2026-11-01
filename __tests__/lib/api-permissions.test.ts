import { applyScopeFilter, applyWohnungScopeFilter, verifyEntityInScope, verifyWohnungInScope, requireApiPermission, hasApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';
import { checkPermission } from '@/lib/permissions';
import { PermissionCheckError } from '@/lib/permissions-core';

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn(),
  getAccessibleWohnungIds: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  checkPermission: jest.fn(),
}));

describe('api-permissions helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyScopeFilter', () => {
    it('should call in() when accessibleHaeuserIds is not null', async () => {
      const mockIn = jest.fn().mockReturnThis();
      const mockQuery = { in: mockIn };

      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['haus1', 'haus2']);

      const result = await applyScopeFilter(mockQuery);

      expect(mockIn).toHaveBeenCalledWith('haus_id', ['haus1', 'haus2']);
      expect(result).toBe(mockQuery);
    });

    it('should not call in() when accessibleHaeuserIds is null', async () => {
      const mockIn = jest.fn().mockReturnThis();
      const mockQuery = { in: mockIn };

      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);

      const result = await applyScopeFilter(mockQuery);

      expect(mockIn).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });
  });

  describe('applyWohnungScopeFilter', () => {
    it('should call in() when accessibleWohnungIds is not null', async () => {
      const mockIn = jest.fn().mockReturnThis();
      const mockQuery = { in: mockIn };

      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w1', 'w2']);

      const result = await applyWohnungScopeFilter(mockQuery);

      expect(mockIn).toHaveBeenCalledWith('wohnung_id', ['w1', 'w2']);
      expect(result).toBe(mockQuery);
    });
  });

  describe('verifyEntityInScope', () => {
    it('should return true if accessibleHaeuserIds is null', async () => {
      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
      const result = await verifyEntityInScope('some-haus');
      expect(result).toBe(true);
    });

    it('should return true if ID is in accessibleHaeuserIds', async () => {
      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['haus-1', 'haus-2']);
      const result = await verifyEntityInScope('haus-1');
      expect(result).toBe(true);
    });

    it('should return false if ID is not in accessibleHaeuserIds', async () => {
      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['haus-1', 'haus-2']);
      const result = await verifyEntityInScope('haus-3');
      expect(result).toBe(false);
    });
  });

  describe('verifyWohnungInScope', () => {
    it('should return true if accessibleWohnungIds is null', async () => {
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
      const result = await verifyWohnungInScope('some-wohnung');
      expect(result).toBe(true);
    });

    it('should return true if ID is in accessibleWohnungIds', async () => {
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1', 'w-2']);
      const result = await verifyWohnungInScope('w-1');
      expect(result).toBe(true);
    });

    it('should return false if ID is not in accessibleWohnungIds', async () => {
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1', 'w-2']);
      const result = await verifyWohnungInScope('w-3');
      expect(result).toBe(false);
    });
  });

  describe('requireApiPermission', () => {
    it('should not throw if permission is granted', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('allowed');
      await expect(requireApiPermission('haeuser', 'ansehen')).resolves.not.toThrow();
    });

    it('should throw a plain "Permission denied" error (not a PermissionCheckError) if the right is missing', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('denied');
      const error = await requireApiPermission('haeuser', 'ansehen').catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(PermissionCheckError);
      expect(error.message).toBe('Permission denied');
    });

    it('should throw a PermissionCheckError if the check itself failed (access stays denied)', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('error');
      const error = await requireApiPermission('haeuser', 'ansehen').catch((e) => e);
      expect(error).toBeInstanceOf(PermissionCheckError);
      // same message as a missing right: routes that do not know the class still answer 403 as before
      expect(error.message).toBe('Permission denied');
    });
  });

  describe('hasApiPermission', () => {
    it('is true for allowed', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('allowed');
      await expect(hasApiPermission('mieter', 'ansehen')).resolves.toBe(true);
      expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    });

    it('is false for denied (missing right, no throw)', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('denied');
      await expect(hasApiPermission('mieter', 'ansehen')).resolves.toBe(false);
    });

    it('throws PermissionCheckError for error (a failed check is never "false")', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('error');
      await expect(hasApiPermission('mieter', 'ansehen')).rejects.toBeInstanceOf(PermissionCheckError);
    });
  });
});
