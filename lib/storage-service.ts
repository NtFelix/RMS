/**
 * Cloud storage service for file management (browser side)
 *
 * The browser cannot send the organisation cookie to Supabase Storage, so it does not talk to the
 * documents bucket on its own: every operation is a server action (app/(dashboard)/dateien/storage-actions.ts,
 * logic in lib/storage-operations.ts) that checks the paths against the active organisation and the house
 * scope. Only the byte transfer of an upload runs here, with a signed upload token that is bound to one path.
 * The signatures are those of the former direct implementation, so callers did not change.
 */

import { createClient } from '@/utils/supabase/client';
import {
  archiveFolderObjects,
  archiveObject,
  archiveObjects,
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
  type StorageActionResult,
} from '@/app/(dashboard)/dateien/storage-actions';
import { MAX_PATHS_PER_REQUEST, validateFileInfo } from '@/lib/storage-file-rules';
import { performanceMonitor, cacheManager } from './storage-performance';
import { mapError } from './storage-error-handling';
import type { StorageObject } from './storage-operations';

export type { StorageObject };

export interface StorageResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
}

export interface StorageService {
  uploadFile(file: File, path: string, options?: UploadOptions): Promise<StorageResult>;
  listFiles(prefix: string): Promise<StorageObject[]>;
  downloadFile(path: string): Promise<Blob>;
  triggerFileDownload(path: string, filename?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(oldPath: string, newPath: string): Promise<void>;
  moveFolder(oldFolderPath: string, newFolderPath: string): Promise<void>;
  renameFile(filePath: string, newName: string): Promise<void>;
  createPlaceholder(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  archiveFile(path: string): Promise<string>;
  listArchivedFiles(): Promise<StorageObject[]>;
  restoreFile(archivePath: string, targetPath?: string): Promise<void>;
  permanentlyDeleteFile(path: string): Promise<void>;
  bulkArchiveFiles(paths: string[]): Promise<string[]>;
  archiveFolder(folderPath: string): Promise<string[]>;
}

// Storage bucket name (only for the signed upload, see uploadFile)
const STORAGE_BUCKET = 'documents';

/** Unwraps the result of a server action: a failure becomes an Error with the message of the server */
function unwrap<T>(result: StorageActionResult<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/** Directory part of a path, for cache invalidation */
function directoryOf(path: string): string {
  return path.substring(0, path.lastIndexOf('/'));
}

/**
 * Validates file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  return validateFileInfo(file);
}

/**
 * Uploads a file: the server checks the target and issues a signed upload token for exactly this path, the
 * browser transfers the bytes with it, the server then reads size and type from storage and writes the metadata.
 */
export async function uploadFile(
  file: File,
  path: string,
  options: UploadOptions = {}
): Promise<StorageResult> {
  const startTime = Date.now();

  try {
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error
      };
    }

    // The server normalises the new name once and validates exactly the string it returns
    const target = unwrap(await createUploadTarget(path, { upsert: options.upsert === true }));

    // The token is the only credential of this request: it needs neither the cookie nor the right to write
    // elsewhere in the bucket
    const { data, error } = await createClient().storage
      .from(STORAGE_BUCKET)
      .uploadToSignedUrl(target.path, target.token, file, {
        upsert: options.upsert === true,
        contentType: options.contentType || file.type,
      });
    if (error) {
      console.error('Supabase upload error:', error);
      throw mapError(error, 'upload_file');
    }

    // Size and type are taken from storage by the server (a file that breaks the rules is removed again)
    unwrap(await registerUploadedFile(target.path));

    cacheManager.invalidatePrefix(directoryOf(target.path));

    performanceMonitor.addMetric({
      queryTime: Date.now() - startTime,
      resultCount: 1,
      cacheHit: false,
      retryCount: 0,
    });

    return {
      success: true,
      data: data ?? { path: target.path }
    };
  } catch (error) {
    const storageError = mapError(error, 'upload_file');

    console.error('Upload failed:', {
      path,
      fileName: file.name,
      error: storageError
    });

    performanceMonitor.addMetric({
      queryTime: Date.now() - startTime,
      resultCount: 0,
      cacheHit: false,
      retryCount: storageError.retryCount || 0,
      error: storageError.message,
    });

    return {
      success: false,
      error: storageError.userMessage
    };
  }
}

/**
 * Lists files with a given prefix
 */
export async function listFiles(prefix: string, options?: Parameters<typeof listObjects>[1]): Promise<StorageObject[]> {
  return unwrap(await listObjects(prefix, options));
}

/**
 * Creates a signed URL for opening, downloading or sharing a file
 * @param path - The file path in storage
 * @param expiresIn - Number of seconds until the URL expires (default: 1 hour, the server caps it at 7 days)
 * @param options - Additional options for the signed URL
 * @returns Promise<string> - The signed URL
 */
export async function createSignedUrl(
  path: string,
  expiresIn: number = 3600, // Default: 1 hour
  options?: { download?: boolean | string }
): Promise<string> {
  const [result] = unwrap(await createDownloadUrls([path], { expiresIn, download: options?.download }));
  if (!result?.url) {
    throw new Error(result?.error ?? 'No signed URL returned from Supabase');
  }
  return result.url;
}

/**
 * Gets a signed URL for a file
 */
export async function getFileUrl(path: string): Promise<string> {
  return createSignedUrl(path, 3600);
}

/**
 * Downloads a file from storage
 */
export async function downloadFile(path: string): Promise<Blob> {
  const url = await createSignedUrl(path, 60);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.blob();
}

/**
 * Triggers a browser download for a file: the signed URL makes the browser save it under this name
 */
export async function triggerFileDownload(path: string, filename?: string): Promise<void> {
  try {
    const name = filename || path.split('/').pop() || 'download';
    const url = await createSignedUrl(path, 60, { download: name });

    // Create a temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
  } catch (error) {
    throw new Error(`Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Archives a file inside its zone: shared/{house}/__archive__/{timestamp}/... or
 * private/{user}/__archive__/{timestamp}/...
 */
export async function archiveFile(path: string): Promise<string> {
  const archivePath = unwrap(await archiveObject(path));
  cacheManager.invalidatePrefix(directoryOf(path));
  return archivePath;
}

/**
 * Permanently deletes a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  const { denied } = unwrap(await removeObjects([path]));
  if (denied.length > 0) {
    throw new Error('Invalid path');
  }
  cacheManager.invalidatePrefix(directoryOf(path));
}

/**
 * Moves a file from one path to another
 */
export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  unwrap(await moveObject(oldPath, newPath));
  cacheManager.invalidatePrefix(directoryOf(oldPath));
  cacheManager.invalidatePrefix(directoryOf(newPath));
}

/**
 * Renames a file in the same directory
 */
export async function renameFile(filePath: string, newName: string): Promise<void> {
  unwrap(await renameObject(filePath, newName));
  cacheManager.invalidatePrefix(directoryOf(filePath));
}

/**
 * Creates a placeholder file for empty folders
 */
export async function createPlaceholder(path: string): Promise<void> {
  unwrap(await createFolderPlaceholder(path));
}

/**
 * Lists archived files the user may see: the archive of every accessible house and the own private archive
 */
export async function listArchivedFiles(): Promise<StorageObject[]> {
  return unwrap(await listArchivedObjects());
}

/**
 * Restores an archived file to its original location (or to targetPath)
 */
export async function restoreFile(archivePath: string, targetPath?: string): Promise<void> {
  unwrap(await restoreObject(archivePath, targetPath));
}

/**
 * Permanently deletes a file, only allowed for paths inside an archive.
 */
export async function permanentlyDeleteFile(path: string): Promise<void> {
  const { denied } = unwrap(await permanentlyDeleteObjects([path]));
  if (denied.length > 0) {
    throw new Error('Can only permanently delete files from archive');
  }
}

/**
 * Archives multiple files (bulk operation): one server call, the paths that fail are left out of the result
 */
export async function bulkArchiveFiles(paths: string[]): Promise<string[]> {
  const archived: string[] = [];
  // One server call per chunk: the action bounds the number of paths of a request
  for (let i = 0; i < paths.length; i += MAX_PATHS_PER_REQUEST) {
    archived.push(...unwrap(await archiveObjects(paths.slice(i, i + MAX_PATHS_PER_REQUEST))));
  }
  return archived;
}

/**
 * Moves a folder and all its contents to a new location
 */
export async function moveFolder(oldFolderPath: string, newFolderPath: string): Promise<void> {
  unwrap(await moveFolderObjects(oldFolderPath, newFolderPath));
  cacheManager.invalidatePrefix(oldFolderPath);
  cacheManager.invalidatePrefix(newFolderPath);
}

/**
 * Archives all files in a folder (for folder deletion)
 */
export async function archiveFolder(folderPath: string): Promise<string[]> {
  return unwrap(await archiveFolderObjects(folderPath));
}

// Default export with all storage operations
export const storageService: StorageService = {
  uploadFile,
  listFiles,
  downloadFile,
  triggerFileDownload,
  deleteFile,
  moveFile,
  moveFolder,
  renameFile,
  createPlaceholder,
  getFileUrl,
  archiveFile,
  listArchivedFiles,
  restoreFile,
  permanentlyDeleteFile,
  bulkArchiveFiles,
  archiveFolder,
};
