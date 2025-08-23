/**
 * Cloud Storage Types and Interfaces
 * Defines core types for file management system
 */

// File-related interfaces
export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  path: string;
  url?: string;
  entityType?: 'haus' | 'wohnung' | 'mieter' | 'sonstiges';
  entityId?: string;
  storagePath: string;
}

// Folder structure interfaces
export interface FolderNode {
  id: string;
  name: string;
  path: string;
  type: 'root' | 'category' | 'entity' | 'custom';
  entityId?: string;
  entityType?: 'haus' | 'wohnung' | 'mieter';
  children: FolderNode[];
  fileCount: number;
  parentPath?: string;
}

// Storage operation interfaces
export interface StorageOperations {
  uploadFile: (file: File, folderPath: string) => Promise<FileUploadResult>;
  downloadFile: (fileId: string) => Promise<Blob>;
  deleteFile: (fileId: string) => Promise<void>;
  moveFile: (fileId: string, newPath: string) => Promise<void>;
  copyFile: (fileId: string, newPath: string) => Promise<FileItem>;
  renameFile: (fileId: string, newName: string) => Promise<FileItem>;
}

export interface FolderOperations {
  createFolder: (parentPath: string, folderName: string) => Promise<FolderNode>;
  deleteFolder: (folderPath: string) => Promise<void>;
  renameFolder: (folderPath: string, newName: string) => Promise<FolderNode>;
  getFolderTree: (userId: string) => Promise<FolderNode[]>;
  getFolderContents: (folderPath: string) => Promise<{
    folders: FolderNode[];
    files: FileItem[];
  }>;
}

// Upload and validation interfaces
export interface FileUploadResult {
  success: boolean;
  file?: FileItem;
  error?: string;
  progress?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StorageQuota {
  used: number;
  limit: number;
  percentage: number;
}

// Entity integration interfaces
export interface EntityFolder {
  entityType: 'haus' | 'wohnung' | 'mieter';
  entityId: string;
  entityName: string;
  folderPath: string;
}

// Search and filter interfaces
export interface FileSearchParams {
  query?: string;
  fileType?: string;
  entityType?: 'haus' | 'wohnung' | 'mieter' | 'sonstiges';
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name' | 'size' | 'uploadedAt' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface FileSearchResult {
  files: FileItem[];
  totalCount: number;
  hasMore: boolean;
}

// Subscription and limits
export interface SubscriptionLimits {
  maxStorageBytes: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  canShare: boolean;
  canBulkOperations: boolean;
}

// Error types
export type FileError = 
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'UPLOAD_FAILED'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'FOLDER_NOT_EMPTY'
  | 'INVALID_FOLDER_NAME'
  | 'DUPLICATE_NAME';

export interface FileOperationError {
  type: FileError;
  message: string;
  details?: any;
}