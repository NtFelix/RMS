/**
 * Path utilities for cloud storage management
 * Handles user-specific path construction, sanitization, and validation
 */

export interface PathSegments {
  userId: string;
  houseId?: string;
  apartmentId?: string;
  tenantId?: string;
  category?: string;
  filename?: string;
}

export interface PathUtils {
  buildUserPath(userId: string, ...segments: string[]): string;
  buildHousePath(userId: string, houseId: string): string;
  buildApartmentPath(userId: string, houseId: string, apartmentId: string): string;
  buildTenantPath(userId: string, houseId: string, apartmentId: string, tenantId: string): string;
  sanitizePath(path: string): string;
  extractPathSegments(path: string): PathSegments;
  validatePath(path: string): boolean;
  isUserPath(path: string, userId: string): boolean;
}

// Maximum path length to prevent issues
const MAX_PATH_LENGTH = 1000;

// Dangerous characters that should be removed or replaced
const DANGEROUS_CHARS = /[<>:"|?*\x00-\x1f]/g;
const PATH_TRAVERSAL = /\.\./g;

/**
 * Sanitizes a path segment by removing dangerous characters and normalizing
 */
export function sanitizePathSegment(segment: string): string {
  return segment
    .replace(DANGEROUS_CHARS, '')
    .replace(PATH_TRAVERSAL, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '') // Allow dots for file extensions
    .substring(0, 255); // Limit individual segment length
}

/**
 * Builds a user-specific path with proper sanitization
 */
export function buildUserPath(userId: string, ...segments: string[]): string {
  const sanitizedUserId = sanitizePathSegment(userId);
  const sanitizedSegments = segments.map(segment => sanitizePathSegment(segment)).filter(Boolean);
  
  let path = `user_${sanitizedUserId}`;
  if (sanitizedSegments.length > 0) {
    path += `/${sanitizedSegments.join('/')}`;
  }
  
  // Check length before truncation to properly validate
  const originalPath = segments.length > 0 ? `user_${userId}/${segments.join('/')}` : `user_${userId}`;
  if (originalPath.length > MAX_PATH_LENGTH) {
    throw new Error(`Path too long: ${originalPath.length} characters (max: ${MAX_PATH_LENGTH})`);
  }
  
  return path;
}

/**
 * Builds a house-specific path
 */
export function buildHousePath(userId: string, houseId: string): string {
  return buildUserPath(userId, houseId);
}

/**
 * Builds an apartment-specific path
 */
export function buildApartmentPath(userId: string, houseId: string, apartmentId: string): string {
  return buildUserPath(userId, houseId, apartmentId);
}

/**
 * Builds a tenant-specific path
 */
export function buildTenantPath(userId: string, houseId: string, apartmentId: string, tenantId: string): string {
  return buildUserPath(userId, houseId, apartmentId, tenantId);
}

/**
 * Sanitizes a complete path
 */
export function sanitizePath(path: string): string {
  // Remove leading/trailing slashes and normalize
  const normalized = path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  
  // Split into segments and sanitize each
  const segments = normalized.split('/').map(segment => sanitizePathSegment(segment));
  
  return segments.join('/');
}

/**
 * Extracts path segments from a storage path
 */
export function extractPathSegments(path: string): PathSegments {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0 || !segments[0].startsWith('user_')) {
    throw new Error('Invalid path format: must start with user_ prefix');
  }
  
  const userId = segments[0].replace('user_', '');
  const result: PathSegments = { userId };
  
  if (segments.length > 1) {
    // Check if it's an archive path
    if (segments[1] === '__archive__') {
      result.category = 'archive';
      // Extract filename from archive path if present
      if (segments.length > 3) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment.includes('.') && !lastSegment.startsWith('.')) {
          result.filename = lastSegment;
        }
      }
      return result;
    }
    
    // Check if it's miscellaneous
    if (segments[1] === 'miscellaneous') {
      result.category = 'miscellaneous';
      // Extract filename from miscellaneous path if present
      if (segments.length > 2) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment.includes('.') && !lastSegment.startsWith('.')) {
          result.filename = lastSegment;
        }
      }
      return result;
    }
    
    // Otherwise, it's a house path
    result.houseId = segments[1];
    
    if (segments.length > 2) {
      // Check for house_documents category
      if (segments[2] === 'house_documents') {
        result.category = 'house_documents';
      } else {
        // It's an apartment
        result.apartmentId = segments[2];
        
        if (segments.length > 3) {
          // Check for apartment_documents category
          if (segments[3] === 'apartment_documents') {
            result.category = 'apartment_documents';
          } else {
            // It's a tenant
            result.tenantId = segments[3];
          }
        }
      }
    }
  }
  
  // Extract filename if present (last segment with extension)
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('.') && !lastSegment.startsWith('.')) {
      result.filename = lastSegment;
    }
  }
  
  return result;
}

