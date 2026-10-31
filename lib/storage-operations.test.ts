/**
 * Unit tests for the server-side storage operations (GH-27, option A)
 */

import {
  archiveFile,
  archiveFolder,
  bulkArchiveFiles,
  completeUpload,
  copyFile,
  createPlaceholder,
  createSignedUrls,
  listArchivedFiles,
  listFiles,
  moveFile,
  moveFolder,
  prepareUpload,
  removeFiles,
  renameFile,
  restoreFile,
} from './storage-operations';
import { folderMetadataFilter, assertPathAllowed } from './storage-paths';
import { pathUtils } from './path-utils';
import { STORAGE_ACCESS_DENIED_MESSAGE } from './storage-messages';

// Mock functions
const mockCreateSignedUploadUrl = jest.fn();
const mockInfo = jest.fn();
const mockUpload = jest.fn();
const mockList = jest.fn();
const mockExists = jest.fn();
const mockMove = jest.fn();
const mockCopy = jest.fn();
const mockRemove = jest.fn();
const mockCreateSignedUrls = jest.fn();
const mockGetUser = jest.fn();
const mockRpc = jest.fn();
let mockDefaultSingle: { data: unknown; error: unknown } = { data: null, error: null };
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockRange = jest.fn();
const mockLike = jest.fn();
const mockOr = jest.fn();
const mockIlike = jest.fn();
/** Lookup of a house in Haeuser (write mode: the house must exist in the active organisation) */
const mockHouseLookup = jest.fn();

// The server client of the operations: ensureAuth hands out the client and the signed-in user
jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn(async () => {
    const {
      data: { user },
      error,
    } = await mockGetUser();
    if (error || !user) throw new Error('Nicht authentifiziert');
    // Helper to allow chaining
    const queryBuilder = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: jest.fn().mockReturnThis(),
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      limit: mockLimit,
      range: mockRange,
      like: mockLike,
      ilike: mockIlike,
      or: mockOr,
    };

    // Make functions return the builder for chaining
    mockSelect.mockReturnValue(queryBuilder);
    mockUpdate.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSingle.mockReturnValue(Promise.resolve(mockDefaultSingle));
    mockOrder.mockReturnValue(queryBuilder);
    mockLimit.mockReturnValue(queryBuilder);
    mockRange.mockReturnValue(Promise.resolve({ data: [], error: null }));
    mockIlike.mockResolvedValue({ data: [], error: null });

    const houseBuilder = { select: () => ({ eq: () => ({ maybeSingle: mockHouseLookup }) }) };

    return {
      user,
      supabase: {
        rpc: mockRpc,
        storage: {
          from: jest.fn(() => ({
            createSignedUploadUrl: mockCreateSignedUploadUrl,
            info: mockInfo,
            upload: mockUpload,
            list: mockList,
            exists: mockExists,
            move: mockMove,
            copy: mockCopy,
            remove: mockRemove,
            createSignedUrls: mockCreateSignedUrls,
          })),
        },
        from: jest.fn((table: string) => (table === 'Haeuser' ? houseBuilder : queryBuilder)),
      },
    };
  }),
}));

// Records which paths the access check saw (behaviour stays the real one)
jest.mock('./storage-paths', () => {
  const actual = jest.requireActual('./storage-paths');
  return { ...actual, assertPathAllowed: jest.fn(actual.assertPathAllowed) };
});

// Mock path utils
jest.mock('./path-utils', () => ({
  pathUtils: {
    sanitizePath: jest.fn((path) => path),
    buildUserPath: jest.fn((...args) => args.join('/'))
  },
  isKeepFile: jest.fn((name: string) => name === '.keep'),
  validatePath: jest.fn(() => true),
  isUserPath: jest.fn(() => true)
}));

function mockOrgScope(houseIds: string[] | null = null) {
  mockRpc.mockImplementation((name: string) => {
    if (name === 'current_organisation_id') return Promise.resolve({ data: 'org1', error: null });
    if (name === 'get_accessible_haeuser_ids') return Promise.resolve({ data: houseIds, error: null });
    return Promise.resolve({ data: null, error: null });
  });
}

/** Default behaviour of all mocks of the operations (the describes below start from it) */
function resetDefaults() {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null });
  mockOrgScope(null);
  mockHouseLookup.mockResolvedValue({ data: { id: 'house456' }, error: null });
  mockCreateSignedUploadUrl.mockResolvedValue({ data: { token: 'tok-1', signedUrl: 'u', path: 'p' }, error: null });
  mockInfo.mockResolvedValue({ data: { size: 1024, contentType: 'application/pdf' }, error: null });
  mockUpload.mockResolvedValue({ data: { path: 'x' }, error: null });
  mockMove.mockResolvedValue({ error: null });
  mockCopy.mockResolvedValue({ error: null });
  mockExists.mockResolvedValue({ data: true, error: null });
  mockRemove.mockResolvedValue({ error: null });
  mockCreateSignedUrls.mockImplementation((paths: string[]) =>
    Promise.resolve({ data: paths.map((path) => ({ path, signedUrl: `https://example.com/${path}`, error: null })), error: null }),
  );
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockResolvedValue({ error: null });
  mockDefaultSingle = { data: null, error: null };
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterAll(() => {
  jest.restoreAllMocks();
});

