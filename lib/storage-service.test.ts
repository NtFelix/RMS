/**
 * Unit tests for the browser side of the storage service: every operation is a server action,
 * only the byte transfer of an upload runs in the browser with a signed upload token
 */

import {
  validateFile,
  uploadFile,
  listFiles,
  downloadFile,
  triggerFileDownload,
  deleteFile,
  moveFile,
  renameFile,
  createPlaceholder,
  createSignedUrl,
  getFileUrl,
  archiveFile,
  bulkArchiveFiles,
  permanentlyDeleteFile,
  storageService,
} from './storage-service';
import { STORAGE_ACCESS_DENIED_MESSAGE } from './storage-messages';

const actionNames = [
  'archiveFolderObjects',
  'archiveObject',
  'archiveObjects',
  'createDownloadUrls',
  'createFolderPlaceholder',
  'createUploadTarget',
  'listArchivedObjects',
  'listObjects',
  'moveFolderObjects',
  'moveObject',
  'permanentlyDeleteObjects',
  'registerUploadedFile',
  'removeObjects',
  'renameObject',
  'restoreObject',
] as const;

jest.mock('@/app/(dashboard)/dateien/storage-actions', () => {
  const names = [
    'archiveFolderObjects', 'archiveObject', 'archiveObjects', 'createDownloadUrls', 'createFolderPlaceholder',
    'createUploadTarget', 'listArchivedObjects', 'listObjects', 'moveFolderObjects', 'moveObject',
    'permanentlyDeleteObjects', 'registerUploadedFile', 'removeObjects', 'renameObject', 'restoreObject',
  ];
  return Object.fromEntries(names.map((name) => [name, jest.fn()]));
});

const actions = jest.requireMock('@/app/(dashboard)/dateien/storage-actions') as Record<
  (typeof actionNames)[number],
  jest.Mock
>;

// The browser client is only used for uploadToSignedUrl (the token is the credential, no cookie is needed)
const mockUploadToSignedUrl = jest.fn();
const mockStorageFrom = jest.fn(() => ({ uploadToSignedUrl: mockUploadToSignedUrl }));
const mockClientFrom = jest.fn();
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    storage: { from: (...args: unknown[]) => (mockStorageFrom as (...a: unknown[]) => unknown)(...args) },
    from: (...args: unknown[]) => mockClientFrom(...args),
    rpc: (...args: unknown[]) => mockClientFrom(...args),
  })),
}));

const PATH = 'org_org1/shared/house1/x.pdf';
const ok = <T,>(data: T) => ({ success: true as const, data });
const fail = (error: string) => ({ success: false as const, error });

