/**
 * Tests for the storage server actions: shape of the input, one access context per call,
 * errors as values (no thrown message), access errors without details
 */

import { StoragePathError } from '@/lib/storage-paths'

const OPERATIONS = [
  'archiveFile',
  'archiveFolder',
  'bulkArchiveFiles',
  'completeUpload',
  'copyFile',
  'createPlaceholder',
  'createSignedUrls',
  'listArchivedFiles',
  'listFiles',
  'moveFile',
  'moveFolder',
  'pingStorage',
  'prepareUpload',
  'removeFiles',
  'renameFile',
  'restoreFile',
] as const

// The operations are replaced by mocks, the real ones need the server runtime (cookies, Supabase)
jest.mock('@/lib/storage-operations', () => {
  const names = [
    'archiveFile', 'archiveFolder', 'bulkArchiveFiles', 'completeUpload', 'copyFile', 'createPlaceholder',
    'createSignedUrls', 'listArchivedFiles', 'listFiles', 'moveFile', 'moveFolder', 'pingStorage', 'prepareUpload',
    'removeFiles', 'renameFile', 'restoreFile', 'getStorageContext',
  ]
  return Object.fromEntries(names.map((name) => [name, jest.fn()]))
})

const operations = jest.requireMock('@/lib/storage-operations') as Record<
  (typeof OPERATIONS)[number] | 'getStorageContext',
  jest.Mock
>
const mockOps = operations
const mockGetStorageContext = operations.getStorageContext
const CTX = { orgId: 'org1', userId: 'user-1' }

const mockUnstableRethrow = jest.fn()
jest.mock('next/navigation', () => ({
  unstable_rethrow: (error: unknown) => mockUnstableRethrow(error),
}))

import {
  archiveFolderObjects,
  archiveObject,
  archiveObjects,
  checkStorageReachable,
  copyObject,
  createDownloadUrls,
  createFolderPlaceholder,
  createUploadTarget,
  listArchivedObjects,
  listObjects,
  moveFolderObjects,
  moveObject,
  permanentlyDeleteObjects,
  registerUploadedFile,
  removeObjects,
  renameObject,
  restoreObject,
} from './storage-actions'

const PATH = 'org_org1/shared/house1/x.pdf'

