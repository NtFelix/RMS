import { createClient } from '@supabase/supabase-js'
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
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<Template> {
    // Extract variables from content before saving
    const variables = this.extractVariablesFromContent(data.inhalt)
    
    const { data: template, error } = await this.supabase
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
      throw new Error(`Failed to create template: ${error.message}`)
    }

    return template
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<Template> {
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

    const { data: template, error } = await this.supabase
      .from('Vorlagen')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`)
    }

    return template
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('Vorlagen')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`)
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<Template> {
    const { data: template, error } = await this.supabase
      .from('Vorlagen')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to get template: ${error.message}`)
    }

    return template
  }

  /**
   * Get all templates for a user
   */
  async getUserTemplates(userId: string): Promise<Template[]> {
    const { data: templates, error } = await this.supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', userId)
      .order('erstellungsdatum', { ascending: false })

    if (error) {
      throw new Error(`Failed to get user templates: ${error.message}`)
    }

    return templates || []
  }

  /**
   * Get templates by category for a user
   */
  async getTemplatesByCategory(userId: string, category: string): Promise<Template[]> {
    const { data: templates, error } = await this.supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', userId)
      .eq('kategorie', category)
      .order('erstellungsdatum', { ascending: false })

    if (error) {
      throw new Error(`Failed to get templates by category: ${error.message}`)
    }

    return templates || []
  }

  /**
   * Get all categories for a user
   */
  async getUserCategories(userId: string): Promise<string[]> {
    const { data: categories, error } = await this.supabase
      .from('Vorlagen')
      .select('kategorie')
      .eq('user_id', userId)
      .not('kategorie', 'is', null)

    if (error) {
      throw new Error(`Failed to get user categories: ${error.message}`)
    }

    // Extract unique categories
    const uniqueCategories = [...new Set(
      categories?.map(item => item.kategorie).filter(Boolean) || []
    )]

    return uniqueCategories
  }

  /**
   * Get template count for a specific category
   */
  async getCategoryTemplateCount(userId: string, category: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('Vorlagen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kategorie', category)

    if (error) {
      throw new Error(`Failed to get category template count: ${error.message}`)
    }

    return count || 0
  }

  /**
   * Extract variables from Tiptap JSON content
   * Recursively searches for mention nodes with variable IDs
   * Handles complex nested structures and different content formats
   */
  extractVariablesFromContent(content: object): string[] {
    const variables = new Set<string>()

    const extractFromNode = (node: any): void => {
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
    }

    // Handle different content formats
    if (Array.isArray(content)) {
      content.forEach(extractFromNode)
    } else {
      extractFromNode(content)
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
}

// Export a singleton instance
export const templateService = new TemplateService()