const pdf = (size = 1024) => {
  const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('storage service (browser)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateFile', () => {
    it('accepts a small supported file', () => {
      expect(validateFile(pdf()).valid).toBe(true);
    });

    it('rejects files that are too large', () => {
      const result = validateFile(pdf(11 * 1024 * 1024));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('rejects unsupported file types', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not supported');
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      actions.createUploadTarget.mockResolvedValue(ok({ path: PATH, token: 'tok-1' }));
      mockUploadToSignedUrl.mockResolvedValue({ data: { path: PATH, fullPath: `documents/${PATH}` }, error: null });
      actions.registerUploadedFile.mockResolvedValue(ok({ path: PATH, size: 1024, mimeType: 'application/pdf' }));
    });

    it('asks the server for a target, transfers the bytes with the token, then registers the file', async () => {
      const file = pdf();

      const result = await uploadFile(file, PATH);

      expect(result.success).toBe(true);
      expect(actions.createUploadTarget).toHaveBeenCalledWith(PATH, { upsert: false });
      expect(mockStorageFrom).toHaveBeenCalledWith('documents');
      expect(mockUploadToSignedUrl).toHaveBeenCalledWith(PATH, 'tok-1', file, { upsert: false, contentType: 'application/pdf' });
      expect(actions.registerUploadedFile).toHaveBeenCalledWith(PATH, { upsert: false });
      // the order matters: the metadata is written after the bytes are in storage
      expect(actions.createUploadTarget.mock.invocationCallOrder[0]).toBeLessThan(mockUploadToSignedUrl.mock.invocationCallOrder[0]);
      expect(mockUploadToSignedUrl.mock.invocationCallOrder[0]).toBeLessThan(actions.registerUploadedFile.mock.invocationCallOrder[0]);
    });

    it('uploads and registers the path the server returned (it normalises a new name)', async () => {
      actions.createUploadTarget.mockResolvedValue(ok({ path: 'org_org1/shared/house1/Bericht Q1/x.pdf', token: 'tok-2' }));

      await uploadFile(pdf(), 'org_org1/shared/house1/Bericht: Q1/x.pdf', { upsert: true, contentType: 'application/pdf' });

      expect(actions.createUploadTarget).toHaveBeenCalledWith('org_org1/shared/house1/Bericht: Q1/x.pdf', { upsert: true });
      expect(mockUploadToSignedUrl).toHaveBeenCalledWith('org_org1/shared/house1/Bericht Q1/x.pdf', 'tok-2', expect.anything(), expect.objectContaining({ upsert: true }));
      expect(actions.registerUploadedFile).toHaveBeenCalledWith('org_org1/shared/house1/Bericht Q1/x.pdf', { upsert: true });
    });

    it('never reads or writes the database from the browser', async () => {
      await uploadFile(pdf(), PATH);
      expect(mockClientFrom).not.toHaveBeenCalled();
    });

    it('rejects an invalid file without calling the server', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });

      const result = await uploadFile(file, PATH);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is not supported');
      expect(actions.createUploadTarget).not.toHaveBeenCalled();
    });

    it('does not transfer anything when the server refuses the target', async () => {
      actions.createUploadTarget.mockResolvedValue(fail('Invalid path'));

      const result = await uploadFile(pdf(), PATH);

      expect(result.success).toBe(false);
      expect(mockUploadToSignedUrl).not.toHaveBeenCalled();
      expect(actions.registerUploadedFile).not.toHaveBeenCalled();
    });

    it('fails when the transfer fails and registers nothing', async () => {
      mockUploadToSignedUrl.mockResolvedValue({ data: null, error: { message: 'Upload failed' } });

      const result = await uploadFile(pdf(), PATH);

      expect(result.success).toBe(false);
      // Error message is mapped through mapError which returns a German user message
      expect(result.error).toContain('Ein Fehler ist aufgetreten');
      expect(actions.registerUploadedFile).not.toHaveBeenCalled();
    });

    it('fails when the server rejects the uploaded file (it removes it again)', async () => {
      actions.registerUploadedFile.mockResolvedValue(fail('File size 11.00MB exceeds maximum allowed size of 10MB'));

      const result = await uploadFile(pdf(), PATH);

      expect(result.success).toBe(false);
    });
  });

  describe('reads', () => {
    it('listFiles returns the objects of the server', async () => {
      actions.listObjects.mockResolvedValue(ok([{ name: 'x.pdf' }]));
      expect(await listFiles('org_org1/shared/house1')).toEqual([{ name: 'x.pdf' }]);
    });

    it('listFiles throws the message of the server', async () => {
      actions.listObjects.mockResolvedValue(fail('Invalid path'));
      await expect(listFiles('org_other')).rejects.toThrow('Invalid path');
    });

    it('createSignedUrl asks for one URL with the lifetime and download option', async () => {
      actions.createDownloadUrls.mockResolvedValue(ok([{ path: PATH, url: 'https://example.com/signed-url' }]));

      expect(await createSignedUrl(PATH, 600, { download: true })).toBe('https://example.com/signed-url');
      expect(actions.createDownloadUrls).toHaveBeenCalledWith([PATH], { expiresIn: 600, download: true });
    });

    it('getFileUrl uses a lifetime of one hour', async () => {
      actions.createDownloadUrls.mockResolvedValue(ok([{ path: PATH, url: 'https://example.com/u' }]));
      await getFileUrl(PATH);
      expect(actions.createDownloadUrls).toHaveBeenCalledWith([PATH], { expiresIn: 3600, download: undefined });
    });

    it('createSignedUrl fails when the server gives no URL for the path', async () => {
      actions.createDownloadUrls.mockResolvedValue(ok([{ path: PATH, url: null, error: 'Invalid path' }]));
      await expect(createSignedUrl(PATH)).rejects.toThrow('Invalid path');
    });

    it('downloadFile fetches the signed URL', async () => {
      actions.createDownloadUrls.mockResolvedValue(ok([{ path: PATH, url: 'https://example.com/u' }]));
      const blob = new Blob(['content']);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
      (global as unknown as { fetch: unknown }).fetch = fetchMock;

      expect(await downloadFile(PATH)).toBe(blob);
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/u');
    });

    it('triggerFileDownload names the download in the signed URL and clicks a link', async () => {
      actions.createDownloadUrls.mockResolvedValue(ok([{ path: PATH, url: 'https://example.com/u' }]));
      const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();

      await triggerFileDownload(PATH);

      expect(actions.createDownloadUrls).toHaveBeenCalledWith([PATH], { expiresIn: 60, download: 'x.pdf' });
      expect(click).toHaveBeenCalledTimes(1);
    });
  });

  describe('writes', () => {
    it('deleteFile removes the path through the server and fails if the server denies it', async () => {
      actions.removeObjects.mockResolvedValueOnce(ok({ removed: [PATH], denied: [] }));
      await expect(deleteFile(PATH)).resolves.toBeUndefined();
      expect(actions.removeObjects).toHaveBeenCalledWith([PATH]);

      actions.removeObjects.mockResolvedValueOnce(ok({ removed: [], denied: [PATH] }));
      await expect(deleteFile(PATH)).rejects.toThrow(STORAGE_ACCESS_DENIED_MESSAGE);
    });

    it('permanentlyDeleteFile fails for a path outside an archive', async () => {
      actions.permanentlyDeleteObjects.mockResolvedValue(ok({ removed: [], denied: [PATH] }));
      await expect(permanentlyDeleteFile(PATH)).rejects.toThrow('Can only permanently delete files from archive');
    });

    it('moveFile, renameFile, createPlaceholder and archiveFile call their action', async () => {
      actions.moveObject.mockResolvedValue(ok(undefined));
      actions.renameObject.mockResolvedValue(ok(undefined));
      actions.createFolderPlaceholder.mockResolvedValue(ok(undefined));
      actions.archiveObject.mockResolvedValue(ok('org_org1/shared/house1/__archive__/t/x.pdf'));

      await moveFile(PATH, 'org_org1/shared/house1/y.pdf');
      await renameFile(PATH, 'y.pdf');
      await createPlaceholder('org_org1/shared/house1/Neu');

      expect(await archiveFile(PATH)).toBe('org_org1/shared/house1/__archive__/t/x.pdf');
      expect(actions.moveObject).toHaveBeenCalledWith(PATH, 'org_org1/shared/house1/y.pdf');
      expect(actions.renameObject).toHaveBeenCalledWith(PATH, 'y.pdf');
      expect(actions.createFolderPlaceholder).toHaveBeenCalledWith('org_org1/shared/house1/Neu');
    });

    it('a failed action becomes an error with the message of the server', async () => {
      actions.moveObject.mockResolvedValue(fail('Source file not found: x.pdf in dir'));
      await expect(moveFile(PATH, 'org_org1/shared/house1/y.pdf')).rejects.toThrow('Source file not found');
    });

    it('bulkArchiveFiles: one server call for a normal number of files, none for no files', async () => {
      actions.archiveObjects.mockResolvedValue(ok(['a', 'b']));

      expect(await bulkArchiveFiles([])).toEqual([]);
      expect(actions.archiveObjects).not.toHaveBeenCalled();

      expect(await bulkArchiveFiles([PATH, `${PATH}2`])).toEqual(['a', 'b']);
      expect(actions.archiveObjects).toHaveBeenCalledTimes(1);
    });

    it('bulkArchiveFiles: sends large lists in chunks of the size the server accepts', async () => {
      actions.archiveObjects.mockImplementation((paths: string[]) => Promise.resolve(ok(paths)));
      const paths = Array.from({ length: 450 }, (_, index) => `${PATH}${index}`);

      expect(await bulkArchiveFiles(paths)).toHaveLength(450);
      expect(actions.archiveObjects.mock.calls.map(([chunk]) => chunk.length)).toEqual([200, 200, 50]);
    });
  });

  describe('storageService object', () => {
    it('should export all service functions', () => {
      expect(storageService.uploadFile).toBeDefined();
      expect(storageService.listFiles).toBeDefined();
      expect(storageService.downloadFile).toBeDefined();
      expect(storageService.deleteFile).toBeDefined();
      expect(storageService.moveFile).toBeDefined();
      expect(storageService.createPlaceholder).toBeDefined();
      expect(storageService.getFileUrl).toBeDefined();
    });
  });
});
