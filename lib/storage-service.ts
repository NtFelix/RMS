/**
 * Cloud storage service for file management
 * Provides interface for Supabase Storage operations with security and validation
 * Enhanced with performance optimizations and comprehensive error handling
 */

import { createClient } from '@/utils/supabase/client';
import { pathUtils, validatePath, isUserPath, extractPathSegments, isKeepFile } from './path-utils';
import { 
  optimizedListFiles, 
  performanceMonitor, 
  cacheManager,
  PERFORMANCE_CONFIG,
  type PaginatedQuery 
} from './storage-performance';
import { 
  withRetry, 
  mapError, 
  storageCircuitBreaker,
  type StorageError,
  DEFAULT_RETRY_CONFIG 
} from './storage-error-handling';

export interface StorageObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  size: number;
}

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
  renameFile(filePath: string, newName: string): Promise<void>;
  createPlaceholder(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  archiveFile(path: string): Promise<string>;
  listArchivedFiles(userId: string): Promise<StorageObject[]>;
  restoreFile(archivePath: string, targetPath?: string): Promise<void>;
  permanentlyDeleteFile(path: string): Promise<void>;
  bulkArchiveFiles(paths: string[]): Promise<string[]>;
  archiveFolder(folderPath: string): Promise<string[]>;
}

// Supported file types for validation
const SUPPORTED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  
  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
} as const;

// Maximum file size (10MB for optimal performance as per requirements)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Storage bucket name
const STORAGE_BUCKET = 'documents';

/**
 * Validates file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }
  
  // Check file type
  const isValidType = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);
  if (!isValidType) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Supported types: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Gets the current user ID from Supabase auth
 */
async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

/**
 * Validates that a path belongs to the current user
 */
async function validateUserPath(path: string): Promise<void> {
  const userId = await getCurrentUserId();
  
  if (!validatePath(path)) {
    throw new Error('Invalid path format');
  }
  
  if (!isUserPath(path, userId)) {
    throw new Error('Access denied: path does not belong to current user');
  }
}

/**
 * Uploads a file to storage with retry logic and performance monitoring
 */
export async function uploadFile(
  file: File, 
  path: string, 
  options: UploadOptions = {}
): Promise<StorageResult> {
  const startTime = Date.now();
  
  try {
    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error
      };
    }
    
    // Validate and sanitize path
    await validateUserPath(path);
    const sanitizedPath = pathUtils.sanitizePath(path);
    
    // Use retry logic with circuit breaker
    const result = await withRetry(
      async () => {
        return await storageCircuitBreaker.execute(async () => {
          const supabase = createClient();
          
          // Set timeout for upload to meet performance requirements
          const uploadPromise = supabase.storage
            .from(STORAGE_BUCKET)
            .upload(sanitizedPath, file, {
              upsert: options.upsert || false,
              contentType: options.contentType || file.type,
            });
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout: File upload took longer than expected')), 
              file.size > 5 * 1024 * 1024 ? 10000 : 5000); // Longer timeout for larger files
          });
          
          const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
          
          if (error) {
            throw mapError(error, 'upload_file');
          }
          
          // Invalidate cache for the directory
          const directoryPath = sanitizedPath.substring(0, sanitizedPath.lastIndexOf('/'));
          cacheManager.invalidatePrefix(directoryPath);
          
          return data;
        });
      },
      {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2, // Fewer retries for uploads to avoid duplicate files
      },
      'upload_file'
    );
    
    const endTime = Date.now();
    
    // Record performance metrics
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
      resultCount: 1,
      cacheHit: false,
      retryCount: 0,
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    const endTime = Date.now();
    const storageError = mapError(error, 'upload_file');
    
    // Record failed operation metrics
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
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
 * Lists files with a given prefix using performance optimizations
 */
