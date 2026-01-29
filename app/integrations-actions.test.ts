import { getAuthorizedApps, revokeApp } from './integrations-actions';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('integrations-actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  // Mock objects
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
  };

  const mockAdminAuth = {
    oauth: {
      listGrants: jest.fn(),
      deleteGrant: jest.fn(),
    },
  };

  const mockSupabaseAdmin = {
    auth: {
      admin: mockAdminAuth,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabaseAdmin);

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  });

  describe('getAuthorizedApps', () => {
    it('should return grants on success', async () => {
      const mockGrants = [
        { id: 'grant-1', client_id: 'client-1', client: { name: 'App 1' } },
      ];

      mockAdminAuth.oauth.listGrants.mockResolvedValue({ data: mockGrants, error: null });

      const result = await getAuthorizedApps();

      expect(result.success).toBe(true);
      expect(result.grants).toEqual(mockGrants);
      expect(createAdminClient).toHaveBeenCalled();
      expect(mockAdminAuth.oauth.listGrants).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return error if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });

      const result = await getAuthorizedApps();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nicht authentifiziert');
      expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('should return error if listGrants fails', async () => {
      mockAdminAuth.oauth.listGrants.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await getAuthorizedApps();

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
    });

    it('should handle missing oauth property gracefully (fallback)', async () => {
        // Mock admin auth without oauth property but with listGrants directly (older SDK style fallback)
        const mockAdminAuthFallback = {
            listGrants: jest.fn().mockResolvedValue({ data: [], error: null })
        };
        (createAdminClient as jest.Mock).mockReturnValue({
            auth: { admin: mockAdminAuthFallback }
        });

        const result = await getAuthorizedApps();

        expect(result.success).toBe(true);
        expect(result.grants).toEqual([]);
        expect(mockAdminAuthFallback.listGrants).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('revokeApp', () => {
    it('should revoke grant on success (ownership verified)', async () => {
      // Mock listGrants to return the grant we want to delete
      mockAdminAuth.oauth.listGrants.mockResolvedValue({
          data: [{ id: 'grant-1', user_id: mockUser.id }],
          error: null
      });
      mockAdminAuth.oauth.deleteGrant.mockResolvedValue({ error: null });

      const result = await revokeApp('grant-1');

      expect(result.success).toBe(true);
      expect(mockAdminAuth.oauth.listGrants).toHaveBeenCalledWith(mockUser.id);
      expect(mockAdminAuth.oauth.deleteGrant).toHaveBeenCalledWith('grant-1');
    });

    it('should fail if grant does not belong to user (IDOR protection)', async () => {
        // Mock listGrants to return EMPTY or unrelated grants
        mockAdminAuth.oauth.listGrants.mockResolvedValue({
            data: [{ id: 'other-grant', user_id: mockUser.id }],
            error: null
        });

        const result = await revokeApp('grant-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Zugriff verweigert oder Grant nicht gefunden');
        expect(mockAdminAuth.oauth.deleteGrant).not.toHaveBeenCalled();
    });

    it('should return error if revocation fails', async () => {
       // Mock listGrants SUCCESS
       mockAdminAuth.oauth.listGrants.mockResolvedValue({
        data: [{ id: 'grant-1', user_id: mockUser.id }],
        error: null
       });
       // Mock deleteGrant FAIL
       mockAdminAuth.oauth.deleteGrant.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await revokeApp('grant-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});
