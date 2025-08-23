/**
 * Cloud storage service for file management
 * Provides interface for Supabase Storage operations with security and validation
 */

import { createClient } from '@/utils/supabase/client';
import { pathUtils, validatePath, isUserPath } from './path-utils';

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
  deleteFile(path: string): Promise<void>;
  moveFile(oldPath: string, newPath: string): Promise<void>;
  createPlaceholder(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
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
 * Uploads a file to storage
 */
export async function uploadFile(
  file: File, 
  path: string, 
  options: UploadOptions = {}
): Promise<StorageResult> {
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
    
    const supabase = createClient();
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(sanitizedPath, file, {
        upsert: options.upsert || false,
        contentType: options.contentType || file.type,
      });
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Lists files with a given prefix
 */
export async function listFiles(prefix: string): Promise<StorageObject[]> {
  await validateUserPath(prefix);
  const sanitizedPrefix = pathUtils.sanitizePath(prefix);
  
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(sanitizedPrefix, {
      limit: 1000, // Reasonable limit for performance
      sortBy: { column: 'name', order: 'asc' }
    });
  
  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
  
  // Map FileObject[] to StorageObject[]
  return (data || []).map(file => ({
    name: file.name,
    id: file.id || file.name, // Use name as fallback for id
    updated_at: file.updated_at || new Date().toISOString(),
    created_at: file.created_at || new Date().toISOString(),
    last_accessed_at: file.last_accessed_at || new Date().toISOString(),
    metadata: file.metadata || {},
    size: file.metadata?.size || 0, // Extract size from metadata
  }));
}

/**
 * Downloads a file from storage
 */
export async function downloadFile(path: string): Promise<Blob> {
  await validateUserPath(path);
  const sanitizedPath = pathUtils.sanitizePath(path);
  
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(sanitizedPath);
  
  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
  
  return data;
}

/**
 * Deletes a file from storage (moves to archive)
 */
export async function deleteFile(path: string): Promise<void> {
  await validateUserPath(path);
  
  // Instead of permanent deletion, move to archive
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = pathUtils.buildUserPath(userId, '__archive__', timestamp, path.split('/').pop() || 'unknown');
  
  await moveFile(path, archivePath);
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

// Default export with all storage operations
export const storageService: StorageService = {
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  moveFile,
  createPlaceholder,
  getFileUrl,
};