/**
 * Validates a path for security and format compliance
 */
export function validatePath(path: string): boolean {
  try {
    // Check length
    if (path.length > MAX_PATH_LENGTH) {
      return false;
    }
    
    // Check for dangerous patterns
    if (DANGEROUS_CHARS.test(path) || PATH_TRAVERSAL.test(path)) {
      return false;
    }
    
    // Must start with user_ prefix
    if (!path.startsWith('user_')) {
      return false;
    }
    
    // Try to extract segments (will throw if invalid)
    extractPathSegments(path);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path belongs to a specific user
 */
export function isUserPath(path: string, userId: string): boolean {
  const sanitizedUserId = sanitizePathSegment(userId);
  return path.startsWith(`user_${sanitizedUserId}`) && 
         (path === `user_${sanitizedUserId}` || path.startsWith(`user_${sanitizedUserId}/`));
}

/**
 * Creates a .keep file path for empty folders
 */
export function createKeepFilePath(folderPath: string): string {
  return `${folderPath}/.keep`;
}

/**
 * Checks if a path is a .keep placeholder file
 */
export function isKeepFile(path: string): boolean {
  return path.endsWith('/.keep');
}

/**
 * Filters out .keep files from a file list
 */
export function filterKeepFiles<T extends { name: string }>(files: T[]): T[] {
  return files.filter(file => !isKeepFile(file.name));
}

/**
 * Checks if a folder should be considered empty (only contains .keep file or no files)
 */
export function isFolderEmpty<T extends { name: string }>(files: T[]): boolean {
  const nonKeepFiles = filterKeepFiles(files);
  return nonKeepFiles.length === 0;
}

/**
 * Builds an archive path with timestamp and preserved structure
 */
export function buildArchivePath(userId: string, timestamp: string, ...segments: string[]): string {
  return buildUserPath(userId, '__archive__', timestamp, ...segments);
}

/**
 * Checks if a path is in the archive
 */
export function isArchivePath(path: string): boolean {
  return path.includes('/__archive__/');
}

/**
 * Extracts the timestamp from an archive path
 */
export function extractArchiveTimestamp(archivePath: string): string | null {
  const segments = archivePath.split('/');
  const archiveIndex = segments.findIndex(seg => seg === '__archive__');
  
  if (archiveIndex === -1 || archiveIndex + 1 >= segments.length) {
    return null;
  }
  
  return segments[archiveIndex + 1];
}

/**
 * Reconstructs the original path from an archive path
 */
export function reconstructOriginalPath(archivePath: string): string | null {
  const segments = archivePath.split('/');
  const archiveIndex = segments.findIndex(seg => seg === '__archive__');
  
  if (archiveIndex === -1 || archiveIndex + 2 >= segments.length) {
    return null;
  }
  
  // Extract user ID and original segments (skip __archive__ and timestamp)
  const userId = segments[0].replace('user_', '');
  const originalSegments = segments.slice(archiveIndex + 2);
  
  return buildUserPath(userId, ...originalSegments);
}

// Default export with all utilities
export const pathUtils: PathUtils = {
  buildUserPath,
  buildHousePath,
  buildApartmentPath,
  buildTenantPath,
  sanitizePath,
  extractPathSegments,
  validatePath,
  isUserPath,
};