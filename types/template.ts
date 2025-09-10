// Template system type definitions

// Database model matching the Vorlagen table
export interface Template {
  id: string
  titel: string
  inhalt: object // Tiptap JSON content as JSONB object
  user_id: string
  erstellungsdatum: string
  kategorie: string | null
  kontext_anforderungen: string[] // Array of variable keys used
  aktualisiert_am: string | null
}

// UI representation for template items in documents interface
export interface TemplateItem {
  id: string
  name: string // Maps to titel
  category: string | null // Maps to kategorie
  content: string // Maps to inhalt
  variables: string[] // Maps to kontext_anforderungen
  createdAt: Date // Maps to erstellungsdatum
  updatedAt: Date | null // Maps to aktualisiert_am
  size: number // Calculated from content length
  type: 'template'
}

// Request types for template operations
export interface CreateTemplateRequest {
  titel: string
  inhalt: object // Tiptap JSON object
  kategorie: string
  user_id: string
}

export interface UpdateTemplateRequest {
  titel?: string
  inhalt?: object // Tiptap JSON object
  kategorie?: string
}

// Form data for template editor
export interface TemplateFormData {
  titel: string
  inhalt: object // Tiptap JSON object
  kategorie: string
  kontext_anforderungen: string[]
}

// Validation result types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// Variable mention item for the editor
export interface MentionItem {
  id: string
  label: string
  category: string
  description?: string
  context?: string[]
}

// Modal data interfaces
export interface CategorySelectionData {
  existingCategories: string[]
  onCategorySelected: (category: string) => void
  onCancel: () => void
}

export interface TemplateEditorData {
  templateId?: string // For editing existing templates
  initialTitle?: string
  initialContent?: object
  initialCategory?: string
  isNewTemplate: boolean
  onSave: (template: TemplateFormData) => Promise<void>
  onCancel: () => void
}

// Virtual folder types for templates
export interface TemplateVirtualFolder {
  type: 'template_root' | 'template_category'
  templateCount?: number
  templates?: TemplateItem[]
}

// Error types for template operations
export enum TemplateErrorType {
  TEMPLATE_NOT_FOUND = 'template_not_found',
  INVALID_CONTENT = 'invalid_content',
  CATEGORY_REQUIRED = 'category_required',
  TITLE_REQUIRED = 'title_required',
  PERMISSION_DENIED = 'permission_denied',
  SAVE_FAILED = 'save_failed',
  LOAD_FAILED = 'load_failed'
}

export interface TemplateError {
  type: TemplateErrorType
  message: string
  details?: any
  recoverable: boolean
}