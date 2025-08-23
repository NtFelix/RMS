/**
 * Cloud Storage Constants
 * Centralized configuration for cloud storage feature
 */

// Supabase Storage configuration
export const STORAGE_CONFIG = {
  BUCKET_NAME: 'documents',
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large uploads
} as const;

// Folder structure constants
export const FOLDER_STRUCTURE = {
  ROOT_FOLDERS: {
    HOUSES: 'haeuser',
    APARTMENTS: 'wohnungen', 
    TENANTS: 'mieter',
    MISC: 'sonstiges',
  },
  DISPLAY_NAMES: {
    haeuser: 'Häuser',
    wohnungen: 'Wohnungen',
    mieter: 'Mieter',
    sonstiges: 'Sonstiges',
  },
} as const;

// File type categories for UI
export const FILE_TYPE_CATEGORIES = {
  DOCUMENTS: {
    name: 'Dokumente',
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    icon: 'file-text',
  },
  SPREADSHEETS: {
    name: 'Tabellen',
    types: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    icon: 'table',
  },
  IMAGES: {
    name: 'Bilder',
    types: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
    ],
    icon: 'image',
  },
  ARCHIVES: {
    name: 'Archive',
    types: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    icon: 'archive',
  },
} as const;

// UI configuration
export const UI_CONFIG = {
  // File list pagination
  FILES_PER_PAGE: 50,
  
  // Upload configuration
  MAX_CONCURRENT_UPLOADS: 3,
  UPLOAD_RETRY_ATTEMPTS: 3,
  UPLOAD_RETRY_DELAY: 1000, // ms
  
  // Preview configuration
  PREVIEW_SUPPORTED_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  
  // Search configuration
  SEARCH_DEBOUNCE_DELAY: 300, // ms
  MIN_SEARCH_LENGTH: 2,
  
  // File list display
  THUMBNAIL_SIZE: 40, // px
  MAX_FILENAME_LENGTH: 50,
} as const;

// Error messages in German
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'Die Datei ist zu groß',
  INVALID_FILE_TYPE: 'Dateityp wird nicht unterstützt',
  STORAGE_QUOTA_EXCEEDED: 'Speicherplatz überschritten',
  UPLOAD_FAILED: 'Upload fehlgeschlagen',
  FILE_NOT_FOUND: 'Datei nicht gefunden',
  PERMISSION_DENIED: 'Keine Berechtigung',
  FOLDER_NOT_EMPTY: 'Ordner ist nicht leer',
  INVALID_FOLDER_NAME: 'Ungültiger Ordnername',
  DUPLICATE_NAME: 'Name bereits vorhanden',
  NETWORK_ERROR: 'Netzwerkfehler',
  UNKNOWN_ERROR: 'Unbekannter Fehler',
} as const;

// Success messages in German
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'Datei erfolgreich hochgeladen',
  FILE_DELETED: 'Datei erfolgreich gelöscht',
  FILE_MOVED: 'Datei erfolgreich verschoben',
  FILE_RENAMED: 'Datei erfolgreich umbenannt',
  FOLDER_CREATED: 'Ordner erfolgreich erstellt',
  FOLDER_DELETED: 'Ordner erfolgreich gelöscht',
  FOLDER_RENAMED: 'Ordner erfolgreich umbenannt',
  FILES_UPLOADED: 'Dateien erfolgreich hochgeladen',
} as const;

// Subscription plan limits
export const SUBSCRIPTION_LIMITS = {
  BASIC: {
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    canShare: false,
    canBulkOperations: false,
    maxFoldersPerCategory: 50,
  },
  PREMIUM: {
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 50 * 1024 * 1024, // 50MB
    canShare: true,
    canBulkOperations: true,
    maxFoldersPerCategory: 200,
  },
} as const;

// File operation timeouts
export const TIMEOUTS = {
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  DOWNLOAD_TIMEOUT: 2 * 60 * 1000, // 2 minutes
  DELETE_TIMEOUT: 30 * 1000, // 30 seconds
  FOLDER_OPERATION_TIMEOUT: 10 * 1000, // 10 seconds
} as const;