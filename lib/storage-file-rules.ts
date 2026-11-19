/**
 * Rules for uploaded files, shared by the browser (validateFile in lib/storage-service.ts) and the server
 * (lib/storage-operations.ts checks the size and type that storage reports, never what the client claims).
 */

// Supported file types for validation
export const SUPPORTED_FILE_TYPES = {
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
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Paths per bulk request (remove, signed URLs, archive): bounds the work of one action call */
export const MAX_PATHS_PER_REQUEST = 200;

/** Validates size and MIME type of a file (the browser File or the object info of storage) */
export function validateFileInfo(file: { size: number; type: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Supported types: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}`
    };
  }

  return { valid: true };
}
