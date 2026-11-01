import {
  getFolderContents,
  getPathContents,
  loadFilesForPath,
  getTotalStorageUsage,
  deleteFolder,
} from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { folderMetadataFilter } from '@/lib/storage-paths';
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';
import { hasPermission } from '@/lib/permissions';
import { FOLDER_NOT_AVAILABLE_MESSAGE, STORAGE_ACCESS_DENIED_MESSAGE } from '@/lib/storage-messages';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const ORG_ID = 'org1';
const HAUS = 'haus-a';
const FOLDER_PATH = `org_${ORG_ID}/shared/${HAUS}/folder`;
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
    like: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    maybeSingle: jest.Mock;
    then: jest.Mock;
  };
  let mockHouseQuery: {
    select: jest.Mock;
    eq: jest.Mock;
    maybeSingle: jest.Mock;
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

    mockHouseQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: HAUS }, error: null }),
    };

    mockStorageBuilder = {
      createSignedUrl: jest.fn(),
      // Like Supabase Storage: `data` lists the objects that were actually removed
      remove: jest.fn(async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null })),
    };

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      rpc: jest.fn(),
      // Haeuser: the write check looks up the house of the path (it exists unless a test says otherwise)
      from: jest.fn((table: string) => (table === 'Haeuser' ? mockHouseQuery : mockQueryBuilder)),
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

      const result = await getFolderContents(FOLDER_PATH);

      expect(result).toEqual({
        files: mockData.files,
        folders: mockData.folders,
        breadcrumbs: mockData.breadcrumbs,
        totalSize: mockData.totalSize,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: FOLDER_PATH,
      });
    });

    it('should handle RPC error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockFolderRpc({ data: null, error: { message: 'RPC error' } });

      const result = await getFolderContents(FOLDER_PATH);

      expect(result.error).toContain('Fehler beim Laden der Ordnerinhalte');
    });

    it.each([
      'Invalid path: house not accessible',
      'Invalid path: does not belong to active organisation',
      'Invalid path: unknown zone',
    ])('shows one German message for the database refusal "%s" (no raw text, no names)', async (dbError) => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
      mockFolderRpc({
        data: { files: [], folders: [], breadcrumbs: [], totalSize: 0, error: dbError },
        error: null,
      });

      const result = await getFolderContents(`${FOLDER_PATH}/wohnung-1`);

      expect(result.error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE);
      expect(result.files).toEqual([]);
      expect(result.folders).toEqual([]);
    });

    it('maps a permission error of the RPC call to the same message, other RPC errors keep their text', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });

      mockFolderRpc({ data: null, error: { code: '42501', message: 'permission denied for function get_folder_contents' } });
      expect((await getFolderContents(FOLDER_PATH)).error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE);

      mockFolderRpc({ data: { files: [], folders: [], breadcrumbs: [], totalSize: 0, error: 'Some other problem' }, error: null });
      expect((await getFolderContents(FOLDER_PATH)).error).toBe('Some other problem');
    });

    it('refuses a path outside the organisation, a foreign private folder and a house outside the scope', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
      const denied = {
        files: [], folders: [], breadcrumbs: [], totalSize: 0, error: FOLDER_NOT_AVAILABLE_MESSAGE,
      };

      expect(await getFolderContents('path/to/folder')).toEqual(denied);
      expect(await getFolderContents('org_andere-org/shared/haus-a')).toEqual(denied);
      expect(await getFolderContents(`org_${ORG_ID}/private/other/path`)).toEqual(denied);
      // Scope of the next call: only haus-b
      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValueOnce(['haus-b']);
      expect(await getFolderContents(FOLDER_PATH)).toEqual(denied);
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('get_folder_contents', expect.anything());
    });

    it('loads the organisation root without a path and does not check anything else', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
      mockFolderRpc({ data: { files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null }, error: null });

      const result = await getFolderContents();

      expect(result.error).toBeUndefined();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', { p_current_path: `org_${ORG_ID}` });
      expect(getAccessibleHaeuserIds).not.toHaveBeenCalled();
    });

    it('takes the user from the session: only the own private folder is readable', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'otherUser' } }, error: null });
      mockFolderRpc({ data: { files: [], folders: [], breadcrumbs: [], totalSize: 0, error: null }, error: null });

      expect((await getFolderContents(`org_${ORG_ID}/private/user123/x`)).error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE);
      expect((await getFolderContents(`org_${ORG_ID}/private/otherUser/x`)).error).toBeUndefined();
    });

    it('returns an error object when nobody is signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } });

      const result = await getFolderContents(FOLDER_PATH);

      expect(result.error).toBe('Nicht authentifiziert');
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('get_folder_contents', expect.anything());
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

      await getPathContents(FOLDER_PATH);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: FOLDER_PATH,
      });
    });
  });

  describe('loadFilesForPath', () => {
    it('should validate path ownership', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      const result = await loadFilesForPath(`org_${ORG_ID}/private/other/path`);
      expect(result.error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE);
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

      await loadFilesForPath(`org_${ORG_ID}/shared/${HAUS}/path`);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_contents', {
        p_current_path: `org_${ORG_ID}/shared/${HAUS}/path`,
      });
      // The path is checked once (in getFolderContents), not a second time in the wrapper
      expect(getAccessibleHaeuserIds).toHaveBeenCalledTimes(1);
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

      const size = await getTotalStorageUsage();
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


      const result = await deleteFolder(`org_${ORG_ID}/shared/${HAUS}/folder`);

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

      const result = await deleteFolder(folderPath);

      expect(result).toEqual({ success: true });
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(folderMetadataFilter(folderPath));
      expect(mockQueryBuilder.like).not.toHaveBeenCalled();
      expect(mockStorageBuilder.remove).toHaveBeenNthCalledWith(1, [`${folderPath}/a.pdf`, `${folderPath}/2024/b.pdf`]);
    });

    it('refuses a folder below a house that does not exist in the organisation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });
      mockHouseQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await deleteFolder(`org_${ORG_ID}/shared/haus-erfunden/folder`);

      expect(result).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE });
      expect(mockQueryBuilder.or).not.toHaveBeenCalled();
      expect(mockStorageBuilder.remove).not.toHaveBeenCalled();
    });

    describe('refusals tell nothing about apartments, tenants or database internals', () => {
      const APARTMENT = '66666666-6666-4666-8666-666666666666'
      const TENANT = '11111111-1111-4111-8111-111111111111'
      const HOUSE_ID = 'haus-a'
      const apartmentFolder = `org_${ORG_ID}/shared/${HOUSE_ID}/${APARTMENT}`
      const user = () => mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null })
      const grant = (...granted: string[]) =>
        (hasPermission as jest.Mock).mockImplementation(async (modul: string, aktion: string) => granted.includes(`${modul}:${aktion}`))

      afterEach(() => {
        ;(hasPermission as jest.Mock).mockReset().mockResolvedValue(true)
        ;(getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null)
      })

      it('without wohnungen:ansehen an existing, an unknown and a deeper apartment folder get the same answer, and nothing is read', async () => {
        user()
        grant('dokumente:loeschen')
        // The apartment exists in the database: it must not make a difference
        mockQueryBuilder.maybeSingle.mockResolvedValue({ data: { id: APARTMENT, haus_id: HOUSE_ID }, error: null })

        const existing = await deleteFolder(apartmentFolder)
        const unknown = await deleteFolder(`org_${ORG_ID}/shared/${HOUSE_ID}/99999999-9999-4999-8999-999999999999`)
        const deeper = await deleteFolder(`${apartmentFolder}/Eigener Ordner`)
        const finance = await deleteFolder(`org_${ORG_ID}/shared/${HOUSE_ID}/Rechnungen/${APARTMENT}`)

        for (const result of [existing, unknown, deeper, finance]) {
          expect(result).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })
        }
        expect(mockQueryBuilder.maybeSingle).not.toHaveBeenCalled()
        expect(mockQueryBuilder.or).not.toHaveBeenCalled()
        expect(mockStorageBuilder.remove).not.toHaveBeenCalled()
      })

      it('every spelling of the id counts (upper case, no hyphens, braces)', async () => {
        user()
        grant('dokumente:loeschen')
        const letters = 'abcdefab-cdef-4abc-8def-abcdefabcdef'

        for (const id of [letters.toUpperCase(), letters.replace(/-/g, ''), `{${letters}}`]) {
          expect(await deleteFolder(`org_${ORG_ID}/shared/${HOUSE_ID}/${id}/Ordner`)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })
        }
        expect(mockStorageBuilder.remove).not.toHaveBeenCalled()
      })

      it('a tenant folder needs mieter:ansehen in addition', async () => {
        user()
        grant('dokumente:loeschen', 'wohnungen:ansehen')

        expect(await deleteFolder(`${apartmentFolder}/${TENANT}/Vertraege`)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })
        expect(mockStorageBuilder.remove).not.toHaveBeenCalled()
      })

      it('an apartment outside the object scope is answered with the same text, not with "Wohnung nicht im Scope"', async () => {
        user()
        grant('dokumente:loeschen', 'wohnungen:ansehen')
        mockQueryBuilder.maybeSingle.mockResolvedValue({ data: { id: APARTMENT, haus_id: HOUSE_ID }, error: null })
        ;(getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['00000000-0000-4000-8000-000000000000'])

        expect(await deleteFolder(apartmentFolder)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })
      })

      it('with the right the existing apartment folder keeps its own explanation', async () => {
        user()
        grant('dokumente:loeschen', 'wohnungen:ansehen')
        mockQueryBuilder.maybeSingle.mockResolvedValue({ data: { id: APARTMENT, haus_id: HOUSE_ID }, error: null })

        const result = await deleteFolder(apartmentFolder)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Wohnungsordner')
      })

      it('a refusal while listing or deleting becomes the same text, other database errors get a fixed text without the raw message', async () => {
        user()
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: { code: '42501', message: 'permission denied for table "Dokumente_Metadaten"' } }))
        expect(await deleteFolder(FOLDER_PATH)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })

        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: { message: 'connection to server at "db.internal" failed' } }))
        const listing = await deleteFolder(FOLDER_PATH)
        expect(listing.success).toBe(false)
        expect(listing.error).not.toContain('db.internal')

        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ dateipfad: FOLDER_PATH, dateiname: 'a.pdf' }], error: null }))
        mockStorageBuilder.remove.mockResolvedValueOnce({ data: null, error: { statusCode: '403', message: 'new row violates row-level security policy' } })
        expect(await deleteFolder(FOLDER_PATH)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })

        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ dateipfad: FOLDER_PATH, dateiname: 'a.pdf' }], error: null }))
        mockStorageBuilder.remove.mockResolvedValueOnce({ data: null, error: { message: 'socket hang up to storage.internal' } })
        const removal = await deleteFolder(FOLDER_PATH)
        expect(removal.success).toBe(false)
        expect(removal.error).not.toContain('storage.internal')
      })

      it('reports a file that storage did not remove (RLS gives no error, `data` stays empty) as refused, same text', async () => {
        user()
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({
          data: [{ dateipfad: FOLDER_PATH, dateiname: 'a.pdf' }, { dateipfad: FOLDER_PATH, dateiname: 'b.pdf' }],
          error: null,
        }))
        mockStorageBuilder.remove.mockResolvedValueOnce({ data: [{ name: `${FOLDER_PATH}/a.pdf` }], error: null })

        expect(await deleteFolder(FOLDER_PATH)).toEqual({ success: false, error: STORAGE_ACCESS_DENIED_MESSAGE })
      })

      it('an unexpected exception does not return its raw message, the sign-in message stays', async () => {
        user()
        mockQueryBuilder.then.mockImplementationOnce(() => { throw new Error('select * from "Wohnungen" exploded at 10.0.0.5') })
        const result = await deleteFolder(FOLDER_PATH)
        expect(result.success).toBe(false)
        expect(result.error).not.toContain('10.0.0.5')

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } })
        expect((await deleteFolder(FOLDER_PATH)).error).toBe('Nicht authentifiziert')
      })
    })

    it('should return error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await deleteFolder(`org_${ORG_ID}/shared/${HAUS}/folder`);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nicht authentifiziert');
    });

    it('should prevent deleting system folders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await deleteFolder(`org_${ORG_ID}/private/user123/Miscellaneous`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Systemordner');
    });

    it('should never delete the org root or a house folder', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      expect((await deleteFolder(`org_${ORG_ID}`)).success).toBe(false);
      expect((await deleteFolder(`org_${ORG_ID}/shared`)).success).toBe(false);
      const houseResult = await deleteFolder(`org_${ORG_ID}/shared/${HAUS}`);
      expect(houseResult.success).toBe(false);
      expect(houseResult.error).toContain('Systemordner');
      expect(mockStorageBuilder.remove).not.toHaveBeenCalled();
    });
  });
});
