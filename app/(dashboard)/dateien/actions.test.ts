import {
  getFolderContents,
  getPathContents,
  loadFilesForPath,
  getTotalStorageUsage,
  deleteFolder,
} from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { folderMetadataFilter } from '@/lib/storage-paths';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const ORG_ID = 'org1';
const HAUS = 'haus-a';
let mockFolderRpcResult: { data: unknown; error: unknown } = { data: null, error: null };
function mockFolderRpc(result: { data: unknown; error: unknown }) {
  mockFolderRpcResult = result;
}

describe('dateien/actions', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    rpc: jest.Mock;
    from: jest.Mock;
    storage: { from: jest.Mock };
  };
  let mockQueryBuilder: {
    select: jest.Mock;
    or: jest.Mock;
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
      or: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(), // mockResolvedValue will be used on this
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), // used by house/apartment/tenant checks
      then: jest.fn((resolve: any) => resolve({ data: [], error: null })), // Default resolution for await builder
    } as any;

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

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Dispatch by RPC name; folder RPC results are set per test via mockFolderRpc
    mockFolderRpcResult = { data: null, error: null };
    mockSupabase.rpc.mockImplementation((name: string) => {
      if (name === 'current_organisation_id') return Promise.resolve({ data: ORG_ID, error: null });
      if (name === 'get_accessible_haeuser_ids') return Promise.resolve({ data: null, error: null });
      return Promise.resolve(mockFolderRpcResult);
    });
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

      mockFolderRpc({ data: mockData, error: null });

      const result = await getFolderContents('user123', 'path/to/folder');

      expect(result).toEqual({
        files: mockData.files,
        folders: mockData.folders,
        breadcrumbs: mockData.breadcrumbs,
        totalSize: mockData.totalSize,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: 'path/to/folder',
      });
    });

    it('should handle RPC error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockFolderRpc({ data: null, error: { message: 'RPC error' } });

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
      mockFolderRpc({
        data: {
          files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null
        }, error: null
      });

      await getPathContents('user123', 'path');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: 'path',
      });
    });
  });

  describe('loadFilesForPath', () => {
    it('should validate path ownership', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      const result = await loadFilesForPath('user123', `org_${ORG_ID}/private/other/path`);
      expect(result.error).toBe('Ungültiger Pfad');
    });

    it('should call getFolderContents if valid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockFolderRpc({
        data: {
          files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null
        }, error: null
      });

      await loadFilesForPath('user123', `org_${ORG_ID}/private/user123/path`);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: `org_${ORG_ID}/private/user123/path`,
      });
    });
  });

  describe('getTotalStorageUsage', () => {
    it('should return total size', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockFolderRpc({
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

      const result = await deleteFolder('user123', `org_${ORG_ID}/shared/${HAUS}/folder`);

      expect(result).toEqual({ success: true });
      expect(mockStorageBuilder.remove).toHaveBeenCalled();
    });

    it('selects exactly the folder and its sub-folders and never removes a sibling with the same prefix', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      const folderPath = `org_${ORG_ID}/shared/${HAUS}/Rechnungen`;
      // The sibling rows are returned on purpose, as a literal `*` in the name would let PostgREST match them
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({
        data: [
          { dateipfad: folderPath, dateiname: 'a.pdf' },
          { dateipfad: `${folderPath}/2024`, dateiname: 'b.pdf' },
          { dateipfad: `${folderPath}2`, dateiname: 'c.pdf' },
          { dateipfad: `${folderPath}_alt`, dateiname: 'd.pdf' },
        ],
        error: null,
      }));
      mockStorageBuilder.remove.mockResolvedValue({ error: null });

      const result = await deleteFolder('user123', folderPath);

      expect(result).toEqual({ success: true });
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(folderMetadataFilter(folderPath));
      expect(mockQueryBuilder.like).not.toHaveBeenCalled();
      expect(mockStorageBuilder.remove).toHaveBeenNthCalledWith(1, [`${folderPath}/a.pdf`, `${folderPath}/2024/b.pdf`]);
    });

    it('should return error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await deleteFolder('user123', `org_${ORG_ID}/shared/${HAUS}/folder`);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nicht authentifiziert');
    });

    it('should prevent deleting system folders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await deleteFolder('user123', `org_${ORG_ID}/private/user123/Miscellaneous`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Systemordner');
    });

    it('should never delete the org root or a house folder', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      expect((await deleteFolder('user123', `org_${ORG_ID}`)).success).toBe(false);
      expect((await deleteFolder('user123', `org_${ORG_ID}/shared`)).success).toBe(false);
      const houseResult = await deleteFolder('user123', `org_${ORG_ID}/shared/${HAUS}`);
      expect(houseResult.success).toBe(false);
      expect(houseResult.error).toContain('Systemordner');
      expect(mockStorageBuilder.remove).not.toHaveBeenCalled();
    });
  });
});
