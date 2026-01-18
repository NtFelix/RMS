import {
  getFolderContents,
  getPathContents,
  loadFilesForPath,
  getTotalStorageUsage,
  deleteFolder,
} from './actions';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('dateien/actions', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    rpc: jest.Mock;
    from: jest.Mock;
    storage: { from: jest.Mock };
  };
  let mockQueryBuilder: {
    select: jest.Mock;
    like: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    then: jest.Mock;
  };
  let mockStorageBuilder: {
    createSignedUrl: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(), // mockResolvedValue will be used on this
      then: jest.fn((resolve) => resolve({ data: [], error: null })), // Default resolution for await builder
    };

    mockStorageBuilder = {
      createSignedUrl: jest.fn(),
      remove: jest.fn(),
    };

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      rpc: jest.fn(),
      from: jest.fn(() => mockQueryBuilder),
      storage: {
        from: jest.fn(() => mockStorageBuilder),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getFolderContents', () => {
    it('should return folder contents', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const mockData = {
        files: [{ name: 'file1' }],
        folders: [{ name: 'folder1' }],
        breadcrumbs: [{ name: 'Home' }],
        totalSize: 100,
        error: null,
      };

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await getFolderContents('user123', 'path/to/folder');

      expect(result).toEqual({
        files: mockData.files,
        folders: mockData.folders,
        breadcrumbs: mockData.breadcrumbs,
        totalSize: mockData.totalSize,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_user_id: 'user123',
        p_current_path: 'path/to/folder',
      });
    });

    it('should handle RPC error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const result = await getFolderContents('user123', 'path/to/folder');

      expect(result.error).toContain('Fehler beim Laden der Ordnerinhalte');
    });

    it('should redirect if user is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'otherUser' } },
        error: null,
      });

      try {
        await getFolderContents('user123', 'path/to/folder');
      } catch (e) {
        // redirect throws
      }

      expect(redirect).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('getPathContents', () => {
    it('should alias getFolderContents', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: {
          files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null
        }, error: null
      });

      await getPathContents('user123', 'path');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_user_id: 'user123',
        p_current_path: 'path',
      });
    });
  });

  describe('loadFilesForPath', () => {
    it('should validate path ownership', async () => {
      const result = await loadFilesForPath('user123', 'user_other/path');
      expect(result.error).toBe('Ungültiger Pfad');
    });

    it('should call getFolderContents if valid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: {
          files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null
        }, error: null
      });

      await loadFilesForPath('user123', 'user_user123/path');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_user_id: 'user123',
        p_current_path: 'user_user123/path',
      });
    });
  });

  describe('getTotalStorageUsage', () => {
    it('should return total size', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: {
          files: [], folders: [], breadcrumbs: [], totalSize: 500, error: null
        }, error: null
      });

      const size = await getTotalStorageUsage('user123');
      expect(size).toBe(500);
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder contents and remove files', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      // Mock the file listing query (which awaits the builder)
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({
        data: [{ dateipfad: 'path', dateiname: 'file1' }],
        error: null,
      }));

      // Mock house/apartment/tenant checks (which use single())
      // We need to make sure single() returns null (not found) so it proceeds
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      mockStorageBuilder.remove.mockResolvedValue({ error: null });

      const result = await deleteFolder('user123', 'user_user123/folder');

      expect(result).toEqual({ success: true });
      expect(mockStorageBuilder.remove).toHaveBeenCalled();
    });

    it('should return error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await deleteFolder('user123', 'user_user123/folder');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nicht authentifiziert');
    });

    it('should prevent deleting system folders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await deleteFolder('user123', 'user_user123/Miscellaneous');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Systemordner');
    });
  });
});