export async function listFiles(prefix: string, options?: {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'updated_at' | 'size';
  sortOrder?: 'asc' | 'desc';
}): Promise<StorageObject[]> {
  const startTime = Date.now();
  
  try {
    await validateUserPath(prefix);
    const sanitizedPrefix = pathUtils.sanitizePath(prefix);
    
    // Use circuit breaker to prevent cascading failures
    const result = await storageCircuitBreaker.execute(async () => {
      // Create optimized query
      const query: PaginatedQuery = {
        prefix: sanitizedPrefix,
        limit: options?.limit || PERFORMANCE_CONFIG.MAX_FILES_PER_QUERY,
        offset: options?.offset || 0,
        sortBy: options?.sortBy || 'name',
        sortOrder: options?.sortOrder || 'asc',
      };

      // Use optimized list function with caching and retry logic
      const paginatedResult = await optimizedListFiles(
        async (prefix: string, queryOptions?: any) => {
          const supabase = createClient();
          
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(prefix, {
              limit: Math.min(queryOptions?.limit || 1000, PERFORMANCE_CONFIG.MAX_FILES_PER_QUERY),
              sortBy: queryOptions?.sortBy || { column: 'name', order: 'asc' }
            });
          
          if (error) {
            throw mapError(error, 'list_files');
          }
          
          // Filter and map FileObject[] to StorageObject[]
          // Only return actual files (not folders) and exclude .keep files
          return (data || [])
            .filter(file => {
              // Skip .keep placeholder files
              if (file.name === '.keep') return false
              
              // Only include actual files (items with size or file extensions)
              // Folders in Supabase don't have metadata.size and don't have extensions
              return file.metadata?.size || file.name.includes('.')
            })
            .map(file => ({
              name: file.name,
              id: file.id || file.name,
              updated_at: file.updated_at || new Date().toISOString(),
              created_at: file.created_at || new Date().toISOString(),
              last_accessed_at: file.last_accessed_at || new Date().toISOString(),
              metadata: file.metadata || {},
              size: file.metadata?.size || 0,
            }));
        },
        query
      );

      // Record performance metrics
      performanceMonitor.addMetric(paginatedResult.metrics);
      
      return paginatedResult.data[0] || [];
    });

    return result;
  } catch (error) {
    const endTime = Date.now();
    const storageError = mapError(error, 'list_files');
    
    // Record failed operation metrics
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
      resultCount: 0,
      cacheHit: false,
      retryCount: 0,
      error: storageError.message,
    });
    
    throw storageError;
  }
}

/**
 * Downloads a file from storage with performance optimization and retry logic
 */
export async function downloadFile(path: string): Promise<Blob> {
  const startTime = Date.now();
  
  try {
    await validateUserPath(path);
    const sanitizedPath = pathUtils.sanitizePath(path);
    
    // Use retry logic with circuit breaker
    const result = await withRetry(
      async () => {
        return await storageCircuitBreaker.execute(async () => {
          const supabase = createClient();
          
          // Set a timeout for the download to meet 2-second performance target
          const downloadPromise = supabase.storage
            .from(STORAGE_BUCKET)
            .download(sanitizedPath);
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Download timeout: File download took longer than 2 seconds')), 
              PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD);
          });
          
          const { data, error } = await Promise.race([downloadPromise, timeoutPromise]);
          
          if (error) {
            throw mapError(error, 'download_file');
          }
          
          return data;
        });
      },
      DEFAULT_RETRY_CONFIG,
      'download_file'
    );
    
    const endTime = Date.now();
    
    // Record performance metrics
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
      resultCount: 1,
      cacheHit: false,
      retryCount: 0,
    });
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const storageError = mapError(error, 'download_file');
    
    // Record failed operation metrics
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
      resultCount: 0,
      cacheHit: false,
      retryCount: storageError.retryCount || 0,
      error: storageError.message,
    });
    
    throw storageError;
  }
}

/**
 * Triggers a browser download for a file
 */
