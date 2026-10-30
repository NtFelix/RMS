'use server'

import { unstable_rethrow } from 'next/navigation'
import { StoragePathError } from '@/lib/storage-paths'
import { MAX_PATHS_PER_REQUEST } from '@/lib/storage-file-rules'
import {
  archiveFile,
  archiveFolder,
  bulkArchiveFiles,
  copyFile,
  createPlaceholder,
  createSignedUrls,
  completeUpload,
  getStorageContext,
  listArchivedFiles,
  listFiles,
  moveFile,
  moveFolder,
  pingStorage,
  prepareUpload,
  removeFiles,
  renameFile,
  restoreFile,
  type ListFilesOptions,
  type SignedUrlResult,
  type StorageContext,
  type StorageObject,
} from '@/lib/storage-operations'

/**
 * Storage actions of the documents bucket (GH-27, option A).
 *
 * The browser cannot send the organisation cookie to Supabase Storage, so every operation runs here: each action
 * builds its access context through ensureAuth (server client with the cookie, active organisation, house scope)
 * and validates every path in lib/storage-operations.ts before anything is touched. Arguments come from the
 * browser and are checked for their shape first. Errors are returned as values, because Next.js hides the
 * message of an error thrown by a server action in production.
 */

export type StorageActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/** Error text for the client: access errors are generic, the rest is the message of our own checks */
function toErrorMessage(error: unknown): string {
  if (error instanceof StoragePathError) {
    return error.code === 'LEGACY_PATH' ? error.message : 'Invalid path'
  }
  return error instanceof Error ? error.message : 'Storage operation failed'
}

async function run<T>(
  operation: string,
  work: (ctx: StorageContext) => Promise<T>,
): Promise<StorageActionResult<T>> {
  try {
    return { success: true, data: await work(await getStorageContext()) }
  } catch (error) {
    unstable_rethrow(error)
    console.error(`[storage-actions] ${operation} failed:`, error)
    return { success: false, error: toErrorMessage(error) }
  }
}

function invalidInput(operation: string): StorageActionResult<never> {
  console.error(`[storage-actions] ${operation}: invalid input`)
  return { success: false, error: 'Invalid input' }
}

const isPath = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isPathList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= MAX_PATHS_PER_REQUEST && value.every(isPath)

/**
 * First step of an upload: returns the normalised path and a signed upload token for exactly this path.
 * The browser transfers the bytes with it (uploadToSignedUrl) and then calls registerUploadedFile.
 */
export async function createUploadTarget(
  path: string,
  options?: { upsert?: boolean },
): Promise<StorageActionResult<{ path: string; token: string }>> {
  if (!isPath(path)) return invalidInput('createUploadTarget')
  return run('createUploadTarget', (ctx) => prepareUpload(path, { upsert: options?.upsert === true }, ctx))
}

/** Second step of an upload: size and type come from storage, the metadata row is written */
export async function registerUploadedFile(
  path: string,
): Promise<StorageActionResult<{ path: string; size: number; mimeType: string }>> {
  if (!isPath(path)) return invalidInput('registerUploadedFile')
  return run('registerUploadedFile', (ctx) => completeUpload(path, ctx))
}

/** Signed URLs for existing files (open, download, share link); the lifetime is capped on the server */
export async function createDownloadUrls(
  paths: string[],
  options?: { expiresIn?: number; download?: boolean | string },
): Promise<StorageActionResult<SignedUrlResult[]>> {
  if (!isPathList(paths)) return invalidInput('createDownloadUrls')
  const download = typeof options?.download === 'string' || typeof options?.download === 'boolean'
    ? options.download
    : undefined
  return run('createDownloadUrls', (ctx) =>
    createSignedUrls(paths, { expiresIn: Number(options?.expiresIn), download }, ctx),
  )
}

