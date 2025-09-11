// Enhanced template types for the templates management modal

import type { Template } from './template'

// Enhanced template interface with metadata
export interface TemplateWithMetadata extends Template {
  wordCount?: number
  characterCount?: number
  lastAccessedAt?: string
  usageCount?: number
}

// Category statistics for filtering
export interface CategoryStats {
  name: string
  count: number
  lastUsed?: string
}

// Template loading state
export interface TemplateLoadingState {
  isLoading: boolean
  error: string | null
  lastLoadTime: number | null
  retryCount: number
}

// Template search result with highlighting
export interface TemplateSearchResult {
  template: TemplateWithMetadata
  matchScore: number
  matchedFields: ('title' | 'content' | 'category')[]
  highlights?: {
    title?: string
    content?: string
  }
}

// Modal state management
export interface TemplatesModalState {
  isOpen: boolean
  templates: TemplateWithMetadata[]
  filteredTemplates: TemplateWithMetadata[]
  categories: CategoryStats[]
  selectedCategory: string
  searchQuery: string
  loadingState: TemplateLoadingState
  sortBy: 'title' | 'created' | 'modified' | 'usage'
  sortOrder: 'asc' | 'desc'
  viewMode: 'grid' | 'list'
}

// Template cache entry
export interface TemplateCacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
}

// Cache options
export interface TemplateCacheOptions {
  maxSize: number
  ttlMs: number
  enableLRU: boolean
}

// Template operation result
export interface TemplateOperationResult {
  success: boolean
  error?: string
  template?: Template
}

// Template bulk operations
export interface TemplateBulkOperation {
  type: 'delete' | 'move' | 'duplicate'
  templateIds: string[]
  targetCategory?: string
}

// Template export options
export interface TemplateExportOptions {
  format: 'json' | 'csv' | 'pdf'
  includeMetadata: boolean
  templateIds?: string[]
  categoryFilter?: string
}

// Template import options
export interface TemplateImportOptions {
  format: 'json' | 'csv'
  overwriteExisting: boolean
  defaultCategory?: string
}

// Template validation context
export interface TemplateValidationContext {
  userId: string
  existingTitles: string[]
  existingCategories: string[]
  isUpdate: boolean
  templateId?: string
}

// Template performance metrics
export interface TemplatePerformanceMetrics {
  loadTime: number
  cacheHitRate: number
  searchTime: number
  renderTime: number
  memoryUsage: number
}

// Template analytics data
export interface TemplateAnalytics {
  totalTemplates: number
  templatesPerCategory: Record<string, number>
  averageTemplateSize: number
  mostUsedTemplates: Array<{
    id: string
    title: string
    usageCount: number
  }>
  recentActivity: Array<{
    action: 'created' | 'updated' | 'deleted' | 'used'
    templateId: string
    templateTitle: string
    timestamp: string
  }>
}