export async function triggerFileDownload(path: string, filename?: string): Promise<void> {
  try {
    const blob = await downloadFile(path);
    const url = URL.createObjectURL(blob);
    
    // Create a temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || path.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Archives a file by moving it to the archive folder with timestamp
 */
export async function archiveFile(path: string): Promise<string> {
  await validateUserPath(path);
  
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = path.split('/').pop() || 'unknown';
  
  // Preserve original folder structure within archive
  const pathSegments = extractPathSegments(path);
  const originalStructure = [];
  
  if (pathSegments.houseId) {
    originalStructure.push(pathSegments.houseId);
    if (pathSegments.apartmentId) {
      originalStructure.push(pathSegments.apartmentId);
      if (pathSegments.tenantId) {
        originalStructure.push(pathSegments.tenantId);
      } else if (pathSegments.category) {
        originalStructure.push(pathSegments.category);
      }
    } else if (pathSegments.category) {
      originalStructure.push(pathSegments.category);
    }
  } else if (pathSegments.category) {
    originalStructure.push(pathSegments.category);
  }
  
  const archivePath = pathUtils.buildUserPath(
    userId, 
    '__archive__', 
    timestamp, 
    ...originalStructure, 
    fileName
  );
  
  await moveFile(path, archivePath);
  return archivePath;
}

/**
 * Deletes a file from storage (moves to archive)
 */
export async function deleteFile(path: string): Promise<void> {
  await archiveFile(path);
}

/**
 * Moves a file from one path to another
 */
export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  await validateUserPath(oldPath);
  await validateUserPath(newPath);
  
  const sanitizedOldPath = pathUtils.sanitizePath(oldPath);
  const sanitizedNewPath = pathUtils.sanitizePath(newPath);
  
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .move(sanitizedOldPath, sanitizedNewPath);
  
  if (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

/**
 * Renames a file in the same directory
 */
export async function renameFile(filePath: string, newName: string): Promise<void> {
  const pathSegments = filePath.split('/');
  const directory = pathSegments.slice(0, -1).join('/');
  const newPath = `${directory}/${newName}`;
  
  await moveFile(filePath, newPath);
}

/**
 * Creates a placeholder file for empty folders
 */
export async function createPlaceholder(path: string): Promise<void> {
  await validateUserPath(path);
  
  const placeholderPath = `${pathUtils.sanitizePath(path)}/.keep`;
  const placeholderFile = new File([''], '.keep', { type: 'text/plain' });
  
  const result = await uploadFile(placeholderFile, placeholderPath, { upsert: true });
  
  if (!result.success) {
    throw new Error(`Failed to create placeholder: ${result.error}`);
  }
}

/**
 * Gets a signed URL for a file
 */
export async function getFileUrl(path: string): Promise<string> {
  await validateUserPath(path);
  const sanitizedPath = pathUtils.sanitizePath(path);
  
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(sanitizedPath, 3600); // 1 hour expiry
  
  if (error) {
    throw new Error(`Failed to get file URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Lists archived files for a user
 */
export async function listArchivedFiles(userId: string): Promise<StorageObject[]> {
  const archivePrefix = pathUtils.buildUserPath(userId, '__archive__');
  return await listFiles(archivePrefix);
}

/**
 * Restores a file from archive to its original location or a new location
 */
export async function restoreFile(archivePath: string, targetPath?: string): Promise<void> {
  await validateUserPath(archivePath);
  
  if (!archivePath.includes('__archive__')) {
    throw new Error('File is not in archive');
  }
  
  let restorePath: string;
  
  if (targetPath) {
    await validateUserPath(targetPath);
    restorePath = targetPath;
  } else {
    // Try to reconstruct original path from archive structure
    const pathSegments = pathUtils.extractPathSegments(archivePath);
    const archiveSegments = archivePath.split('/');
    
    // Find the archive timestamp segment (after __archive__)
    const archiveIndex = archiveSegments.findIndex(seg => seg === '__archive__');
    if (archiveIndex === -1 || archiveIndex + 2 >= archiveSegments.length) {
      throw new Error('Cannot determine original path from archive structure');
    }
    
    // Extract original structure (skip user_, __archive__, and timestamp)
    const originalSegments = archiveSegments.slice(archiveIndex + 2);
    restorePath = pathUtils.buildUserPath(pathSegments.userId, ...originalSegments);
  }
  
  await moveFile(archivePath, restorePath);
}

/**
 * Permanently deletes a file from archive
 */
export async function permanentlyDeleteFile(path: string): Promise<void> {
  await validateUserPath(path);
  
  if (!path.includes('__archive__')) {
    throw new Error('Can only permanently delete files from archive');
  }
  
  const sanitizedPath = pathUtils.sanitizePath(path);
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([sanitizedPath]);
  
  if (error) {
    throw new Error(`Failed to permanently delete file: ${error.message}`);
  }
}

/**
 * Archives multiple files (bulk operation)
 */
export async function bulkArchiveFiles(paths: string[]): Promise<string[]> {
  const archivedPaths: string[] = [];
  
  for (const path of paths) {
    try {
      const archivePath = await archiveFile(path);
      archivedPaths.push(archivePath);
    } catch (error) {
      console.error(`Failed to archive file ${path}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  return archivedPaths;
}

/**
 * Archives all files in a folder (for folder deletion)
 */
export async function archiveFolder(folderPath: string): Promise<string[]> {
  await validateUserPath(folderPath);
  
  // List all files in the folder recursively
  const files = await listFiles(folderPath);
  const filePaths = files
    .filter(file => !isKeepFile(file.name))
    .map(file => `${folderPath}/${file.name}`);
  
  return await bulkArchiveFiles(filePaths);
}

// Default export with all storage operations
export const storageService: StorageService = {
  uploadFile,
  listFiles,
  downloadFile,
  triggerFileDownload,
  deleteFile,
  moveFile,
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