/** Removes files; paths the user may not write are not touched and come back in `denied` */
export async function removeObjects(
  paths: string[],
): Promise<StorageActionResult<{ removed: string[]; denied: string[] }>> {
  if (!isPathList(paths)) return invalidInput('removeObjects')
  return run('removeObjects', (ctx) => removeFiles(paths, {}, ctx))
}

/** Permanently removes files, only accepted inside an archive */
export async function permanentlyDeleteObjects(
  paths: string[],
): Promise<StorageActionResult<{ removed: string[]; denied: string[] }>> {
  if (!isPathList(paths)) return invalidInput('permanentlyDeleteObjects')
  return run('permanentlyDeleteObjects', (ctx) => removeFiles(paths, { onlyArchived: true }, ctx))
}

export async function moveObject(oldPath: string, newPath: string): Promise<StorageActionResult> {
  if (!isPath(oldPath) || !isPath(newPath)) return invalidInput('moveObject')
  return run('moveObject', (ctx) => moveFile(oldPath, newPath, ctx))
}

export async function copyObject(sourcePath: string, targetPath: string): Promise<StorageActionResult> {
  if (!isPath(sourcePath) || !isPath(targetPath)) return invalidInput('copyObject')
  return run('copyObject', (ctx) => copyFile(sourcePath, targetPath, ctx))
}

export async function renameObject(filePath: string, newName: string): Promise<StorageActionResult> {
  if (!isPath(filePath) || !isPath(newName)) return invalidInput('renameObject')
  return run('renameObject', (ctx) => renameFile(filePath, newName, ctx))
}

export async function moveFolderObjects(oldFolderPath: string, newFolderPath: string): Promise<StorageActionResult> {
  if (!isPath(oldFolderPath) || !isPath(newFolderPath)) return invalidInput('moveFolderObjects')
  return run('moveFolderObjects', (ctx) => moveFolder(oldFolderPath, newFolderPath, ctx))
}

export async function createFolderPlaceholder(folderPath: string): Promise<StorageActionResult> {
  if (!isPath(folderPath)) return invalidInput('createFolderPlaceholder')
  return run('createFolderPlaceholder', (ctx) => createPlaceholder(folderPath, ctx))
}

/** Archives a file inside its zone (shared/{house}/__archive__ or private/{user}/__archive__) */
export async function archiveObject(path: string): Promise<StorageActionResult<string>> {
  if (!isPath(path)) return invalidInput('archiveObject')
  return run('archiveObject', (ctx) => archiveFile(path, ctx))
}

export async function archiveObjects(paths: string[]): Promise<StorageActionResult<string[]>> {
  if (!isPathList(paths)) return invalidInput('archiveObjects')
  return run('archiveObjects', (ctx) => bulkArchiveFiles(paths, ctx))
}

export async function archiveFolderObjects(folderPath: string): Promise<StorageActionResult<string[]>> {
  if (!isPath(folderPath)) return invalidInput('archiveFolderObjects')
  return run('archiveFolderObjects', (ctx) => archiveFolder(folderPath, ctx))
}

export async function restoreObject(archivePath: string, targetPath?: string): Promise<StorageActionResult> {
  if (!isPath(archivePath) || (targetPath !== undefined && !isPath(targetPath))) return invalidInput('restoreObject')
  return run('restoreObject', (ctx) => restoreFile(archivePath, targetPath, ctx))
}

export async function listObjects(
  prefix: string,
  options?: ListFilesOptions,
): Promise<StorageActionResult<StorageObject[]>> {
  if (!isPath(prefix)) return invalidInput('listObjects')
  return run('listObjects', (ctx) => listFiles(prefix, options, ctx))
}

export async function listArchivedObjects(): Promise<StorageActionResult<StorageObject[]>> {
  return run('listArchivedObjects', (ctx) => listArchivedFiles(ctx))
}

/** Reachability of the bucket for the active organisation (health check of the performance dashboard) */
export async function checkStorageReachable(): Promise<StorageActionResult> {
  return run('checkStorageReachable', (ctx) => pingStorage(ctx))
}
