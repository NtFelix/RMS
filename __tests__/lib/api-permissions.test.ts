import { applyScopeFilter, applyWohnungScopeFilter, verifyEntityInScope, verifyWohnungInScope, requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';
import { hasPermission } from '@/lib/permissions';

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn(),
  getAccessibleWohnungIds: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn(),
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
      (hasPermission as jest.Mock).mockResolvedValue(true);
      await expect(requireApiPermission('haeuser', 'ansehen')).resolves.not.toThrow();
    });

    it('should throw if permission is denied', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      await expect(requireApiPermission('haeuser', 'ansehen')).rejects.toThrow('Permission denied');
    });
  });
});