const HOUSE = 'org_org1/shared/house456';

describe('prepareUpload', () => {
  beforeEach(resetDefaults);

  it('returns the checked path and a token for exactly this path', async () => {
    const target = await prepareUpload(`${HOUSE}/x.pdf`);

    expect(target).toEqual({ path: `${HOUSE}/x.pdf`, token: 'tok-1' });
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(`${HOUSE}/x.pdf`, { upsert: false });
  });

  it('only passes upsert on when it is true', async () => {
    await prepareUpload(`${HOUSE}/x.pdf`, { upsert: true });
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(`${HOUSE}/x.pdf`, { upsert: true });
  });

  it('lets a user write into the own private folder but not into a foreign one', async () => {
    await expect(prepareUpload('org_org1/private/test-user-123/a.pdf')).resolves.toBeDefined();
    await expect(prepareUpload('org_org1/private/someone-else/a.pdf')).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledTimes(1);
  });

  it('refuses a foreign organisation, legacy paths and traversal without issuing a token', async () => {
    for (const path of [
      'org_other/shared/house456/x.pdf',
      'user_test-user-123/haus/x.pdf',
      `${HOUSE}/../house999/x.pdf`,
      `${HOUSE}/./x.pdf`,
    ]) {
      await expect(prepareUpload(path)).rejects.toBeDefined();
    }
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('refuses a house outside the scope of the user', async () => {
    mockOrgScope(['other-house']);
    await expect(prepareUpload(`${HOUSE}/x.pdf`)).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('refuses a house that does not exist in the active organisation (also for an unrestricted user)', async () => {
    mockOrgScope(null);
    mockHouseLookup.mockResolvedValue({ data: null, error: null });
    await expect(prepareUpload('org_org1/shared/invented-house/x.pdf')).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('looks a house up once per operation, not once per path', async () => {
    mockOrgScope(null);
    await bulkArchiveFiles([`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`]);
    expect(mockHouseLookup).toHaveBeenCalledTimes(1);
  });

  it.each(['org_org1', 'org_org1/shared', 'org_org1/private'])('refuses every write at the root %s', async (root) => {
    await expect(prepareUpload(root)).rejects.toBeDefined();
    await expect(createPlaceholder(root)).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('refuses uploads into an archive', async () => {
    await expect(prepareUpload(`${HOUSE}/__archive__/2026-10-29T10-00-00-000Z/x.pdf`)).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('fails when storage refuses the token (the policies probe the insert)', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } });
    await expect(prepareUpload(`${HOUSE}/x.pdf`)).rejects.toThrow('Upload konnte nicht vorbereitet werden');
  });
});

describe('completeUpload', () => {
  beforeEach(resetDefaults);

  it('takes size and type from storage and writes the metadata of the same path', async () => {
    mockInfo.mockResolvedValue({ data: { size: 2048, contentType: 'application/pdf' }, error: null });

    const result = await completeUpload(`${HOUSE}/Ordner/x.pdf`);

    expect(result).toEqual({ path: `${HOUSE}/Ordner/x.pdf`, size: 2048, mimeType: 'application/pdf' });
    expect(mockInfo).toHaveBeenCalledWith(`${HOUSE}/Ordner/x.pdf`);
    expect(mockInsert).toHaveBeenCalledWith({
      dateipfad: `${HOUSE}/Ordner`,
      dateiname: 'x.pdf',
      dateigroesse: 2048,
      mime_type: 'application/pdf',
    });
  });

  it('updates the row of an existing file (upsert)', async () => {
    mockDefaultSingle = { data: { id: 'doc-1' }, error: null };
    await completeUpload(`${HOUSE}/x.pdf`);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ dateigroesse: 1024, mime_type: 'application/pdf' }));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('removes a file that is too large for the rules (the size of the client is never trusted)', async () => {
    mockInfo.mockResolvedValue({ data: { size: 11 * 1024 * 1024, contentType: 'application/pdf' }, error: null });
    await expect(completeUpload(`${HOUSE}/x.pdf`)).rejects.toThrow('exceeds maximum allowed size');
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/x.pdf`]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('keeps the file of an overwrite (upsert) that breaks the rules: an existing file is never deleted', async () => {
    mockInfo.mockResolvedValue({ data: { size: 10, contentType: 'application/x-executable' }, error: null });
    await expect(completeUpload(`${HOUSE}/x.pdf`, { upsert: true })).rejects.toThrow('is not supported');
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps the file if a metadata row already exists, whatever the client says about upsert', async () => {
    mockDefaultSingle = { data: { id: 'doc-1' }, error: null };
    mockInfo.mockResolvedValue({ data: { size: 11 * 1024 * 1024, contentType: 'application/pdf' }, error: null });
    await expect(completeUpload(`${HOUSE}/x.pdf`, { upsert: false })).rejects.toThrow('exceeds maximum allowed size');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('keeps the file of an overwrite whose metadata cannot be stored', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    await expect(completeUpload(`${HOUSE}/x.pdf`, { upsert: true })).rejects.toThrow('Failed to save file metadata');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('refuses uploads into an archive', async () => {
    await expect(completeUpload(`${HOUSE}/__archive__/2026-10-29T10-00-00-000Z/a.pdf`)).rejects.toBeDefined();
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it('removes a file of an unsupported type', async () => {
    mockInfo.mockResolvedValue({ data: { size: 10, contentType: 'application/x-executable' }, error: null });
    await expect(completeUpload(`${HOUSE}/x.exe`)).rejects.toThrow('is not supported');
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/x.exe`]);
  });

  it('removes the object again when the metadata cannot be stored', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    await expect(completeUpload(`${HOUSE}/x.pdf`)).rejects.toThrow('Failed to save file metadata');
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/x.pdf`]);
  });

  it('fails if there is no uploaded object', async () => {
    mockInfo.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    await expect(completeUpload(`${HOUSE}/x.pdf`)).rejects.toThrow('nicht gefunden');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('refuses paths outside the scope before it reads or removes anything', async () => {
    mockOrgScope(['other-house']);
    await expect(completeUpload(`${HOUSE}/x.pdf`)).rejects.toBeDefined();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('asks the auth service for the user only once', async () => {
    await prepareUpload(`${HOUSE}/x.pdf`);
    expectOneContext();
  });
});

describe('createSignedUrls', () => {
  beforeEach(resetDefaults);

  it('creates a URL per path with the default lifetime', async () => {
    const result = await createSignedUrls([`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`]);

    expect(result).toEqual([
      { path: `${HOUSE}/a.pdf`, url: `https://example.com/${HOUSE}/a.pdf` },
      { path: `${HOUSE}/b.pdf`, url: `https://example.com/${HOUSE}/b.pdf` },
    ]);
    expect(mockCreateSignedUrls).toHaveBeenCalledWith([`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`], 300, undefined);
  });

  it('caps the lifetime and replaces nonsense with the default', async () => {
    await createSignedUrls([`${HOUSE}/a.pdf`], { expiresIn: 10 * 365 * 24 * 3600 });
    await createSignedUrls([`${HOUSE}/a.pdf`], { expiresIn: Number.NaN });
    await createSignedUrls([`${HOUSE}/a.pdf`], { expiresIn: -5 });
    expect(mockCreateSignedUrls.mock.calls.map((call) => call[1])).toEqual([7 * 24 * 3600, 300, 300]);
  });

  it('passes the download option on', async () => {
    await createSignedUrls([`${HOUSE}/a.pdf`], { expiresIn: 60, download: 'Vertrag.pdf' });
    expect(mockCreateSignedUrls).toHaveBeenCalledWith([`${HOUSE}/a.pdf`], 60, { download: 'Vertrag.pdf' });
  });

  it('gives no URL for a path that is not allowed and signs only the others', async () => {
    mockOrgScope(['house456']);
    const result = await createSignedUrls([`${HOUSE}/a.pdf`, 'org_org1/shared/other-house/b.pdf', 'org_other/shared/h/c.pdf']);

    expect(mockCreateSignedUrls).toHaveBeenCalledWith([`${HOUSE}/a.pdf`], 300, undefined);
    expect(result[0].url).toContain('a.pdf');
    expect(result[1]).toEqual({ path: 'org_org1/shared/other-house/b.pdf', url: null, error: STORAGE_ACCESS_DENIED_MESSAGE });
    expect(result[2]).toEqual({ path: 'org_other/shared/h/c.pdf', url: null, error: STORAGE_ACCESS_DENIED_MESSAGE });
  });

  it('validates the stored path as it is and does not rewrite it', async () => {
    const stored = `${HOUSE}/Bericht: Q1/x.pdf`;
    await createSignedUrls([stored]);
    expect(pathUtils.sanitizePath).not.toHaveBeenCalled();
    expect(mockCreateSignedUrls).toHaveBeenCalledWith([stored], 300, undefined);
  });

  it('calls nothing for an empty list', async () => {
    expect(await createSignedUrls([])).toEqual([]);
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe('removeFiles', () => {
  beforeEach(resetDefaults);

  it('removes the allowed paths in one call and reports the denied ones', async () => {
    mockOrgScope(['house456']);
    const result = await removeFiles([`${HOUSE}/a.pdf`, 'org_org1/shared/other-house/b.pdf', `${HOUSE}/c.pdf`]);

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/a.pdf`, `${HOUSE}/c.pdf`]);
    expect(result).toEqual({
      removed: [`${HOUSE}/a.pdf`, `${HOUSE}/c.pdf`],
      denied: ['org_org1/shared/other-house/b.pdf'],
    });
  });

  it('looks up a house once even though its paths are validated concurrently', async () => {
    mockOrgScope(['house456']);
    await removeFiles([`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`, `${HOUSE}/c.pdf`]);

    expect(mockHouseLookup).toHaveBeenCalledTimes(1);
  });

  it('removes nothing if every path is denied', async () => {
    const result = await removeFiles(['org_other/shared/h/a.pdf', 'org_org1/shared']);
    expect(mockRemove).not.toHaveBeenCalled();
    expect(result.removed).toEqual([]);
    expect(result.denied).toHaveLength(2);
  });

  it('accepts only archived paths with onlyArchived', async () => {
    const archived = `${HOUSE}/__archive__/2026-10-29T10-00-00-000Z/wohnung1/x.pdf`;
    const result = await removeFiles([`${HOUSE}/wohnung1/x.pdf`, archived], { onlyArchived: true });
    expect(mockRemove).toHaveBeenCalledWith([archived]);
    expect(result.denied).toEqual([`${HOUSE}/wohnung1/x.pdf`]);
  });

  it('fails if storage fails', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'boom' } });
    await expect(removeFiles([`${HOUSE}/a.pdf`])).rejects.toThrow('Failed to delete files: boom');
  });

  it('calls nothing for an empty list', async () => {
    expect(await removeFiles([])).toEqual({ removed: [], denied: [] });
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe('copyFile', () => {
  beforeEach(() => {
    resetDefaults();
    mockDefaultSingle = { data: { dateigroesse: 500, mime_type: 'application/pdf' }, error: null };
  });

  it('copies the object and creates the metadata row of the copy', async () => {
    // First lookup: the row of the source, second: no row of the target yet
    mockSingle.mockResolvedValueOnce({ data: { dateigroesse: 500, mime_type: 'application/pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await copyFile(`${HOUSE}/a.pdf`, `${HOUSE}/Kopie/a.pdf`);

    expect(mockCopy).toHaveBeenCalledWith(`${HOUSE}/a.pdf`, `${HOUSE}/Kopie/a.pdf`);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ dateipfad: `${HOUSE}/Kopie`, dateiname: 'a.pdf', dateigroesse: 500, mime_type: 'application/pdf' }),
    );
  });

  it('checks source and target', async () => {
    mockOrgScope(['house456']);
    await expect(copyFile(`${HOUSE}/a.pdf`, 'org_org1/shared/other-house/a.pdf')).rejects.toBeDefined();
    await expect(copyFile('org_org1/shared/other-house/a.pdf', `${HOUSE}/a.pdf`)).rejects.toBeDefined();
    await expect(copyFile(`${HOUSE}/__archive__/2026-10-29T10-00-00-000Z/a.pdf`, `${HOUSE}/a.pdf`)).rejects.toBeDefined();
    await expect(copyFile(`${HOUSE}/a.pdf`, `${HOUSE}/__archive__/2026-10-29T10-00-00-000Z/a.pdf`)).rejects.toBeDefined();
    expect(mockCopy).not.toHaveBeenCalled();
  });

  it('removes the copy again when its metadata cannot be stored', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    mockSingle.mockResolvedValueOnce({ data: { dateigroesse: 500, mime_type: 'application/pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(copyFile(`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`)).rejects.toThrow('Failed to save file metadata');
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/b.pdf`]);
  });

  it('fails without a metadata row of the source', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'no rows' } });
    await expect(copyFile(`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`)).rejects.toThrow('Source file not found');
    expect(mockCopy).not.toHaveBeenCalled();
  });
});

