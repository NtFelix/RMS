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
  moveFolder(oldFolderPath: string, newFolderPath: string): Promise<void>;
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
    let sanitizedPath = pathUtils.sanitizePath(path);

    // Clean up path to avoid issues with folder creation
    sanitizedPath = sanitizedPath.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');

    console.log('Storage service uploading file:', {
      originalPath: path,
      sanitizedPath,
      fileName: file.name,
      fileSize: file.size
    });

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
            console.error('Supabase upload error:', error);
            throw mapError(error, 'upload_file');
          }

          console.log('Upload successful:', {
            path: sanitizedPath,
            fileName: file.name,
            uploadedPath: data?.path
          });

          // Insert metadata into Dokumente_Metadaten table
          try {
            const pathSegments = sanitizedPath.split('/');
            const fileName = pathSegments.pop() || file.name;
            const directoryPath = pathSegments.join('/');
            const userId = await getCurrentUserId();

            // Check if file already exists in DB (for upsert)
            const { data: existingFile } = await supabase
              .from('Dokumente_Metadaten')
              .select('id')
              .eq('dateipfad', directoryPath)
              .eq('dateiname', fileName)
              .eq('user_id', userId)
              .single();

            if (existingFile) {
              // Update existing record
              await supabase
                .from('Dokumente_Metadaten')
                .update({
                  dateigroesse: file.size,
                  mime_type: file.type,
                  aktualisierungsdatum: new Date().toISOString(),
                  letzter_zugriff: new Date().toISOString()
                })
                .eq('id', existingFile.id);
            } else {
              // Insert new record
              await supabase
                .from('Dokumente_Metadaten')
                .insert({
                  dateipfad: directoryPath,
                  dateiname: fileName,
                  dateigroesse: file.size,
                  mime_type: file.type,
                  user_id: userId
                });
            }
          } catch (dbError) {
            console.error('Failed to update Dokumente_Metadaten:', dbError);

            // Critical consistency fix: cleanup the orphaned file from storage
            try {
              await supabase.storage
                .from(STORAGE_BUCKET)
                .remove([sanitizedPath]);
              console.log('Cleaned up orphaned file after DB failure:', sanitizedPath);
            } catch (cleanupError) {
              console.error('CRITICAL: Failed to cleanup orphaned file:', sanitizedPath, cleanupError);
            }

            // Re-throw to fail the upload operation
            throw new Error('Failed to save file metadata');
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

    console.error('Upload failed:', {
      path,
      fileName: file.name,
      error: storageError
    });

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
      const supabase = createClient();
      const userId = await getCurrentUserId();

      // Query Dokumente_Metadaten table instead of storage.list
      let query = supabase
        .from('Dokumente_Metadaten')
        .select('*')
        .eq('dateipfad', sanitizedPrefix)
        .eq('user_id', userId);

      // Apply sorting
      const sortBy = options?.sortBy || 'name';
      const sortOrder = options?.sortOrder || 'asc';

      let dbSortColumn = 'dateiname';
      if (sortBy === 'updated_at') dbSortColumn = 'aktualisierungsdatum';
      if (sortBy === 'size') dbSortColumn = 'dateigroesse';

      query = query.order(dbSortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying Dokumente_Metadaten:', error);
        // Fallback to storage list if DB query fails? 
        // For now, throw error as we want to rely on DB
        throw mapError(error, 'list_files');
      }

      return (data || []).map(item => ({
        name: item.dateiname,
        id: item.id,
        updated_at: item.aktualisierungsdatum || new Date().toISOString(),
        created_at: item.erstellungsdatum || new Date().toISOString(),
        last_accessed_at: item.letzter_zugriff || new Date().toISOString(),
        metadata: {
          mimetype: item.mime_type,
          size: item.dateigroesse
        },
        size: Number(item.dateigroesse) || 0,
      }));
    });

    const endTime = Date.now();
    performanceMonitor.addMetric({
      queryTime: endTime - startTime,
      resultCount: result.length,
      cacheHit: false,
      retryCount: 0,
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
 * Permanently deletes a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const supabase = createClient();

    // Remove the leading slash if present (Supabase doesn't like it)
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    console.log('Deleting file at path:', cleanPath);

    // Make sure to use the correct bucket name that matches your Supabase storage
    const { error } = await supabase.storage
      .from('documents')
      .remove([cleanPath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    // Delete from Dokumente_Metadaten is now handled by a database trigger
    // on the storage.objects table (see migration 20251124000003)

    console.log('Successfully deleted file:', cleanPath);
  } catch (error) {
    console.error('Error in deleteFile:', error);
    throw error;
  }
}

/**
 * Debug function to list all files in a directory with detailed information
 */
export async function debugListDirectory(path: string): Promise<void> {
  try {
    const supabase = createClient();
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    console.log('🔍 Debug: Listing directory:', cleanPath);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(cleanPath, {
        limit: 1000
      });

    if (error) {
      console.error('❌ Debug: Error listing directory:', error);
      return;
    }

    console.log('📁 Debug: Directory contents:', {
      path: cleanPath,
      itemCount: data?.length || 0,
      items: data?.map(item => ({
        name: item.name,
        id: item.id,
        size: item.metadata?.size,
        hasMetadata: !!item.metadata,
        metadataKeys: item.metadata ? Object.keys(item.metadata) : [],
        created: item.created_at,
        updated: item.updated_at
      })) || []
    });
  } catch (error) {
    console.error('❌ Debug: Exception listing directory:', error);
  }
}

/**
 * Moves a file from one path to another
 */
export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  await validateUserPath(oldPath);
  await validateUserPath(newPath);

  // Clean paths - remove leading slashes and normalize
  let cleanOldPath = oldPath.startsWith('/') ? oldPath.slice(1) : oldPath;
  let cleanNewPath = newPath.startsWith('/') ? newPath.slice(1) : newPath;

  // Normalize paths to avoid double slashes
  cleanOldPath = cleanOldPath.replace(/\/+/g, '/');
  cleanNewPath = cleanNewPath.replace(/\/+/g, '/');

  console.log('🔄 Starting move operation:', {
    originalOldPath: oldPath,
    originalNewPath: newPath,
    cleanOldPath,
    cleanNewPath,
    bucket: STORAGE_BUCKET
  });

  const supabase = createClient();

  // Check if source file exists in DB
  const oldPathSegments = cleanOldPath.split('/');
  const sourceDirectory = oldPathSegments.slice(0, -1).join('/');
  let fileName = oldPathSegments[oldPathSegments.length - 1];
  const userId = await getCurrentUserId();

  console.log('🔍 Checking source file existence in DB:', {
    sourceDirectory,
    fileName,
    fullOldPath: cleanOldPath
  });

  const { data: sourceFile, error: sourceFileError } = await supabase
    .from('Dokumente_Metadaten')
    .select('*')
    .eq('dateipfad', sourceDirectory)
    .eq('dateiname', fileName)
    .eq('user_id', userId)
    .single();

  if (sourceFileError || !sourceFile) {
    // Try case-insensitive search if exact match fails
    const { data: similarFiles } = await supabase
      .from('Dokumente_Metadaten')
      .select('*')
      .eq('dateipfad', sourceDirectory)
      .eq('user_id', userId)
      .ilike('dateiname', fileName); // Case insensitive match

    if (similarFiles && similarFiles.length > 0) {
      const matchedFile = similarFiles[0];
      fileName = matchedFile.dateiname;
      console.log('✅ Found file with case-insensitive match in DB:', fileName);
    } else {
      console.error('❌ Source file not found in DB:', {
        searchedFor: fileName,
        inDirectory: sourceDirectory
      });
      // Fallback to storage check if not in DB (migration scenario)
      // But for now, we assume DB is source of truth
      throw new Error(`Source file not found: ${fileName} in ${sourceDirectory}`);
    }
  } else {
    console.log('✅ Source file found in DB');
  }

  // Update paths if fileName was corrected
  cleanOldPath = `${sourceDirectory}/${fileName}`;

  // Ensure target directory exists by checking if we can list it
  const newPathSegments = cleanNewPath.split('/');
  const targetDirectory = newPathSegments.slice(0, -1).join('/');
  let targetFileName = newPathSegments[newPathSegments.length - 1];

  // If we corrected the source fileName, also update the target
  if (fileName !== oldPathSegments[oldPathSegments.length - 1]) {
    targetFileName = fileName;
    cleanNewPath = `${targetDirectory}/${targetFileName}`;
    console.log('🔄 Updated target path to match corrected filename:', cleanNewPath);
  }

  console.log('🎯 Checking target directory:', {
    targetDirectory,
    targetFileName,
    fullNewPath: cleanNewPath,
    pathSegments: newPathSegments
  });

  // Check if target file already exists in DB
  const { data: targetFile } = await supabase
    .from('Dokumente_Metadaten')
    .select('id')
    .eq('dateipfad', targetDirectory)
    .eq('dateiname', targetFileName)
    .eq('user_id', userId)
    .single();

  const targetFileExists = !!targetFile;
  if (targetFileExists) {
    console.warn('⚠️ Target file already exists, move will overwrite it');
  }

  // Perform the move operation
  console.log('🚀 Performing move operation:', {
    from: cleanOldPath,
    to: cleanNewPath,
    willOverwrite: targetFileExists
  });

  // Update Dokumente_Metadaten BEFORE storage move
  // This prevents the delete trigger from deleting the metadata if the move is implemented as copy+delete
  try {
    const oldPathSegments = cleanOldPath.split('/');
    const oldFileName = oldPathSegments.pop();
    const oldDirectoryPath = oldPathSegments.join('/');

    const newPathSegments = cleanNewPath.split('/');
    const newFileName = newPathSegments.pop();
    const newDirectoryPath = newPathSegments.join('/');

    const userId = await getCurrentUserId();

    console.log('📝 Updating DB metadata before storage move...');
    const { error: dbUpdateError } = await supabase
      .from('Dokumente_Metadaten')
      .update({
        dateipfad: newDirectoryPath,
        dateiname: newFileName,
        aktualisierungsdatum: new Date().toISOString()
      })
      .eq('dateipfad', oldDirectoryPath)
      .eq('dateiname', oldFileName)
      .eq('user_id', userId);

    if (dbUpdateError) {
      console.error('❌ Failed to update DB metadata:', dbUpdateError);
      throw new Error(`Failed to update metadata: ${dbUpdateError.message}`);
    }
  } catch (dbError) {
    console.error('❌ Failed to update Dokumente_Metadaten before move:', dbError);
    throw dbError;
  }

  const { error: moveError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .move(cleanOldPath, cleanNewPath);

  // Check if the move actually worked, even if there's an error reported
  let moveActuallyWorked = false;
  if (moveError) {
    console.log('🔍 Move reported error, checking if file actually moved...');
    try {
      // Check if file exists at target location
      const { data: targetCheck, error: targetCheckError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(cleanNewPath);

      if (!targetCheckError && targetCheck) {
        console.log('✅ File found at target location despite error - move actually worked!');
        moveActuallyWorked = true;

        // Also check if source file is gone
        const { data: sourceCheck, error: sourceCheckError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(cleanOldPath);

        if (sourceCheckError) {
          console.log('✅ Source file no longer exists - move was complete');
        } else {
          console.log('⚠️ Source file still exists - this was a copy, not a move');
        }
      }
    } catch (checkError) {
      console.log('🔍 Could not verify target file existence:', checkError);
    }
  }

  // Check if the error is meaningful or just an empty object
  const hasRealError = moveError && !moveActuallyWorked && (
    moveError.message ||
    (moveError as any).statusCode ||
    moveError.name ||
    Object.keys(moveError).length > 0
  );

  if (hasRealError) {
    // Better error logging - handle empty error objects
    const errorDetails = {
      hasError: !!moveError,
      errorMessage: moveError?.message || 'No error message',
      errorCode: (moveError as any)?.statusCode || 'No status code',
      errorName: moveError?.name || 'No error name',
      errorString: JSON.stringify(moveError),
      errorKeys: Object.keys(moveError || {}),
      from: cleanOldPath,
      to: cleanNewPath
    };

    console.warn('⚠️ Direct move operation failed, trying alternative approach:', errorDetails);

    // Try alternative approach: copy then delete
    console.log('🔄 Attempting alternative approach: copy + delete...');
    try {
      // First, download the source file
      const { data: sourceFileData, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(cleanOldPath);

      if (downloadError) {
        throw new Error(`Failed to download source file: ${downloadError.message}`);
      }

      console.log('✅ Source file downloaded successfully, size:', sourceFileData?.size);

      // Upload to new location
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(cleanNewPath, sourceFileData, {
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload to target location: ${uploadError.message}`);
      }

      console.log('✅ File uploaded to target location successfully');

      // Delete original file
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([cleanOldPath]);

      if (deleteError) {
        console.warn('⚠️ File copied successfully but failed to delete original:', deleteError);
        // Don't throw error here as the file was successfully copied
        console.log('📝 Note: Original file still exists at:', cleanOldPath);
      } else {
        console.log('✅ Original file deleted successfully');
      }

      console.log('✅ Alternative move approach completed successfully');

      // Verify the file was actually moved by checking if it exists at the target
      try {
        const { data: verifyData, error: verifyError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(cleanNewPath);

        if (verifyError) {
          console.warn('⚠️ Could not verify file at target location:', verifyError);
        } else {
          console.log('✅ Verified: File exists at target location, size:', verifyData?.size);
        }
      } catch (verifyException) {
        console.warn('⚠️ Exception during verification:', verifyException);
      }

      // Don't throw an error here since the operation was successful
    } catch (alternativeError) {
      console.error('❌ Alternative move approach also failed:', alternativeError);
      throw new Error(`Move operation failed. Direct move error: ${moveError?.message || 'Unknown error'}. Alternative approach error: ${alternativeError instanceof Error ? alternativeError.message : 'Unknown error'}`);
    }
  } else if (moveActuallyWorked) {
    console.log('✅ File moved successfully using direct move (despite error report):', {
      from: cleanOldPath,
      to: cleanNewPath
    });
  } else {
    console.log('✅ File moved successfully using direct move:', {
      from: cleanOldPath,
      to: cleanNewPath
    });
  }

  // Final verification that the move was successful
  try {
    const { data: finalCheck, error: finalCheckError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(cleanNewPath);

    if (finalCheckError) {
      console.error('❌ Final verification failed - file not found at target:', finalCheckError);
      throw new Error(`Move operation may have failed - file not found at target location: ${cleanNewPath}`);
    } else {
      console.log('✅ Final verification successful - file exists at target, size:', finalCheck?.size);
    }
  } catch (finalError) {
    console.error('❌ Exception during final verification:', finalError);
    throw new Error(`Move operation verification failed: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`);
  }

  // Invalidate cache for both source and target directories
  const sourceDir = cleanOldPath.substring(0, cleanOldPath.lastIndexOf('/'));
  const targetDir = cleanNewPath.substring(0, cleanNewPath.lastIndexOf('/'));

  cacheManager.invalidatePrefix(sourceDir);
  if (sourceDir !== targetDir) {
    cacheManager.invalidatePrefix(targetDir);
  }

  // DB update is now done before storage move
  console.log('✅ DB update completed successfully');

  console.log('🎉 Move operation completed and verified successfully');
}

/**
 * Creates a signed URL for sharing a file
 * @param path - The file path in storage
 * @param expiresIn - Number of seconds until the URL expires (default: 1 hour)
 * @param options - Additional options for the signed URL
 * @returns Promise<string> - The signed URL
 */
export async function createSignedUrl(
  path: string,
  expiresIn: number = 3600, // Default: 1 hour
  options?: { download?: boolean | string }
): Promise<string> {
  try {
    await validateUserPath(path);
    const sanitizedPath = pathUtils.sanitizePath(path);

    // Remove leading slash if present
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath.slice(1) : sanitizedPath;

    console.log('Creating signed URL:', {
      originalPath: path,
      cleanPath,
      expiresIn,
      options
    });

    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, expiresIn, options);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw mapError(error, 'create_signed_url');
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL returned from Supabase');
    }

    console.log('Signed URL created successfully:', {
      path: cleanPath,
      expiresIn,
      urlLength: data.signedUrl.length
    });

    return data.signedUrl;
  } catch (error) {
    const storageError = mapError(error, 'create_signed_url');
    console.error('Failed to create signed URL:', {
      path,
      error: storageError
    });
    throw storageError;
  }
}

/**
 * Renames a file in the same directory
 */
export async function renameFile(filePath: string, newName: string): Promise<void> {
  await validateUserPath(filePath);

  // Clean the file path
  let cleanFilePath = filePath;
  if (cleanFilePath.startsWith('/')) {
    cleanFilePath = cleanFilePath.slice(1);
  }

  const pathSegments = cleanFilePath.split('/');
  const directory = pathSegments.slice(0, -1).join('/');
  const newPath = `${directory}/${newName}`;

  console.log('Storage service renaming:', {
    originalPath: cleanFilePath,
    newPath: newPath,
    directory: directory,
    newName: newName
  });

  await moveFile(cleanFilePath, newPath);
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
 * Moves a folder and all its contents to a new location
 */
export async function moveFolder(oldFolderPath: string, newFolderPath: string): Promise<void> {
  await validateUserPath(oldFolderPath);
  await validateUserPath(newFolderPath);

  // Clean paths
  let cleanOldPath = oldFolderPath.startsWith('/') ? oldFolderPath.slice(1) : oldFolderPath;
  let cleanNewPath = newFolderPath.startsWith('/') ? newFolderPath.slice(1) : newFolderPath;

  cleanOldPath = cleanOldPath.replace(/\/+/g, '/').replace(/\/$/, '');
  cleanNewPath = cleanNewPath.replace(/\/+/g, '/').replace(/\/$/, '');

  console.log('📁 Starting folder move operation:', {
    from: cleanOldPath,
    to: cleanNewPath
  });

  const supabase = createClient();

  try {
    // Get all files in the source folder recursively
    const allFiles = await getAllFilesInFolder(cleanOldPath);

    if (allFiles.length === 0) {
      console.log('📁 Folder is empty, creating target folder with .keep file');

      // Create target folder with .keep file
      const keepFilePath = `${cleanNewPath}/.keep`;
      const keepFileContent = new Blob([''], { type: 'text/plain' });

      const { error: createError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(keepFilePath, keepFileContent, {
          cacheControl: '3600',
          upsert: true
        });

      if (createError) {
        throw new Error(`Failed to create target folder: ${createError.message}`);
      }

      // Remove source .keep file if it exists
      try {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([`${cleanOldPath}/.keep`]);
      } catch (removeError) {
        console.warn('Could not remove source .keep file:', removeError);
      }

      console.log('✅ Empty folder moved successfully');
      return;
    }

    console.log(`📁 Found ${allFiles.length} files to move`);

    // Move all files
    let movedCount = 0;
    let errorCount = 0;

    for (const file of allFiles) {
      try {
        // Calculate relative path within the folder
        const relativePath = file.path.substring(cleanOldPath.length + 1);
        const targetFilePath = `${cleanNewPath}/${relativePath}`;

        console.log(`📄 Moving file ${movedCount + 1}/${allFiles.length}: ${file.name}`);

        await moveFile(file.path, targetFilePath);
        movedCount++;

        // Small delay to avoid overwhelming the server
        if (movedCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ Failed to move file ${file.name}:`, error);
        errorCount++;

        // Continue with other files even if one fails
        continue;
      }
    }

    console.log(`📁 Folder move completed: ${movedCount} files moved, ${errorCount} errors`);

    if (errorCount > 0) {
      throw new Error(`Folder move partially failed: ${errorCount} files could not be moved`);
    }

    // Clean up empty source folder structure
    await cleanupEmptyFolders(cleanOldPath);

    console.log('🎉 Folder move operation completed successfully');

  } catch (error) {
    console.error('❌ Folder move operation failed:', error);
    throw error;
  }
}

/**
 * Recursively gets all files in a folder
 */
/**
 * Recursively gets all files in a folder using database query
 */
async function getAllFilesInFolder(folderPath: string): Promise<Array<{ name: string, path: string }>> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  try {
    // Query database for all files starting with the folder path
    // We use the 'like' operator to match the folder path and any subfolders
    const { data: files, error } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateipfad, dateiname')
      .like('dateipfad', `${folderPath}%`)
      .eq('user_id', userId);

    if (error) {
      console.warn(`Could not scan folder ${folderPath} from DB:`, error);
      return [];
    }

    if (!files) return [];

    return files.map(file => ({
      name: file.dateiname,
      path: `${file.dateipfad}/${file.dateiname}`
    }));

  } catch (error) {
    console.warn(`Exception scanning folder ${folderPath}:`, error);
    return [];
  }
}

/**
 * Cleans up empty folders after moving files
 */
async function cleanupEmptyFolders(folderPath: string): Promise<void> {
  const supabase = createClient();

  try {
    // Remove any remaining .keep files using DB
    const userId = await getCurrentUserId();
    const { data: keepFilesData } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateiname')
      .eq('dateipfad', folderPath)
      .eq('dateiname', '.keep')
      .eq('user_id', userId);

    if (keepFilesData && keepFilesData.length > 0) {
      const keepFiles = [`${folderPath}/.keep`];

      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(keepFiles);

      // Also remove from DB
      await supabase
        .from('Dokumente_Metadaten')
        .delete()
        .eq('dateipfad', folderPath)
        .eq('dateiname', '.keep')
        .eq('user_id', userId);

      console.log(`🧹 Cleaned up .keep file in ${folderPath}`);
    }

  } catch (error) {
    console.warn('Could not cleanup empty folders:', error);
  }
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

// Debug function is already exported above with the function declaration