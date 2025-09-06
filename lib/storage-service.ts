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
  
  // First, let's try to get the file directly to see if it exists
  console.log('🔍 Attempting direct file access...');
  try {
    const { data: fileData, error: directAccessError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(cleanOldPath);
    
    if (directAccessError) {
      console.error('❌ Direct file access failed:', directAccessError);
    } else {
      console.log('✅ Direct file access successful, file size:', fileData?.size);
    }
  } catch (directError) {
    console.error('❌ Exception during direct file access:', directError);
  }
  
  // Check if source file exists by listing the directory
  const oldPathSegments = cleanOldPath.split('/');
  const sourceDirectory = oldPathSegments.slice(0, -1).join('/');
  let fileName = oldPathSegments[oldPathSegments.length - 1];
  
  console.log('🔍 Checking source file existence:', {
    sourceDirectory,
    fileName,
    fullOldPath: cleanOldPath,
    pathSegments: oldPathSegments
  });
  
  // Debug: List directory contents with detailed information
  await debugListDirectory(sourceDirectory || '');
  
  // List files in source directory to verify file exists
  const { data: sourceFiles, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(sourceDirectory || '', {
      limit: 1000
    });
  
  if (listError) {
    console.error('❌ Error listing source directory:', listError);
    throw new Error(`Failed to check source directory: ${listError.message}`);
  }
  
  console.log('📁 Source directory contents:', {
    directory: sourceDirectory || 'root',
    fileCount: sourceFiles?.length || 0,
    files: sourceFiles?.map(f => ({
      name: f.name,
      size: f.metadata?.size,
      type: f.metadata ? 'file' : 'folder',
      nameLength: f.name.length,
      nameBytes: new TextEncoder().encode(f.name).length
    })) || []
  });
  
  // Try multiple ways to find the file
  let fileExists = false;
  let matchedFile = null;
  
  // Exact match
  matchedFile = sourceFiles?.find(file => file.name === fileName);
  if (matchedFile) {
    fileExists = true;
    console.log('✅ Found file with exact match');
  }
  
  // Case-insensitive match
  if (!fileExists) {
    matchedFile = sourceFiles?.find(file => file.name.toLowerCase() === fileName.toLowerCase());
    if (matchedFile) {
      fileExists = true;
      console.log('✅ Found file with case-insensitive match:', {
        searched: fileName,
        found: matchedFile.name
      });
      // Update fileName to use the actual name from storage
      fileName = matchedFile.name;
    }
  }
  
  // Partial match (in case of encoding issues)
  if (!fileExists) {
    matchedFile = sourceFiles?.find(file => 
      file.name.includes(fileName) || fileName.includes(file.name)
    );
    if (matchedFile) {
      fileExists = true;
      console.log('✅ Found file with partial match:', {
        searched: fileName,
        found: matchedFile.name
      });
      // Update fileName to use the actual name from storage
      fileName = matchedFile.name;
    }
  }
  
  if (!fileExists) {
    console.error('❌ Source file not found after all attempts:', {
      searchedFor: fileName,
      searchedForLength: fileName.length,
      searchedForBytes: new TextEncoder().encode(fileName).length,
      inDirectory: sourceDirectory || 'root',
      availableFiles: sourceFiles?.map(f => ({
        name: f.name,
        length: f.name.length,
        bytes: new TextEncoder().encode(f.name).length
      })) || []
    });
    throw new Error(`Source file not found: ${fileName} in ${sourceDirectory || 'root'}`);
  }
  
  console.log('✅ Source file found in directory listing');
  
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
  
  // Try to list target directory to ensure it exists
  const { data: targetDirContents, error: targetListError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(targetDirectory || '', {
      limit: 1
    });
  
  if (targetListError) {
    console.error('❌ Error accessing target directory:', targetListError);
    
    // If target directory doesn't exist, try to create it with a .keep file
    console.log('🔧 Attempting to create target directory...');
    try {
      const keepFilePath = `${targetDirectory}/.keep`;
      const keepFileContent = new Blob([''], { type: 'text/plain' });
      
      const { error: createError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(keepFilePath, keepFileContent, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (createError) {
        console.error('❌ Failed to create target directory:', createError);
        throw new Error(`Target directory not accessible and cannot be created: ${targetListError.message}`);
      }
      
      console.log('✅ Target directory created successfully');
    } catch (createDirError) {
      console.error('❌ Exception creating target directory:', createDirError);
      throw new Error(`Target directory not accessible: ${targetListError.message}`);
    }
  } else {
    console.log('✅ Target directory accessible:', {
      directory: targetDirectory || 'root',
      itemCount: targetDirContents?.length || 0
    });
  }
  
  // Check if target file already exists
  const targetFileExists = targetDirContents?.some(file => file.name === targetFileName);
  if (targetFileExists) {
    console.warn('⚠️ Target file already exists, move will overwrite it');
  }
  
  // Perform the move operation
  console.log('🚀 Performing move operation:', {
    from: cleanOldPath,
    to: cleanNewPath,
    willOverwrite: targetFileExists
  });
  
  const { error: moveError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .move(cleanOldPath, cleanNewPath);
  
  if (moveError) {
    console.error('❌ Move operation failed:', {
      error: moveError,
      errorMessage: moveError.message,
      errorCode: moveError.statusCode,
      from: cleanOldPath,
      to: cleanNewPath
    });
    
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
      
      // Upload to new location
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(cleanNewPath, sourceFileData, {
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload to target location: ${uploadError.message}`);
      }
      
      // Delete original file
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([cleanOldPath]);
      
      if (deleteError) {
        console.warn('⚠️ File copied successfully but failed to delete original:', deleteError);
        // Don't throw error here as the file was successfully copied
      }
      
      console.log('✅ Alternative move approach successful');
    } catch (alternativeError) {
      console.error('❌ Alternative move approach also failed:', alternativeError);
      throw new Error(`Failed to move file: ${moveError.message}. Alternative approach also failed: ${alternativeError instanceof Error ? alternativeError.message : 'Unknown error'}`);
    }
  } else {
    console.log('✅ File moved successfully using direct move:', {
      from: cleanOldPath,
      to: cleanNewPath
    });
  }
  
  // Invalidate cache for both source and target directories
  const sourceDir = cleanOldPath.substring(0, cleanOldPath.lastIndexOf('/'));
  const targetDir = cleanNewPath.substring(0, cleanNewPath.lastIndexOf('/'));
  
  cacheManager.invalidatePrefix(sourceDir);
  if (sourceDir !== targetDir) {
    cacheManager.invalidatePrefix(targetDir);
  }
  
  console.log('🎉 Move operation completed successfully');
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

// Export debug function for troubleshooting
export { debugListDirectory };