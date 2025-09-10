import { createSupabaseServerClient } from './supabase-server'
import {
  PREDEFINED_VARIABLES,
  VALIDATION_ERROR_CODES,
  VALIDATION_WARNING_CODES,
  getVariableById,
  searchVariables as searchPredefinedVariables,
  getVariablesByCategory as getPredefinedVariablesByCategory,
  getContextRequirements as getPredefinedContextRequirements,
  isValidVariableId
} from './template-variables'
import { 
  TemplateErrorHandler, 
  TemplateErrorType, 
  TemplateErrorRecovery 
} from './template-error-handler'
import { TemplateErrorReporter } from './template-error-logger'
import { TemplateValidator } from './template-validation'
import { templateValidationService } from './template-validation-service'
import { templateCacheService } from './template-cache'
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  MentionItem
} from '../types/template'

/**
 * Service class for managing document templates
 * Provides CRUD operations, category management, and variable extraction
 */
export class TemplateService {
  private getSupabaseClient() {
    return createSupabaseServerClient()
  }

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<Template> {
    try {
      // Basic validation
      if (!data.titel || !data.titel.trim()) {
        throw new Error('Template title is required')
      }
      
      if (!data.kategorie || !data.kategorie.trim()) {
        throw new Error('Template category is required')
      }
      
      if (!data.user_id) {
        throw new Error('User ID is required')
      }

      // Extract variables from content before saving
      let variables: string[] = []
      try {
        variables = this.extractVariablesFromContent(data.inhalt)
      } catch (error) {
        console.warn('Failed to extract variables from content:', error)
        // Continue without variables if extraction fails
      }
      
      const { data: template, error } = await this.getSupabaseClient()
        .from('Vorlagen')
        .insert({
          titel: data.titel,
          inhalt: data.inhalt,
          kategorie: data.kategorie,
          user_id: data.user_id,
          kontext_anforderungen: variables
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating template:', error)
        throw new Error(`Failed to create template: ${error.message}`)
      }

      if (!template) {
        throw new Error('No template returned from database')
      }

      // Invalidate related caches
      templateCacheService.invalidateUserCaches(data.user_id)

      return template
    } catch (error) {
      console.error('Error in createTemplate:', error)
      throw error instanceof Error ? error : new Error('Failed to create template')
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<Template> {
    try {
      // Get existing template to determine user_id
      const existingTemplate = await this.getTemplate(id)
      
      // Get existing titles and categories for validation context
      const existingTitles = await this.getUserTemplateTitles(existingTemplate.user_id)
      const existingCategories = await this.getUserCategories(existingTemplate.user_id)
      
      // Filter out current template title from duplicates check
      const filteredTitles = data.titel ? 
        existingTitles.filter(title => title !== existingTemplate.titel) : 
        existingTitles
      
      // Enhanced validation with context
      const validation = await templateValidationService.validateUpdateTemplate(data, {
        userId: existingTemplate.user_id,
        existingTitles: filteredTitles,
        existingCategories,
        isUpdate: true,
        templateId: id
      })
      
      if (!validation.isValid) {
        const templateError = TemplateErrorHandler.createError(
          TemplateErrorType.INVALID_TEMPLATE_DATA,
          'Template validation failed',
          validation.errors,
          { templateId: id, operation: 'update' }
        )
        TemplateErrorReporter.reportError(templateError)
        throw templateError
      }

      const updateData: any = {
        aktualisiert_am: new Date().toISOString()
      }

      if (data.titel !== undefined) {
        updateData.titel = data.titel
      }

      if (data.kategorie !== undefined) {
        updateData.kategorie = data.kategorie
      }

      if (data.inhalt !== undefined) {
        updateData.inhalt = data.inhalt
        // Re-extract variables when content changes
        updateData.kontext_anforderungen = this.extractVariablesFromContent(data.inhalt)
      }

      const { data: template, error } = await this.getSupabaseClient()
        .from('Vorlagen')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        let errorType = TemplateErrorType.TEMPLATE_SAVE_FAILED
        
        if (error.code === 'PGRST116') {
          errorType = TemplateErrorType.TEMPLATE_NOT_FOUND
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorType = TemplateErrorType.PERMISSION_DENIED
        }
        
        const templateError = TemplateErrorHandler.createError(
          errorType,
          `Failed to update template: ${error.message}`,
          error,
          { templateId: id, operation: 'update' }
        )
        TemplateErrorReporter.reportError(templateError)
        throw templateError
      }

      // Invalidate related caches
      templateCacheService.invalidateTemplateCache(id)
      templateCacheService.invalidateUserCaches(existingTemplate.user_id)
      
      // If category changed, invalidate old category cache
      if (data.kategorie !== undefined && data.kategorie !== existingTemplate.kategorie) {
        if (existingTemplate.kategorie) {
          templateCacheService.invalidateCategoryCache(existingTemplate.user_id, existingTemplate.kategorie)
        }
      }

      return template
    } catch (error) {
      if (error instanceof Error && error.message.includes('template_error')) {
        throw error // Re-throw template errors
      }
      
      const templateError = TemplateErrorHandler.fromException(
        error,
        { templateId: id, operation: 'update' }
      )
      TemplateErrorReporter.reportError(templateError)
      throw templateError
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      // Get template info before deletion for cache invalidation
      const existingTemplate = await this.getTemplate(id)
      
      const { error } = await this.getSupabaseClient()
        .from('Vorlagen')
        .delete()
        .eq('id', id)

      if (error) {
        let errorType = TemplateErrorType.TEMPLATE_DELETE_FAILED
        
        if (error.code === 'PGRST116') {
          errorType = TemplateErrorType.TEMPLATE_NOT_FOUND
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorType = TemplateErrorType.PERMISSION_DENIED
        }
        
        const templateError = TemplateErrorHandler.createError(
          errorType,
          `Failed to delete template: ${error.message}`,
          error,
          { templateId: id, operation: 'delete' }
        )
        TemplateErrorReporter.reportError(templateError)
        throw templateError
      }

      // Invalidate related caches
      templateCacheService.deleteTemplate(id)
      templateCacheService.invalidateUserCaches(existingTemplate.user_id)
      if (existingTemplate.kategorie) {
        templateCacheService.invalidateCategoryCache(existingTemplate.user_id, existingTemplate.kategorie)
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('template_error')) {
        throw error // Re-throw template errors
      }
      
      const templateError = TemplateErrorHandler.fromException(
        error,
        { templateId: id, operation: 'delete' }
      )
      TemplateErrorReporter.reportError(templateError)
      throw templateError
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<Template> {
    try {
      // Check cache first
      const cached = templateCacheService.getTemplate(id)
      if (cached) {
        return cached
      }

      const { data: template, error } = await this.getSupabaseClient()
        .from('Vorlagen')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        let errorType = TemplateErrorType.TEMPLATE_LOAD_FAILED
        
        if (error.code === 'PGRST116') {
          errorType = TemplateErrorType.TEMPLATE_NOT_FOUND
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorType = TemplateErrorType.PERMISSION_DENIED
        }
        
        const templateError = TemplateErrorHandler.createError(
          errorType,
          `Failed to get template: ${error.message}`,
          error,
          { templateId: id, operation: 'get' }
        )
        TemplateErrorReporter.reportError(templateError)
        throw templateError
      }

      // Cache the result
      templateCacheService.setTemplate(template)

      return template
    } catch (error) {
      if (error instanceof Error && error.message.includes('template_error')) {
        throw error // Re-throw template errors
      }
      
      const templateError = TemplateErrorHandler.fromException(
        error,
        { templateId: id, operation: 'get' }
      )
      TemplateErrorReporter.reportError(templateError)
      throw templateError
    }
  }

  /**
   * Get all templates for a user
   */
  async getUserTemplates(userId: string): Promise<Template[]> {
    // Check cache first
    const cached = templateCacheService.getUserTemplates(userId)
    if (cached) {
      return cached
    }

    const result = await TemplateErrorRecovery.safeOperation(
      async () => {
        const { data: templates, error } = await this.getSupabaseClient()
          .from('Vorlagen')
          .select('*')
          .eq('user_id', userId)
          .order('erstellungsdatum', { ascending: false })

        if (error) {
          const templateError = TemplateErrorHandler.createError(
            TemplateErrorType.TEMPLATE_LOAD_FAILED,
            `Failed to get user templates: ${error.message}`,
            error,
            { userId, operation: 'getUserTemplates' }
          )
          TemplateErrorReporter.reportError(templateError)
          throw templateError
        }

        const templates = templates || []
        
        // Cache the result
        templateCacheService.setUserTemplates(userId, templates)

        return templates
      },
      [], // fallback to empty array
      { userId, operation: 'getUserTemplates' }
    )
    
    return result || []
  }

  /**
   * Get templates by category for a user
   */
  async getTemplatesByCategory(userId: string, category: string): Promise<Template[]> {
    // Check cache first
    const cached = templateCacheService.getCategoryTemplates(userId, category)
    if (cached) {
      return cached
    }

    const { data: templates, error } = await this.getSupabaseClient()
      .from('Vorlagen')
      .select('*')
      .eq('user_id', userId)
      .eq('kategorie', category)
      .order('erstellungsdatum', { ascending: false })

    if (error) {
      throw new Error(`Failed to get templates by category: ${error.message}`)
    }

    const result = templates || []
    
    // Cache the result
    templateCacheService.setCategoryTemplates(userId, category, result)

    return result
  }

  /**
   * Get all categories for a user
   */
  async getUserCategories(userId: string): Promise<string[]> {
    // Check cache first
    const cached = templateCacheService.getUserCategories(userId)
    if (cached) {
      return cached
    }

    const { data: categories, error } = await this.getSupabaseClient()
      .from('Vorlagen')
      .select('kategorie')
      .eq('user_id', userId)
      .not('kategorie', 'is', null)

    if (error) {
      throw new Error(`Failed to get user categories: ${error.message}`)
    }

    // Extract unique categories from existing templates
    const existingCategories = [...new Set(
      categories?.map(item => item.kategorie).filter(Boolean) || []
    )]

    // Define default categories for property management
    const defaultCategories = [
      'Mietverträge',
      'Kündigungen', 
      'Nebenkostenabrechnungen',
      'Mängelanzeigen',
      'Schriftverkehr',
      'Sonstiges'
    ]

    // Combine existing and default categories, removing duplicates
    const allCategories = [...new Set([...existingCategories, ...defaultCategories])]

    // Cache the result
    templateCacheService.setUserCategories(userId, allCategories)

    return allCategories
  }
  
  /**
   * Get all template titles for a user (for duplicate checking)
   */
  async getUserTemplateTitles(userId: string): Promise<string[]> {
    const { data: templates, error } = await this.getSupabaseClient()
      .from('Vorlagen')
      .select('titel')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to get user template titles: ${error.message}`)
    }

    return templates?.map(item => item.titel).filter(Boolean) || []
  }

  /**
   * Get template count for a specific category
   */
  async getCategoryTemplateCount(userId: string, category: string): Promise<number> {
    // Check cache first
    const cached = templateCacheService.getTemplateCount(userId, category)
    if (cached !== null) {
      return cached
    }

    const { count, error } = await this.getSupabaseClient()
      .from('Vorlagen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kategorie', category)

    if (error) {
      throw new Error(`Failed to get category template count: ${error.message}`)
    }

    const result = count || 0
    
    // Cache the result
    templateCacheService.setTemplateCount(userId, result, category)

    return result
  }

  /**
   * Extract variables from Tiptap JSON content
   * Recursively searches for mention nodes with variable IDs
   * Handles complex nested structures and different content formats
   */
  extractVariablesFromContent(content: object): string[] {
    const variables = new Set<string>()

    const extractFromNode = (node: any): void => {
      try {
        if (!node || typeof node !== 'object') return

        // Check if this is a mention node with a variable ID
        if (node.type === 'mention' && node.attrs?.id) {
          variables.add(node.attrs.id)
        }

        // Handle different node structures
        if (node.type === 'text' && node.marks) {
          // Check for mention marks in text nodes
          node.marks.forEach((mark: any) => {
            if (mark.type === 'mention' && mark.attrs?.id) {
              variables.add(mark.attrs.id)
            }
          })
        }

        // Recursively check content array
        if (Array.isArray(node.content)) {
          node.content.forEach(extractFromNode)
        }

        // Check marks array for mentions (for inline mentions)
        if (Array.isArray(node.marks)) {
          node.marks.forEach((mark: any) => {
            if (mark.type === 'mention' && mark.attrs?.id) {
              variables.add(mark.attrs.id)
            }
            // Recursively check mark content if it exists
            if (mark.content) {
              extractFromNode(mark)
            }
          })
        }

        // Handle nested objects that might contain mentions
        if (node.attrs && typeof node.attrs === 'object') {
          Object.values(node.attrs).forEach(value => {
            if (typeof value === 'object' && value !== null) {
              extractFromNode(value)
            }
          })
        }
      } catch (error) {
        console.warn('Error extracting variables from node:', error)
        // Continue processing other nodes
      }
    }

    try {
      // Handle different content formats
      if (Array.isArray(content)) {
        content.forEach(extractFromNode)
      } else {
        extractFromNode(content)
      }
    } catch (error) {
      console.warn('Error processing content for variable extraction:', error)
    }

    return Array.from(variables).sort()
  }

  /**
   * Validate template variables and content
   * Performs comprehensive validation of template structure and variables
   */
  validateTemplateVariables(content: object): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // Extract variables from content
      const variables = this.extractVariablesFromContent(content)
      const availableVariables = this.getAvailableVariables()
      const availableVariableIds = availableVariables.map(v => v.id)
      const availableVariableMap = new Map(availableVariables.map(v => [v.id, v]))

      // Check for invalid variables
      variables.forEach(variableId => {
        if (!availableVariableIds.includes(variableId)) {
          errors.push({
            field: 'content',
            message: `Unbekannte Variable: "${variableId}". Diese Variable ist nicht definiert.`,
            code: VALIDATION_ERROR_CODES.UNKNOWN_VARIABLE
          })
        }
      })

      // Check for invalid variable ID format
      variables.forEach(variableId => {
        if (!isValidVariableId(variableId)) {
          errors.push({
            field: 'content',
            message: `Ungültiges Variablen-Format: "${variableId}". Variablen müssen mit einem Buchstaben beginnen und dürfen nur Buchstaben, Zahlen und Unterstriche enthalten.`,
            code: VALIDATION_ERROR_CODES.INVALID_VARIABLE_ID
          })
        }
      })

      // Check for context-dependent variables
      variables.forEach(variableId => {
        const variable = availableVariableMap.get(variableId)
        if (variable?.context && variable.context.length > 0) {
          warnings.push({
            field: 'content',
            message: `Variable "${variable.label}" (${variableId}) benötigt Kontext: ${variable.context.join(', ')}. Stellen Sie sicher, dass die entsprechenden Daten verfügbar sind.`,
            code: VALIDATION_WARNING_CODES.CONTEXT_REQUIRED
          })
        }
      })

      // Validate content structure
      const contentValidation = this.validateContentStructure(content)
      errors.push(...contentValidation.errors)
      warnings.push(...contentValidation.warnings)

      // Check for empty content
      if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
        warnings.push({
          field: 'content',
          message: 'Der Vorlageninhalt ist leer. Fügen Sie Text und Variablen hinzu.',
          code: VALIDATION_WARNING_CODES.EMPTY_CONTENT
        })
      }

      // Check for content without any variables
      if (variables.length === 0 && content && Object.keys(content).length > 0) {
        warnings.push({
          field: 'content',
          message: 'Die Vorlage enthält keine Variablen. Erwägen Sie das Hinzufügen von Variablen mit "@", um die Vorlage dynamisch zu gestalten.',
          code: VALIDATION_WARNING_CODES.NO_VARIABLES
        })
      }

      // Check for duplicate variables (informational)
      const duplicateCheck = this.checkForDuplicateVariables(content)
      if (duplicateCheck.hasDuplicates) {
        const duplicateLabels = duplicateCheck.duplicates.map(id => {
          const variable = availableVariableMap.get(id)
          return variable ? `${variable.label} (${id})` : id
        })
        warnings.push({
          field: 'content',
          message: `Einige Variablen werden mehrfach verwendet: ${duplicateLabels.join(', ')}. Dies ist erlaubt, aber möglicherweise nicht beabsichtigt.`,
          code: VALIDATION_WARNING_CODES.DUPLICATE_VARIABLES
        })
      }

    } catch (error) {
      console.error('Template validation error:', error)
      errors.push({
        field: 'content',
        message: `Validierung des Vorlageninhalts fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        code: VALIDATION_ERROR_CODES.VALIDATION_ERROR
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate the basic structure of Tiptap content
   */
  private validateContentStructure(content: object): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const validateNode = (node: any, path: string = 'root'): void => {
      if (!node || typeof node !== 'object') return

      // Check for required properties in document nodes
      if (node.type === 'doc' && !Array.isArray(node.content)) {
        errors.push({
          field: 'content',
          message: `Dokumentknoten bei ${path} muss ein content-Array haben`,
          code: VALIDATION_ERROR_CODES.INVALID_DOCUMENT_STRUCTURE
        })
      }

      // Check for invalid mention nodes
      if (node.type === 'mention') {
        if (!node.attrs || !node.attrs.id) {
          errors.push({
            field: 'content',
            message: `Variable bei ${path} fehlt die erforderliche ID`,
            code: VALIDATION_ERROR_CODES.INVALID_MENTION_NODE
          })
        }
        if (!node.attrs || !node.attrs.label) {
          warnings.push({
            field: 'content',
            message: `Variable bei ${path} fehlt die Beschriftung (Label)`,
            code: VALIDATION_WARNING_CODES.MISSING_MENTION_LABEL
          })
        }
      }

      // Recursively validate content
      if (Array.isArray(node.content)) {
        node.content.forEach((child: any, index: number) => {
          validateNode(child, `${path}.content[${index}]`)
        })
      }

      // Validate marks
      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any, index: number) => {
          validateNode(mark, `${path}.marks[${index}]`)
        })
      }
    }

    validateNode(content)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check for duplicate variable usage in content
   */
  private checkForDuplicateVariables(content: object): { hasDuplicates: boolean; duplicates: string[] } {
    const variableCount = new Map<string, number>()
    
    const countVariables = (node: any): void => {
      if (!node || typeof node !== 'object') return

      if (node.type === 'mention' && node.attrs?.id) {
        const count = variableCount.get(node.attrs.id) || 0
        variableCount.set(node.attrs.id, count + 1)
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(countVariables)
      }

      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'mention' && mark.attrs?.id) {
            const count = variableCount.get(mark.attrs.id) || 0
            variableCount.set(mark.attrs.id, count + 1)
          }
        })
      }
    }

    countVariables(content)

    const duplicates = Array.from(variableCount.entries())
      .filter(([_, count]) => count > 1)
      .map(([variable, _]) => variable)

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates
    }
  }

  /**
   * Get variables by category for organized display
   */
  getVariablesByCategory(): Record<string, MentionItem[]> {
    return getPredefinedVariablesByCategory()
  }

  /**
   * Search variables by query string
   */
  searchVariables(query: string): MentionItem[] {
    return searchPredefinedVariables(query)
  }

  /**
   * Get variable by ID
   */
  getVariableById(id: string): MentionItem | undefined {
    return getVariableById(id)
  }

  /**
   * Get context requirements for a list of variables
   */
  getContextRequirements(variableIds: string[]): string[] {
    return getPredefinedContextRequirements(variableIds)
  }

  /**
   * Get available variables for the mention system
   * Returns predefined variables for property management
   */
  getAvailableVariables(): MentionItem[] {
    return PREDEFINED_VARIABLES
  }

  /**
   * Get paginated templates for a user
   */
  async getUserTemplatesPaginated(
    userId: string,
    options: {
      limit?: number
      offset?: number
      category?: string
      search?: string
    } = {}
  ): Promise<{ templates: Template[]; totalCount: number }> {
    const { limit = 20, offset = 0, category, search } = options

    let query = this.getSupabaseClient()
      .from('Vorlagen')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Add category filter
    if (category) {
      query = query.eq('kategorie', category)
    }

    // Add search filter
    if (search) {
      query = query.or(`titel.ilike.%${search}%,kategorie.ilike.%${search}%`)
    }

    // Add pagination and ordering
    query = query
      .order('erstellungsdatum', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: templates, error, count } = await query

    if (error) {
      throw new Error(`Failed to get paginated templates: ${error.message}`)
    }

    return {
      templates: templates || [],
      totalCount: count || 0
    }
  }

  /**
   * Get total template count for a user
   */
  async getUserTemplateCount(userId: string): Promise<number> {
    // Check cache first
    const cached = templateCacheService.getTemplateCount(userId)
    if (cached !== null) {
      return cached
    }

    const { count, error } = await this.getSupabaseClient()
      .from('Vorlagen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to get user template count: ${error.message}`)
    }

    const result = count || 0
    
    // Cache the result
    templateCacheService.setTemplateCount(userId, result)

    return result
  }
}

// Export a singleton instance
export const templateService = new TemplateService()