describe('createPlaceholder', () => {
  beforeEach(resetDefaults);

  it('creates the placeholder with metadata below the folder', async () => {
    await createPlaceholder('org_org1/private/test-user-123/empty-folder');

    expect(mockUpload).toHaveBeenCalledWith(
      'org_org1/private/test-user-123/empty-folder/.keep',
      expect.anything(),
      { upsert: true, contentType: 'text/plain' },
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ dateipfad: 'org_org1/private/test-user-123/empty-folder', dateiname: '.keep', dateigroesse: 0 }),
    );
  });
});

describe('writes never reach `__archive__` or a folder root (only archiveFile/restoreFile move there)', () => {
  const ARCHIVE = `${HOUSE}/__archive__/2026-10-29T10-00-00-000Z`;

  beforeEach(() => {
    resetDefaults();
    mockOrgScope(['house456']);
  });

  afterEach(() => {
    expect(mockMove).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('moveFile: neither out of nor into an archive', async () => {
    await expect(moveFile(`${ARCHIVE}/a.pdf`, `${HOUSE}/a.pdf`)).rejects.toBeDefined();
    await expect(moveFile(`${HOUSE}/a.pdf`, `${ARCHIVE}/a.pdf`)).rejects.toBeDefined();
  });

  it('renameFile: not a file in an archive', async () => {
    await expect(renameFile(`${ARCHIVE}/a.pdf`, 'b.pdf')).rejects.toBeDefined();
  });

  it('createPlaceholder: not in an archive', async () => {
    await expect(createPlaceholder(`${ARCHIVE}/Neu`)).rejects.toBeDefined();
    await expect(createPlaceholder(`${HOUSE}/__archive__`)).rejects.toBeDefined();
  });

  it('prepareUpload: not in an archive', async () => {
    await expect(prepareUpload(`${ARCHIVE}/a.pdf`)).rejects.toBeDefined();
  });

  it('moveFolder: not the archive, not into it and not the root folder of a house or of the private zone', async () => {
    await expect(moveFolder(`${HOUSE}/__archive__`, `${HOUSE}/Archiv`)).rejects.toBeDefined();
    await expect(moveFolder(`${ARCHIVE}/Ordner`, `${HOUSE}/Ordner`)).rejects.toBeDefined();
    await expect(moveFolder(`${HOUSE}/Ordner`, `${ARCHIVE}/Ordner`)).rejects.toBeDefined();
    await expect(moveFolder(HOUSE, 'org_org1/shared/house456b')).rejects.toBeDefined();
    await expect(moveFolder('org_org1/private/test-user-123', `${HOUSE}/Privat`)).rejects.toBeDefined();
    expect(mockOr).not.toHaveBeenCalled();
  });
});

describe('listFiles', () => {
  beforeEach(resetDefaults);

  it('lets a user with house scope read the shared root and the private root', async () => {
    mockOrgScope(['house456']);
    mockOrder.mockResolvedValue({ data: [], error: null });
    await expect(listFiles('org_org1/shared')).resolves.toBeDefined();
    await expect(listFiles('org_org1/private')).resolves.toBeDefined();
    await expect(listFiles('org_org1')).resolves.toBeDefined();
  });

  it('still refuses reading a house outside the scope', async () => {
    mockOrgScope(['house456']);
    await expect(listFiles('org_org1/shared/other-house')).rejects.toBeDefined();
  });

  it('validates the stored folder path as it is and does not rewrite it', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    await listFiles(`${HOUSE}/Bericht: Q1`);
    expect(pathUtils.sanitizePath).not.toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('dateipfad', `${HOUSE}/Bericht: Q1`);
  });
});

describe('prepareUpload and createPlaceholder normalisation', () => {
  const realSanitizePath = jest.requireActual('./path-utils').pathUtils.sanitizePath;

  beforeEach(() => {
    resetDefaults();
    mockOrgScope(['house456']);
    // The module mock is an identity function: use the real sanitizer for these tests
    (pathUtils.sanitizePath as jest.Mock).mockImplementation(realSanitizePath);
  });

  afterEach(() => {
    (pathUtils.sanitizePath as jest.Mock).mockImplementation((path) => path);
  });

  it('upload: the checked path and the path of the token are the same string', async () => {
    const target = await prepareUpload(`${HOUSE}/Bericht: Q1/x.pdf`);

    const checkedPaths = (assertPathAllowed as jest.Mock).mock.calls.map(([path]) => path);
    expect(checkedPaths).toEqual([`${HOUSE}/Bericht Q1/x.pdf`]);
    expect(target.path).toBe(checkedPaths[0]);
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(checkedPaths[0], expect.anything());
  });

  it('upload: refuses a normalised path that leaves the allowed area', async () => {
    mockOrgScope(['other-house']);
    await expect(prepareUpload(`${HOUSE}/Bericht: Q1/x.pdf`)).rejects.toBeDefined();
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('createPlaceholder: validates and uploads below the normalised folder', async () => {
    await createPlaceholder(`${HOUSE}/Neuer: Ordner?`);

    const checkedPaths = (assertPathAllowed as jest.Mock).mock.calls.map(([path]) => path);
    expect(checkedPaths).toContain(`${HOUSE}/Neuer Ordner`);
    expect(mockUpload).toHaveBeenCalledWith(`${HOUSE}/Neuer Ordner/.keep`, expect.anything(), expect.anything());
  });
});

/** One access context = one auth lookup and one call each of the two scope RPCs */
function expectOneContext() {
  expect(mockGetUser).toHaveBeenCalledTimes(1);
  expect(mockRpc.mock.calls.map(([name]) => name).sort()).toEqual(['current_organisation_id', 'get_accessible_haeuser_ids']);
}

describe('Storage Service archive (zone layout)', () => {
  beforeEach(() => {
    resetDefaults();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null });
    mockOrgScope(['house456']);
    mockMove.mockResolvedValue({ error: null });
    // moveFile looks up the source file in Dokumente_Metadaten first
    mockDefaultSingle = { data: { id: 'doc-1', dateiname: 'x.pdf', dateipfad: 'dir' }, error: null };
  });

  afterEach(() => {
    mockDefaultSingle = { data: null, error: null };
  });

  it('archives a shared file inside the house zone', async () => {
    const archived = await archiveFile('org_org1/shared/house456/wohnung1/x.pdf');
    expect(archived).toMatch(/^org_org1\/shared\/house456\/__archive__\/[^/]+\/wohnung1\/x\.pdf$/);
    expect(mockMove).toHaveBeenCalledWith('org_org1/shared/house456/wohnung1/x.pdf', archived);
  });

  it('archives a private file inside the private zone', async () => {
    const archived = await archiveFile('org_org1/private/test-user-123/Notizen/a.md');
    expect(archived).toMatch(/^org_org1\/private\/test-user-123\/__archive__\/[^/]+\/Notizen\/a\.md$/);
  });

  it('refuses to archive a file in a house the user cannot access', async () => {
    mockOrgScope(['other-house']);
    await expect(archiveFile('org_org1/shared/house456/wohnung1/x.pdf')).rejects.toThrow();
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('restores an archived file to its original path', async () => {
    await restoreFile('org_org1/shared/house456/__archive__/2026-10-29T10-00-00-000Z/wohnung1/x.pdf');
    expect(mockMove).toHaveBeenCalledWith(
      'org_org1/shared/house456/__archive__/2026-10-29T10-00-00-000Z/wohnung1/x.pdf',
      'org_org1/shared/house456/wohnung1/x.pdf',
    );
  });

  it('rejects restore of a path that is not in an archive', async () => {
    await expect(restoreFile('org_org1/shared/house456/wohnung1/x.pdf')).rejects.toThrow('File is not in archive');
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('refuses legacy user_ paths', async () => {
    await expect(archiveFile('user_test-user-123/haus/x.pdf')).rejects.toThrow();
    expect(mockMove).not.toHaveBeenCalled();
  });
});

describe('Storage Service write checks', () => {
  beforeEach(() => {
    resetDefaults();
    mockDefaultSingle = { data: { id: 'doc-1', dateiname: 'x.pdf', dateipfad: 'dir' }, error: null };
  });

  it.each(['org_org1', 'org_org1/shared', 'org_org1/private'])('moveFile refuses every write at the root %s', async (root) => {
    await expect(moveFile(root, `${HOUSE}/x.pdf`)).rejects.toBeDefined();
    await expect(moveFile(`${HOUSE}/x.pdf`, root)).rejects.toBeDefined();
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('removeFiles checks the path before it removes anything', async () => {
    mockOrgScope(['house456']);
    expect((await removeFiles(['org_org1/shared/other-house/x.pdf'])).denied).toHaveLength(1);
    expect(mockRemove).not.toHaveBeenCalled();
    await removeFiles([`${HOUSE}/x.pdf`]);
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/x.pdf`]);
  });

  it('renameFile validates the new name before it moves', async () => {
    mockOrgScope(null);
    await expect(renameFile(`${HOUSE}/x.pdf`, '../y.pdf')).rejects.toBeDefined();
    await expect(renameFile(`${HOUSE}/x.pdf`, 'a/b.pdf')).rejects.toBeDefined();
    expect(mockMove).not.toHaveBeenCalled();
    await renameFile(`${HOUSE}/x.pdf`, 'Vertrag..pdf');
    expect(mockMove).toHaveBeenCalledWith(`${HOUSE}/x.pdf`, `${HOUSE}/Vertrag..pdf`);
  });

  it('moveFile rolls the metadata back when the object is not at the target afterwards', async () => {
    mockExists.mockResolvedValue({ data: false, error: null });
    await expect(moveFile(`${HOUSE}/x.pdf`, `${HOUSE}/y.pdf`)).rejects.toThrow('Move operation verification failed');
    // update 1: metadata to the target, update 2: rollback to the source
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('moveFile falls back to copy + remove when the direct move reports an error', async () => {
    mockMove.mockResolvedValue({ error: { message: 'move failed' } });
    mockExists.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValue({ data: true, error: null });
    await moveFile(`${HOUSE}/x.pdf`, `${HOUSE}/y.pdf`);
    expect(mockCopy).toHaveBeenCalledWith(`${HOUSE}/x.pdf`, `${HOUSE}/y.pdf`);
    expect(mockRemove).toHaveBeenCalledWith([`${HOUSE}/x.pdf`]);
  });
});

describe('Storage Service listArchivedFiles', () => {
  const row = (dateipfad: string, dateiname: string, id = `${dateipfad}/${dateiname}`) => ({
    id,
    dateipfad,
    dateiname,
    dateigroesse: 1,
    mime_type: 'text/plain',
  });
  const ARCHIVE = '__archive__/2026-10-29T10-00-00-000Z';

  /** Replaces the query chain of `.like(...)` so that every pattern gets its own rows, delivered page by page */
  function mockArchiveRows(rowsFor: (pattern: string) => unknown[]) {
    mockLike.mockImplementation((_column: string, pattern: string) => ({
      order: () => ({
        range: (from: number, to: number) =>
          Promise.resolve({ data: rowsFor(pattern).slice(from, to + 1), error: null }),
      }),
    }));
  }

  beforeEach(() => {
    resetDefaults();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null });
  });

  it('runs one shared and one private query (not one per house) and filters by house scope', async () => {
    mockOrgScope(['house456']);
    mockArchiveRows((pattern) =>
      pattern.startsWith('org\\_org1/shared/')
        ? [
            row(`org_org1/shared/house456/${ARCHIVE}/wohnung1`, 'a.pdf'),
            row(`org_org1/shared/house456/${ARCHIVE}/wohnung1`, '.keep'),
            row(`org_org1/shared/other-house/${ARCHIVE}/wohnung1`, 'b.pdf'),
            row(`org_org1/shared/house456/Ordner/${ARCHIVE}`, 'c.pdf'),
          ]
        : [
            row(`org_org1/private/test-user-123/${ARCHIVE}/Notizen`, 'n.md'),
            row(`org_org1/private/other-user/${ARCHIVE}/Notizen`, 'x.md'),
          ],
    );

    const result = await listArchivedFiles();

    expect(mockLike).toHaveBeenCalledTimes(2);
    // `_` of the literal parts is escaped, only the house level is a wildcard
    expect(mockLike).toHaveBeenCalledWith('dateipfad', 'org\\_org1/shared/%/\\_\\_archive\\_\\_/%');
    expect(mockLike).toHaveBeenCalledWith('dateipfad', 'org\\_org1/private/test-user-123/\\_\\_archive\\_\\_/%');
    expect(result.map((item) => item.path).sort()).toEqual([
      `org_org1/private/test-user-123/${ARCHIVE}/Notizen/n.md`,
      `org_org1/shared/house456/${ARCHIVE}/wohnung1/a.pdf`,
    ]);
  });

  it('returns all houses for an unrestricted user', async () => {
    mockOrgScope(null);
    mockArchiveRows((pattern) =>
      pattern.startsWith('org\\_org1/shared/')
        ? [row(`org_org1/shared/house-a/${ARCHIVE}`, 'a.pdf'), row(`org_org1/shared/house-b/${ARCHIVE}`, 'b.pdf')]
        : [],
    );

    expect(await listArchivedFiles()).toHaveLength(2);
  });

  it('does not stop at 1000 rows but reads the next pages', async () => {
    mockOrgScope(null);
    const many = Array.from({ length: 1001 }, (_, index) =>
      row(`org_org1/shared/house-a/${ARCHIVE}/ordner`, `datei-${index}.pdf`, `id-${index}`),
    );
    mockArchiveRows((pattern) => (pattern.startsWith('org\\_org1/shared/') ? many : []));

    expect(await listArchivedFiles()).toHaveLength(1001);
  });

  it('takes the user from the session: the private archive is always the own one', async () => {
    mockOrgScope(null);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null });
    mockArchiveRows(() => []);

    await listArchivedFiles();

    expect(mockLike).toHaveBeenCalledWith('dateipfad', 'org\\_org1/private/someone-else/\\_\\_archive\\_\\_/%');
  });
});

describe('Storage Service moveFolder', () => {
  const FOLDER = 'org_org1/shared/house456/Foo';

  beforeEach(() => {
    resetDefaults();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null });
    mockOrgScope(['house456']);
    mockMove.mockResolvedValue({ error: null });
    mockDefaultSingle = { data: { id: 'doc-1', dateiname: 'x.pdf', dateipfad: 'dir' }, error: null };
  });

  afterEach(() => {
    mockDefaultSingle = { data: null, error: null };
  });

  it('fails if the folder cannot be scanned instead of reporting a move of an "empty" folder', async () => {
    mockOr.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    await expect(moveFolder(FOLDER, 'org_org1/shared/house456/Bar')).rejects.toThrow('Could not scan folder');
    expect(mockMove).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('moves exactly the files of the folder and its sub-folders, not those of a sibling with the same prefix', async () => {
    // Rows of the sibling folders are delivered on purpose (a literal `*` in a name would let PostgREST match them)
    mockOr.mockResolvedValue({
      data: [
        { dateipfad: FOLDER, dateiname: 'a.pdf' },
        { dateipfad: `${FOLDER}/Sub`, dateiname: 'b.pdf' },
        { dateipfad: `${FOLDER}bar`, dateiname: 'c.pdf' },
        { dateipfad: `${FOLDER}_x/Sub`, dateiname: 'd.pdf' },
      ],
      error: null,
    });

    await moveFolder(FOLDER, 'org_org1/shared/house456/Bar');

    expect(mockOr).toHaveBeenCalledWith(folderMetadataFilter(FOLDER));
    expect(mockLike).not.toHaveBeenCalled();
    expect(mockMove.mock.calls).toEqual([
      [`${FOLDER}/a.pdf`, 'org_org1/shared/house456/Bar/a.pdf'],
      [`${FOLDER}/Sub/b.pdf`, 'org_org1/shared/house456/Bar/Sub/b.pdf'],
    ]);
  });
});

describe('Storage Service access context (one per operation)', () => {
  const HOUSE = 'org_org1/shared/house456';
  const ARCHIVE = `${HOUSE}/__archive__/2026-10-29T10-00-00-000Z`;

  beforeEach(() => {
    resetDefaults();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null });
    mockOrgScope(['house456']);
    mockMove.mockResolvedValue({ error: null });
    mockUpload.mockResolvedValue({ data: { path: 'x' }, error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockDefaultSingle = { data: { id: 'doc-1', dateiname: 'x.pdf', dateipfad: 'dir' }, error: null };
  });

  afterEach(() => {
    mockDefaultSingle = { data: null, error: null };
  });

  it('archiveFile', async () => {
    await archiveFile(`${HOUSE}/wohnung1/x.pdf`);
    expectOneContext();
  });

  it('restoreFile', async () => {
    await restoreFile(`${ARCHIVE}/wohnung1/x.pdf`);
    expectOneContext();
  });

  it('renameFile', async () => {
    await renameFile(`${HOUSE}/x.pdf`, 'y.pdf');
    expectOneContext();
  });

  it('moveFile', async () => {
    await moveFile(`${HOUSE}/x.pdf`, `${HOUSE}/Neu/x.pdf`);
    expectOneContext();
  });

  it('bulkArchiveFiles: one context for all files', async () => {
    const archived = await bulkArchiveFiles([`${HOUSE}/a.pdf`, `${HOUSE}/b.pdf`, `${HOUSE}/c.pdf`]);
    expect(archived).toHaveLength(3);
    expect(mockMove).toHaveBeenCalledTimes(3);
    expectOneContext();
  });

  it('bulkArchiveFiles: nothing to do builds no context', async () => {
    expect(await bulkArchiveFiles([])).toEqual([]);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('bulkArchiveFiles: every file is still checked against the scope', async () => {
    const archived = await bulkArchiveFiles([`${HOUSE}/a.pdf`, 'org_org1/shared/other-house/b.pdf', `${HOUSE}/c.pdf`]);
    expect(archived).toHaveLength(2);
    expect(mockMove).toHaveBeenCalledTimes(2);
    expectOneContext();
  });

  it('moveFolder: one context for all files', async () => {
    mockOr.mockResolvedValue({
      data: [
        { dateipfad: `${HOUSE}/Foo`, dateiname: 'a.pdf' },
        { dateipfad: `${HOUSE}/Foo/Sub`, dateiname: 'b.pdf' },
        { dateipfad: `${HOUSE}/Foo/Sub`, dateiname: 'c.pdf' },
      ],
      error: null,
    });
    await moveFolder(`${HOUSE}/Foo`, `${HOUSE}/Bar`);
    expect(mockMove).toHaveBeenCalledTimes(3);
    expectOneContext();
  });

  it('moveFolder: a target outside the scope is refused before anything moves', async () => {
    await expect(moveFolder(`${HOUSE}/Foo`, 'org_org1/shared/other-house/Bar')).rejects.toBeDefined();
    expect(mockMove).not.toHaveBeenCalled();
    expect(mockOr).not.toHaveBeenCalled();
  });

  it('createPlaceholder: folder check and upload share one context', async () => {
    await createPlaceholder(`${HOUSE}/Neu`);
    expect(mockUpload).toHaveBeenCalled();
    expectOneContext();
  });

  it('archiveFolder: folder check, listing and the archiving of every file share one context', async () => {
    // listFiles reads the folder through `.order(...)`: two files and the placeholder
    mockOrder.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { id: '1', dateiname: 'a.pdf', dateigroesse: 1, mime_type: 'application/pdf' },
          { id: '2', dateiname: 'b.pdf', dateigroesse: 1, mime_type: 'application/pdf' },
          { id: '3', dateiname: '.keep', dateigroesse: 0, mime_type: 'text/plain' },
        ],
        error: null,
      }),
    );
    const archived = await archiveFolder(`${HOUSE}/Foo`);
    expect(archived).toHaveLength(2);
    expect(mockMove).toHaveBeenCalledTimes(2);
    expectOneContext();
  });
});
