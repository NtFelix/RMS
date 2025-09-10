/**
 * Zod validation schemas for template system
 * Provides runtime type validation and schema validation for templates
 */

import { z } from 'zod'

// Constants for validation limits
export const VALIDATION_LIMITS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 255,
  CATEGORY_MAX_LENGTH: 100,
  CONTENT_MAX_SIZE: 50000, // 50KB
  VARIABLE_ID_MAX_LENGTH: 50,
  MAX_VARIABLES_PER_TEMPLATE: 50,
  MAX_CONTEXT_REQUIREMENTS: 20
} as const

// Regular expressions for validation
export const VALIDATION_PATTERNS = {
  TITLE: /^[^<>{}]*$/, // No HTML tags or special characters
  CATEGORY: /^[^<>{}\/\\]*$/, // No HTML tags or path separators
  VARIABLE_ID: /^[a-z][a-z0-9_]*[a-z0-9]$|^[a-z]$/, // Valid variable ID format
  SAFE_STRING: /^[^<>{}]*$/ // General safe string pattern
} as const

// Custom Zod refinements
const titleRefinement = (title: string) => {
  const trimmed = title.trim()
  return trimmed.length >= VALIDATION_LIMITS.TITLE_MIN_LENGTH && 
         trimmed.length <= VALIDATION_LIMITS.TITLE_MAX_LENGTH &&
         VALIDATION_PATTERNS.TITLE.test(trimmed)
}

const categoryRefinement = (category: string) => {
  const trimmed = category.trim()
  return trimmed.length > 0 && 
         trimmed.length <= VALIDATION_LIMITS.CATEGORY_MAX_LENGTH &&
         VALIDATION_PATTERNS.CATEGORY.test(trimmed)
}

const variableIdRefinement = (id: string) => {
  return VALIDATION_PATTERNS.VARIABLE_ID.test(id) && 
         id.length <= VALIDATION_LIMITS.VARIABLE_ID_MAX_LENGTH
}

// Tiptap content node schema
const TiptapNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
  content: z.array(TiptapNodeSchema).optional(),
  marks: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.any()).optional()
  })).optional(),
  text: z.string().optional()
}))

// Tiptap document schema
export const TiptapContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(TiptapNodeSchema).optional()
}).or(z.array(TiptapNodeSchema))

// Template title schema
export const TemplateTitleSchema = z.string()
  .min(VALIDATION_LIMITS.TITLE_MIN_LENGTH, {
    message: `Titel muss mindestens ${VALIDATION_LIMITS.TITLE_MIN_LENGTH} Zeichen lang sein`
  })
  .max(VALIDATION_LIMITS.TITLE_MAX_LENGTH, {
    message: `Titel darf maximal ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} Zeichen lang sein`
  })
  .refine(titleRefinement, {
    message: 'Titel enthält ungültige Zeichen oder ist leer'
  })
  .transform(title => title.trim())

// Template category schema
export const TemplateCategorySchema = z.string()
  .min(1, { message: 'Kategorie ist erforderlich' })
  .max(VALIDATION_LIMITS.CATEGORY_MAX_LENGTH, {
    message: `Kategorie darf maximal ${VALIDATION_LIMITS.CATEGORY_MAX_LENGTH} Zeichen lang sein`
  })
  .refine(categoryRefinement, {
    message: 'Kategorie enthält ungültige Zeichen'
  })
  .transform(category => category.trim())

// Template content schema
export const TemplateContentSchema = TiptapContentSchema
  .refine((content) => {
    const contentString = JSON.stringify(content)
    return contentString.length <= VALIDATION_LIMITS.CONTENT_MAX_SIZE
  }, {
    message: `Inhalt ist zu groß (maximal ${VALIDATION_LIMITS.CONTENT_MAX_SIZE} Zeichen)`
  })
  .refine((content) => {
    // Check if content is not empty
    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
      return false
    }
    
    // For Tiptap doc format
    if (typeof content === 'object' && content !== null && !Array.isArray(content) && 'type' in content && content.type === 'doc') {
      return content.content && Array.isArray(content.content) && content.content.length > 0
    }
    
    // For array format
    if (Array.isArray(content)) {
      return content.length > 0
    }
    
    return true
  }, {
    message: 'Inhalt darf nicht leer sein'
  })

// Variable ID schema
export const VariableIdSchema = z.string()
  .min(1, { message: 'Variable ID ist erforderlich' })
  .max(VALIDATION_LIMITS.VARIABLE_ID_MAX_LENGTH, {
    message: `Variable ID darf maximal ${VALIDATION_LIMITS.VARIABLE_ID_MAX_LENGTH} Zeichen lang sein`
  })
  .refine(variableIdRefinement, {
    message: 'Ungültiges Variable ID Format. Muss mit Buchstaben beginnen und darf nur Buchstaben, Zahlen und Unterstriche enthalten'
  })

// Context requirements schema
export const ContextRequirementsSchema = z.array(VariableIdSchema)
  .max(VALIDATION_LIMITS.MAX_CONTEXT_REQUIREMENTS, {
    message: `Maximal ${VALIDATION_LIMITS.MAX_CONTEXT_REQUIREMENTS} Kontext-Anforderungen erlaubt`
  })
  .refine((requirements) => {
    // Check for duplicates
    const unique = new Set(requirements)
    return unique.size === requirements.length
  }, {
    message: 'Doppelte Kontext-Anforderungen sind nicht erlaubt'
  })

