/**
 * Shared file type constants for finance file uploads
 * Used by both the upload API and the file upload component
 */

// Supported MIME types for file uploads
export const SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
] as const;

// File extensions for the file input accept attribute
export const SUPPORTED_FILE_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
] as const;

// Accept string for file inputs
export const FILE_INPUT_ACCEPT = SUPPORTED_FILE_EXTENSIONS.join(",");

// Maximum file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Human-readable max file size
export const MAX_FILE_SIZE_LABEL = "10MB";

// Type for supported MIME types
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

// Check if a MIME type is supported
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
    return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}
