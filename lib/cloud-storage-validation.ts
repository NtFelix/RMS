/**
 * Cloud Storage Validation Utilities
 * File validation, constants, and utility functions
 */

import { FileValidationResult, FileError, SubscriptionLimits } from '@/types/cloud-storage';

// File validation constants
export const FILE_VALIDATION_CONSTANTS = {
  // File size limits (in bytes)
  MAX_FILE_SIZE_BASIC: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_PREMIUM: 50 * 1024 * 1024, // 50MB
  
  // Storage quotas (in bytes)
  STORAGE_QUOTA_BASIC: 100 * 1024 * 1024, // 100MB
  STORAGE_QUOTA_PREMIUM: 1024 * 1024 * 1024, // 1GB
  
  // Warning thresholds
  STORAGE_WARNING_THRESHOLD: 0.8, // 80%
  STORAGE_CRITICAL_THRESHOLD: 0.95, // 95%
  
  // Allowed file types
  ALLOWED_FILE_TYPES: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  
  // File extensions mapping
  FILE_EXTENSIONS: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-7z-compressed': ['.7z'],
  },
  
  // Folder name validation
  FOLDER_NAME_MAX_LENGTH: 100,
  FOLDER_NAME_INVALID_CHARS: /[<>:"/\\|?*\x00-\x1f]/,
  RESERVED_FOLDER_NAMES: ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'],
} as const;

/**
 * Validates a file against size and type constraints
 */
export function validateFile(
  file: File, 
  subscriptionLimits: SubscriptionLimits
): FileValidationResult {
  const errors: string[] = [];

  // Check file size
  if (file.size > subscriptionLimits.maxFileSize) {
    errors.push(`Datei ist zu groß. Maximum: ${formatFileSize(subscriptionLimits.maxFileSize)}`);
  }

  // Check file type
  if (!subscriptionLimits.allowedFileTypes.includes(file.type)) {
    errors.push(`Dateityp nicht unterstützt: ${file.type}`);
  }

  // Check file name
  if (file.name.length > 255) {
    errors.push('Dateiname ist zu lang (max. 255 Zeichen)');
  }

  // Check for invalid characters in filename
  if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    errors.push('Dateiname enthält ungültige Zeichen');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates multiple files for batch upload
 */
export function validateFiles(
  files: File[], 
  subscriptionLimits: SubscriptionLimits,
  currentStorageUsed: number = 0
): { validFiles: File[]; invalidFiles: { file: File; errors: string[] }[] } {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; errors: string[] }[] = [];
  let totalSize = currentStorageUsed;

  for (const file of files) {
    const validation = validateFile(file, subscriptionLimits);
    
    // Check if adding this file would exceed storage quota
    if (totalSize + file.size > subscriptionLimits.maxStorageBytes) {
      validation.errors.push('Speicherplatz würde überschritten werden');
      validation.isValid = false;
    }

    if (validation.isValid) {
      validFiles.push(file);
      totalSize += file.size;
    } else {
      invalidFiles.push({ file, errors: validation.errors });
    }
  }

  return { validFiles, invalidFiles };
}

/**
 * Validates folder name
 */
export function validateFolderName(name: string): FileValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Ordnername darf nicht leer sein');
  }

  if (name.length > FILE_VALIDATION_CONSTANTS.FOLDER_NAME_MAX_LENGTH) {
    errors.push(`Ordnername ist zu lang (max. ${FILE_VALIDATION_CONSTANTS.FOLDER_NAME_MAX_LENGTH} Zeichen)`);
  }

  if (FILE_VALIDATION_CONSTANTS.FOLDER_NAME_INVALID_CHARS.test(name)) {
    errors.push('Ordnername enthält ungültige Zeichen');
  }

  if (FILE_VALIDATION_CONSTANTS.RESERVED_FOLDER_NAMES.includes(name.toUpperCase())) {
    errors.push('Ordnername ist reserviert und nicht erlaubt');
  }

  if (name.startsWith('.') || name.endsWith('.')) {
    errors.push('Ordnername darf nicht mit einem Punkt beginnen oder enden');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if storage quota warning should be shown
 */
export function getStorageQuotaStatus(used: number, limit: number): {
  percentage: number;
  status: 'ok' | 'warning' | 'critical' | 'exceeded';
  message?: string;
} {
  const percentage = used / limit;

  if (percentage >= 1) {
    return {
      percentage,
      status: 'exceeded',
      message: 'Speicherplatz ist vollständig belegt',
    };
  }

  if (percentage >= FILE_VALIDATION_CONSTANTS.STORAGE_CRITICAL_THRESHOLD) {
    return {
      percentage,
      status: 'critical',
      message: 'Speicherplatz ist fast vollständig belegt',
    };
  }

  if (percentage >= FILE_VALIDATION_CONSTANTS.STORAGE_WARNING_THRESHOLD) {
    return {
      percentage,
      status: 'warning',
      message: 'Speicherplatz wird knapp',
    };
  }

  return {
    percentage,
    status: 'ok',
  };
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets file type category for display
 */
export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Bild';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Dokument';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Tabelle';
  if (mimeType.startsWith('text/')) return 'Text';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archiv';
  return 'Datei';
}

/**
 * Gets subscription limits based on plan
 */
export function getSubscriptionLimits(plan: 'basic' | 'premium'): SubscriptionLimits {
  const isBasic = plan === 'basic';
  
  return {
    maxStorageBytes: isBasic 
      ? FILE_VALIDATION_CONSTANTS.STORAGE_QUOTA_BASIC 
      : FILE_VALIDATION_CONSTANTS.STORAGE_QUOTA_PREMIUM,
    maxFileSize: isBasic 
      ? FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_BASIC 
      : FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_PREMIUM,
    allowedFileTypes: FILE_VALIDATION_CONSTANTS.ALLOWED_FILE_TYPES,
    canShare: !isBasic,
    canBulkOperations: !isBasic,
  };
}

/**
 * Sanitizes filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove or replace invalid characters
  let sanitized = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Trim whitespace and dots
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'unnamed_file';
  }
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension;
  }
  
  return sanitized;
}

/**
 * Generates unique filename if duplicate exists
 */
export function generateUniqueFileName(fileName: string, existingNames: string[]): string {
  let uniqueName = fileName;
  let counter = 1;
  
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  
  while (existingNames.includes(uniqueName)) {
    uniqueName = `${nameWithoutExt} (${counter})${extension}`;
    counter++;
  }
  
  return uniqueName;
}