// User ID schema
export const UserIdSchema = z.string().uuid({
  message: 'Ungültige Benutzer-ID'
})

// Template ID schema
export const TemplateIdSchema = z.string().uuid({
  message: 'Ungültige Vorlagen-ID'
})

// Create template request schema
export const CreateTemplateRequestSchema = z.object({
  titel: TemplateTitleSchema,
  inhalt: TemplateContentSchema,
  kategorie: TemplateCategorySchema,
  user_id: UserIdSchema
})

// Update template request schema
export const UpdateTemplateRequestSchema = z.object({
  titel: TemplateTitleSchema.optional(),
  inhalt: TemplateContentSchema.optional(),
  kategorie: TemplateCategorySchema.optional()
}).refine((data) => {
  // At least one field must be provided for update
  return data.titel !== undefined || data.inhalt !== undefined || data.kategorie !== undefined
}, {
  message: 'Mindestens ein Feld muss für die Aktualisierung angegeben werden'
})

// Template form data schema (for frontend forms)
export const TemplateFormDataSchema = z.object({
  titel: TemplateTitleSchema,
  inhalt: TemplateContentSchema,
  kategorie: TemplateCategorySchema,
  kontext_anforderungen: ContextRequirementsSchema.optional().default([])
})

// Template database model schema
export const TemplateSchema = z.object({
  id: TemplateIdSchema,
  titel: z.string(),
  inhalt: z.any(), // JSONB content
  user_id: UserIdSchema,
  erstellungsdatum: z.string().datetime(),
  kategorie: z.string().nullable(),
  kontext_anforderungen: z.array(z.string()),
  aktualisiert_am: z.string().datetime().nullable()
})

// Template item schema (for UI display)
export const TemplateItemSchema = z.object({
  id: TemplateIdSchema,
  name: z.string(),
  category: z.string().nullable(),
  content: z.string(),
  variables: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  size: z.number().min(0),
  type: z.literal('template')
})

// Category selection data schema
export const CategorySelectionDataSchema = z.object({
  existingCategories: z.array(z.string()),
  selectedCategory: z.string().optional()
})

// Validation error schema
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.any().optional()
})

// Validation warning schema
export const ValidationWarningSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.any().optional()
})

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema)
})

// Mention item schema
export const MentionItemSchema = z.object({
  id: VariableIdSchema,
  label: z.string().min(1, { message: 'Variable Label ist erforderlich' }),
  category: z.string().min(1, { message: 'Variable Kategorie ist erforderlich' }),
  description: z.string().optional(),
  context: z.array(z.string()).optional()
})

// Template search/filter schema
export const TemplateSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  userId: UserIdSchema,
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['title', 'created', 'updated', 'category']).optional().default('created'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Bulk validation schema for multiple templates
export const BulkTemplateValidationSchema = z.object({
  templates: z.array(CreateTemplateRequestSchema).max(10, {
    message: 'Maximal 10 Vorlagen können gleichzeitig validiert werden'
  })
})

// Template export schema
export const TemplateExportSchema = z.object({
  templateIds: z.array(TemplateIdSchema).min(1, {
    message: 'Mindestens eine Vorlage muss für den Export ausgewählt werden'
  }).max(50, {
    message: 'Maximal 50 Vorlagen können gleichzeitig exportiert werden'
  }),
  format: z.enum(['json', 'html', 'markdown']).default('json'),
  includeMetadata: z.boolean().default(true)
})

// Template import schema
export const TemplateImportSchema = z.object({
  templates: z.array(z.object({
    titel: TemplateTitleSchema,
    inhalt: TemplateContentSchema,
    kategorie: TemplateCategorySchema
  })).min(1, {
    message: 'Mindestens eine Vorlage muss importiert werden'
  }).max(20, {
    message: 'Maximal 20 Vorlagen können gleichzeitig importiert werden'
  }),
  overwriteExisting: z.boolean().default(false),
  validateVariables: z.boolean().default(true)
})

// Type exports for TypeScript
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>
export type TemplateFormData = z.infer<typeof TemplateFormDataSchema>
export type Template = z.infer<typeof TemplateSchema>
export type TemplateItem = z.infer<typeof TemplateItemSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
export type MentionItem = z.infer<typeof MentionItemSchema>
export type TemplateSearch = z.infer<typeof TemplateSearchSchema>
export type BulkTemplateValidation = z.infer<typeof BulkTemplateValidationSchema>
export type TemplateExport = z.infer<typeof TemplateExportSchema>
export type TemplateImport = z.infer<typeof TemplateImportSchema>

// Validation helper functions
export const validateTemplateTitle = (title: string) => {
  try {
    return { success: true, data: TemplateTitleSchema.parse(title) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: 'Unbekannter Validierungsfehler' }] }
  }
}

export const validateTemplateCategory = (category: string) => {
  try {
    return { success: true, data: TemplateCategorySchema.parse(category) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: 'Unbekannter Validierungsfehler' }] }
  }
}

export const validateTemplateContent = (content: any) => {
  try {
    return { success: true, data: TemplateContentSchema.parse(content) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: 'Unbekannter Validierungsfehler' }] }
  }
}

export const validateCreateTemplateRequest = (data: any) => {
  try {
    return { success: true, data: CreateTemplateRequestSchema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: 'Unbekannter Validierungsfehler' }] }
  }
}

export const validateUpdateTemplateRequest = (data: any) => {
  try {
    return { success: true, data: UpdateTemplateRequestSchema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: 'Unbekannter Validierungsfehler' }] }
  }
}