describe('storage actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    mockGetStorageContext.mockResolvedValue(CTX)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('upload', () => {
    it('createUploadTarget builds the context once and returns path and token', async () => {
      mockOps.prepareUpload.mockResolvedValue({ path: PATH, token: 'tok' })

      const result = await createUploadTarget(PATH, { upsert: true })

      expect(result).toEqual({ success: true, data: { path: PATH, token: 'tok' } })
      expect(mockGetStorageContext).toHaveBeenCalledTimes(1)
      expect(mockOps.prepareUpload).toHaveBeenCalledWith(PATH, { upsert: true }, CTX)
    })

    it('createUploadTarget treats everything but `true` as no upsert', async () => {
      mockOps.prepareUpload.mockResolvedValue({ path: PATH, token: 'tok' })
      await createUploadTarget(PATH, { upsert: 'yes' as unknown as boolean })
      expect(mockOps.prepareUpload).toHaveBeenCalledWith(PATH, { upsert: false }, CTX)
    })

    it('registerUploadedFile only passes the path on: size and type are read from storage', async () => {
      mockOps.completeUpload.mockResolvedValue({ path: PATH, size: 5, mimeType: 'application/pdf' })

      const result = await registerUploadedFile(PATH)

      expect(result).toEqual({ success: true, data: { path: PATH, size: 5, mimeType: 'application/pdf' } })
      expect(mockOps.completeUpload).toHaveBeenCalledWith(PATH, { upsert: false }, CTX)

      await registerUploadedFile(PATH, { upsert: true })
      expect(mockOps.completeUpload).toHaveBeenLastCalledWith(PATH, { upsert: true }, CTX)
    })
  })

  describe('input shape', () => {
    it.each([
      ['createUploadTarget', () => createUploadTarget('')],
      ['createUploadTarget', () => createUploadTarget(42 as unknown as string)],
      ['registerUploadedFile', () => registerUploadedFile(undefined as unknown as string)],
      ['createDownloadUrls', () => createDownloadUrls('x' as unknown as string[])],
      ['createDownloadUrls', () => createDownloadUrls([PATH, 7 as unknown as string])],
      ['createDownloadUrls', () => createDownloadUrls(Array.from({ length: 201 }, (_, i) => `${PATH}${i}`))],
      ['removeObjects', () => removeObjects([''])],
      ['permanentlyDeleteObjects', () => permanentlyDeleteObjects(null as unknown as string[])],
      ['moveObject', () => moveObject(PATH, '')],
      ['copyObject', () => copyObject('', PATH)],
      ['renameObject', () => renameObject(PATH, '')],
      ['moveFolderObjects', () => moveFolderObjects(PATH, {} as unknown as string)],
      ['createFolderPlaceholder', () => createFolderPlaceholder('')],
      ['archiveObject', () => archiveObject('')],
      ['archiveObjects', () => archiveObjects([PATH, ''])],
      ['archiveFolderObjects', () => archiveFolderObjects('')],
      ['restoreObject', () => restoreObject(PATH, '')],
      ['listObjects', () => listObjects('')],
    ])('%s refuses invalid input before anything is built or touched', async (_name, call) => {
      const result = await call()

      expect(result).toEqual({ success: false, error: 'Invalid input' })
      expect(mockGetStorageContext).not.toHaveBeenCalled()
      OPERATIONS.forEach((name) => expect(mockOps[name]).not.toHaveBeenCalled())
    })
  })

  describe('downloads', () => {
    it('createDownloadUrls passes the lifetime and the download option to the operation', async () => {
      mockOps.createSignedUrls.mockResolvedValue([{ path: PATH, url: 'https://example.com/u' }])

      const result = await createDownloadUrls([PATH], { expiresIn: 60, download: 'Vertrag.pdf' })

      expect(result).toEqual({ success: true, data: [{ path: PATH, url: 'https://example.com/u' }] })
      expect(mockOps.createSignedUrls).toHaveBeenCalledWith([PATH], { expiresIn: 60, download: 'Vertrag.pdf' }, CTX)
    })

    it('createDownloadUrls drops a download option of the wrong type (the operation caps the lifetime)', async () => {
      mockOps.createSignedUrls.mockResolvedValue([])
      await createDownloadUrls([PATH], { expiresIn: 10 ** 12, download: { evil: true } as unknown as boolean })
      expect(mockOps.createSignedUrls).toHaveBeenCalledWith([PATH], { expiresIn: 10 ** 12, download: undefined }, CTX)
    })
  })

  describe('writes', () => {
    it('removeObjects reports the denied paths', async () => {
      mockOps.removeFiles.mockResolvedValue({ removed: [PATH], denied: ['org_x/shared/h/y.pdf'] })

      const result = await removeObjects([PATH, 'org_x/shared/h/y.pdf'])

      expect(result).toEqual({ success: true, data: { removed: [PATH], denied: ['org_x/shared/h/y.pdf'] } })
      expect(mockOps.removeFiles).toHaveBeenCalledWith([PATH, 'org_x/shared/h/y.pdf'], {}, CTX)
    })

    it('permanentlyDeleteObjects only accepts archived paths', async () => {
      mockOps.removeFiles.mockResolvedValue({ removed: [], denied: [PATH] })
      await permanentlyDeleteObjects([PATH])
      expect(mockOps.removeFiles).toHaveBeenCalledWith([PATH], { onlyArchived: true }, CTX)
    })

    it.each([
      ['moveObject', () => moveObject(PATH, 'org_org1/shared/house1/y.pdf'), 'moveFile', [PATH, 'org_org1/shared/house1/y.pdf', CTX]],
      ['copyObject', () => copyObject(PATH, 'org_org1/shared/house1/y.pdf'), 'copyFile', [PATH, 'org_org1/shared/house1/y.pdf', CTX]],
      ['renameObject', () => renameObject(PATH, 'y.pdf'), 'renameFile', [PATH, 'y.pdf', CTX]],
      ['moveFolderObjects', () => moveFolderObjects('org_org1/shared/house1/A', 'org_org1/shared/house1/B'), 'moveFolder', ['org_org1/shared/house1/A', 'org_org1/shared/house1/B', CTX]],
      ['createFolderPlaceholder', () => createFolderPlaceholder('org_org1/shared/house1/A'), 'createPlaceholder', ['org_org1/shared/house1/A', CTX]],
      ['restoreObject', () => restoreObject(PATH), 'restoreFile', [PATH, undefined, CTX]],
    ])('%s runs one operation with one context', async (_name, call, operation, args) => {
      mockOps[operation as (typeof OPERATIONS)[number]].mockResolvedValue(undefined)

      expect(await call()).toEqual({ success: true, data: undefined })
      expect(mockGetStorageContext).toHaveBeenCalledTimes(1)
      expect(mockOps[operation as (typeof OPERATIONS)[number]]).toHaveBeenCalledWith(...(args as unknown[]))
    })

    it('archive actions return the archive paths', async () => {
      mockOps.archiveFile.mockResolvedValue('org_org1/shared/house1/__archive__/t/x.pdf')
      mockOps.bulkArchiveFiles.mockResolvedValue(['a'])
      mockOps.archiveFolder.mockResolvedValue(['b'])

      expect(await archiveObject(PATH)).toEqual({ success: true, data: 'org_org1/shared/house1/__archive__/t/x.pdf' })
      expect(await archiveObjects([PATH])).toEqual({ success: true, data: ['a'] })
      expect(await archiveFolderObjects('org_org1/shared/house1/A')).toEqual({ success: true, data: ['b'] })
    })
  })

  describe('reads', () => {
    it('listObjects and listArchivedObjects return the objects', async () => {
      mockOps.listFiles.mockResolvedValue([{ name: 'x.pdf' }])
      mockOps.listArchivedFiles.mockResolvedValue([{ name: 'y.pdf' }])

      expect(await listObjects('org_org1/shared/house1', { limit: 5 })).toEqual({ success: true, data: [{ name: 'x.pdf' }] })
      expect(mockOps.listFiles).toHaveBeenCalledWith('org_org1/shared/house1', { limit: 5 }, CTX)
      expect(await listArchivedObjects()).toEqual({ success: true, data: [{ name: 'y.pdf' }] })
    })

    it('checkStorageReachable pings the bucket', async () => {
      mockOps.pingStorage.mockResolvedValue(undefined)
      expect(await checkStorageReachable()).toEqual({ success: true, data: undefined })
    })
  })

  describe('errors', () => {
    it('an access error is returned without details of the path rule', async () => {
      mockOps.moveFile.mockRejectedValue(new StoragePathError('Zugriff auf org_other verweigert', 'ACCESS_DENIED'))

      expect(await moveObject(PATH, 'org_other/shared/h/y.pdf')).toEqual({ success: false, error: 'Invalid path' })
    })

    it('a legacy path gets its own message', async () => {
      mockOps.moveFile.mockRejectedValue(new StoragePathError('Dieser Speicherpfad ist veraltet', 'LEGACY_PATH'))

      expect(await moveObject(PATH, 'user_1/x.pdf')).toEqual({ success: false, error: 'Dieser Speicherpfad ist veraltet' })
    })

    it('another error is returned as a value with its message (a thrown message is hidden in production)', async () => {
      mockOps.prepareUpload.mockRejectedValue(new Error('Upload konnte nicht vorbereitet werden: boom'))

      expect(await createUploadTarget(PATH)).toEqual({
        success: false,
        error: 'Upload konnte nicht vorbereitet werden: boom',
      })
    })

    it('an unauthenticated user gets a failure and no operation runs', async () => {
      mockGetStorageContext.mockRejectedValue(new Error('Nicht authentifiziert. Bitte melden Sie sich an.'))

      const result = await removeObjects([PATH])

      expect(result).toEqual({ success: false, error: 'Nicht authentifiziert. Bitte melden Sie sich an.' })
      expect(mockOps.removeFiles).not.toHaveBeenCalled()
    })

    it('lets Next.js internal errors (redirects) pass through', async () => {
      const redirect = new Error('NEXT_REDIRECT')
      mockGetStorageContext.mockRejectedValue(redirect)
      mockUnstableRethrow.mockImplementation((error) => {
        throw error
      })

      await expect(archiveObject(PATH)).rejects.toBe(redirect)
    })
  })
})
