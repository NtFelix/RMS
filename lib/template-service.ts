import { createSupabaseServerClient } from './supabase-server'
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
  private supabase = createSupabaseServerClient()

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
            message: `Unknown variable: ${variableId}. Available variables: ${availableVariableIds.join(', ')}`,
            code: 'UNKNOWN_VARIABLE'
          })
        }
      })

      // Check for deprecated or context-dependent variables
      variables.forEach(variableId => {
        const variable = availableVariableMap.get(variableId)
        if (variable?.context && variable.context.length > 0) {
          warnings.push({
            field: 'content',
            message: `Variable "${variableId}" requires context: ${variable.context.join(', ')}`,
            code: 'CONTEXT_REQUIRED'
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
          message: 'Template content is empty',
          code: 'EMPTY_CONTENT'
        })
      }

      // Check for content without any variables
      if (variables.length === 0 && content && Object.keys(content).length > 0) {
        warnings.push({
          field: 'content',
          message: 'Template contains no variables. Consider adding variables to make it dynamic.',
          code: 'NO_VARIABLES'
        })
      }

      // Check for duplicate variables (informational)
      const duplicateCheck = this.checkForDuplicateVariables(content)
      if (duplicateCheck.hasDuplicates) {
        warnings.push({
          field: 'content',
          message: `Some variables are used multiple times: ${duplicateCheck.duplicates.join(', ')}`,
          code: 'DUPLICATE_VARIABLES'
        })
      }

    } catch (error) {
      errors.push({
        field: 'content',
        message: `Content validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR'
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
          message: `Document node at ${path} must have a content array`,
          code: 'INVALID_DOCUMENT_STRUCTURE'
        })
      }

      // Check for invalid mention nodes
      if (node.type === 'mention') {
        if (!node.attrs || !node.attrs.id) {
          errors.push({
            field: 'content',
            message: `Mention node at ${path} is missing required id attribute`,
            code: 'INVALID_MENTION_NODE'
          })
        }
        if (!node.attrs || !node.attrs.label) {
          warnings.push({
            field: 'content',
            message: `Mention node at ${path} is missing label attribute`,
            code: 'MISSING_MENTION_LABEL'
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
    const variables = this.getAvailableVariables()
    const categorized: Record<string, MentionItem[]> = {}

    variables.forEach(variable => {
      if (!categorized[variable.category]) {
        categorized[variable.category] = []
      }
      categorized[variable.category].push(variable)
    })

    // Sort variables within each category
    Object.keys(categorized).forEach(category => {
      categorized[category].sort((a, b) => a.label.localeCompare(b.label))
    })

    return categorized
  }

  /**
   * Search variables by query string
   */
  searchVariables(query: string): MentionItem[] {
    const variables = this.getAvailableVariables()
    const lowercaseQuery = query.toLowerCase()

    return variables.filter(variable => 
      variable.label.toLowerCase().includes(lowercaseQuery) ||
      variable.id.toLowerCase().includes(lowercaseQuery) ||
      variable.category.toLowerCase().includes(lowercaseQuery) ||
      (variable.description && variable.description.toLowerCase().includes(lowercaseQuery))
    )
  }

  /**
   * Get variable by ID
   */
  getVariableById(id: string): MentionItem | undefined {
    return this.getAvailableVariables().find(variable => variable.id === id)
  }

  /**
   * Get context requirements for a list of variables
   */
  getContextRequirements(variableIds: string[]): string[] {
    const variables = this.getAvailableVariables()
    const requirements = new Set<string>()

    variableIds.forEach(id => {
      const variable = variables.find(v => v.id === id)
      if (variable?.context) {
        variable.context.forEach(req => requirements.add(req))
      }
    })

    return Array.from(requirements).sort()
  }

  /**
   * Get available variables for the mention system
   * Returns predefined variables for property management
   */
  getAvailableVariables(): MentionItem[] {
    return [
      // Property variables
      {
        id: 'property_name',
        label: 'Objektname',
        category: 'Immobilie',
        description: 'Name der Immobilie/des Hauses',
        context: ['property']
      },
      {
        id: 'property_address',
        label: 'Objektadresse',
        category: 'Immobilie',
        description: 'Vollständige Adresse der Immobilie',
        context: ['property']
      },
      {
        id: 'property_street',
        label: 'Straße',
        category: 'Immobilie',
        description: 'Straße der Immobilie',
        context: ['property']
      },
      {
        id: 'property_city',
        label: 'Stadt',
        category: 'Immobilie',
        description: 'Stadt der Immobilie',
        context: ['property']
      },
      {
        id: 'property_postal_code',
        label: 'Postleitzahl',
        category: 'Immobilie',
        description: 'Postleitzahl der Immobilie',
        context: ['property']
      },
      {
        id: 'property_size',
        label: 'Objektgröße',
        category: 'Immobilie',
        description: 'Gesamtgröße der Immobilie in m²',
        context: ['property']
      },
      {
        id: 'property_type',
        label: 'Objekttyp',
        category: 'Immobilie',
        description: 'Art der Immobilie (Einfamilienhaus, Mehrfamilienhaus, etc.)',
        context: ['property']
      },

      // Landlord variables
      {
        id: 'landlord_name',
        label: 'Vermieter Name',
        category: 'Vermieter',
        description: 'Vollständiger Name des Vermieters',
        context: ['landlord']
      },
      {
        id: 'landlord_first_name',
        label: 'Vermieter Vorname',
        category: 'Vermieter',
        description: 'Vorname des Vermieters',
        context: ['landlord']
      },
      {
        id: 'landlord_last_name',
        label: 'Vermieter Nachname',
        category: 'Vermieter',
        description: 'Nachname des Vermieters',
        context: ['landlord']
      },
      {
        id: 'landlord_address',
        label: 'Vermieter Adresse',
        category: 'Vermieter',
        description: 'Vollständige Adresse des Vermieters',
        context: ['landlord']
      },
      {
        id: 'landlord_phone',
        label: 'Vermieter Telefon',
        category: 'Vermieter',
        description: 'Telefonnummer des Vermieters',
        context: ['landlord']
      },
      {
        id: 'landlord_email',
        label: 'Vermieter E-Mail',
        category: 'Vermieter',
        description: 'E-Mail-Adresse des Vermieters',
        context: ['landlord']
      },

      // Tenant variables
      {
        id: 'tenant_name',
        label: 'Mieter Name',
        category: 'Mieter',
        description: 'Vollständiger Name des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_first_name',
        label: 'Mieter Vorname',
        category: 'Mieter',
        description: 'Vorname des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_last_name',
        label: 'Mieter Nachname',
        category: 'Mieter',
        description: 'Nachname des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_address',
        label: 'Mieter Adresse',
        category: 'Mieter',
        description: 'Aktuelle Adresse des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_phone',
        label: 'Mieter Telefon',
        category: 'Mieter',
        description: 'Telefonnummer des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_email',
        label: 'Mieter E-Mail',
        category: 'Mieter',
        description: 'E-Mail-Adresse des Mieters',
        context: ['tenant']
      },
      {
        id: 'tenant_move_in_date',
        label: 'Einzugsdatum',
        category: 'Mieter',
        description: 'Datum des Einzugs des Mieters',
        context: ['tenant', 'lease']
      },
      {
        id: 'tenant_move_out_date',
        label: 'Auszugsdatum',
        category: 'Mieter',
        description: 'Datum des Auszugs des Mieters',
        context: ['tenant', 'lease']
      },
      {
        id: 'tenant_birth_date',
        label: 'Geburtsdatum Mieter',
        category: 'Mieter',
        description: 'Geburtsdatum des Mieters',
        context: ['tenant']
      },

      // Apartment variables
      {
        id: 'apartment_name',
        label: 'Wohnungsname',
        category: 'Wohnung',
        description: 'Bezeichnung/Nummer der Wohnung',
        context: ['apartment']
      },
      {
        id: 'apartment_size',
        label: 'Wohnungsgröße',
        category: 'Wohnung',
        description: 'Größe der Wohnung in m²',
        context: ['apartment']
      },
      {
        id: 'apartment_rooms',
        label: 'Anzahl Zimmer',
        category: 'Wohnung',
        description: 'Anzahl der Zimmer in der Wohnung',
        context: ['apartment']
      },
      {
        id: 'apartment_floor',
        label: 'Stockwerk',
        category: 'Wohnung',
        description: 'Stockwerk der Wohnung',
        context: ['apartment']
      },
      {
        id: 'apartment_rent',
        label: 'Kaltmiete',
        category: 'Wohnung',
        description: 'Kaltmiete der Wohnung pro Monat',
        context: ['apartment', 'lease']
      },
      {
        id: 'apartment_additional_costs',
        label: 'Nebenkosten',
        category: 'Wohnung',
        description: 'Nebenkosten der Wohnung pro Monat',
        context: ['apartment', 'lease']
      },
      {
        id: 'apartment_heating_costs',
        label: 'Heizkosten',
        category: 'Wohnung',
        description: 'Heizkosten der Wohnung pro Monat',
        context: ['apartment', 'lease']
      },

      // Financial variables
      {
        id: 'total_rent',
        label: 'Gesamtmiete',
        category: 'Finanzen',
        description: 'Gesamtmiete (Kalt + Nebenkosten + Heizkosten)',
        context: ['apartment', 'lease']
      },
      {
        id: 'deposit_amount',
        label: 'Kaution',
        category: 'Finanzen',
        description: 'Höhe der Kaution',
        context: ['lease']
      },
      {
        id: 'monthly_payment',
        label: 'Monatliche Zahlung',
        category: 'Finanzen',
        description: 'Gesamte monatliche Zahlung des Mieters',
        context: ['lease']
      },

      // Contract/Lease variables
      {
        id: 'contract_start_date',
        label: 'Vertragsbeginn',
        category: 'Vertrag',
        description: 'Startdatum des Mietvertrags',
        context: ['lease']
      },
      {
        id: 'contract_end_date',
        label: 'Vertragsende',
        category: 'Vertrag',
        description: 'Enddatum des Mietvertrags (falls befristet)',
        context: ['lease']
      },
      {
        id: 'contract_type',
        label: 'Vertragsart',
        category: 'Vertrag',
        description: 'Art des Mietvertrags (unbefristet, befristet)',
        context: ['lease']
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        category: 'Vertrag',
        description: 'Kündigungsfrist in Monaten',
        context: ['lease']
      },

      // Date variables (no context required)
      {
        id: 'current_date',
        label: 'Aktuelles Datum',
        category: 'Datum',
        description: 'Heutiges Datum (automatisch)'
      },
      {
        id: 'current_month',
        label: 'Aktueller Monat',
        category: 'Datum',
        description: 'Aktueller Monat (automatisch)'
      },
      {
        id: 'current_year',
        label: 'Aktuelles Jahr',
        category: 'Datum',
        description: 'Aktuelles Jahr (automatisch)'
      },

      // Operating costs variables
      {
        id: 'operating_costs_year',
        label: 'Betriebskostenjahr',
        category: 'Betriebskosten',
        description: 'Jahr der Betriebskostenabrechnung',
        context: ['operating_costs']
      },
      {
        id: 'water_consumption',
        label: 'Wasserverbrauch',
        category: 'Betriebskosten',
        description: 'Wasserverbrauch in m³',
        context: ['operating_costs', 'water_meter']
      },
      {
        id: 'heating_consumption',
        label: 'Heizverbrauch',
        category: 'Betriebskosten',
        description: 'Heizverbrauch in kWh oder m³',
        context: ['operating_costs']
      },

      // Legal/Administrative variables
      {
        id: 'termination_date',
        label: 'Kündigungsdatum',
        category: 'Kündigung',
        description: 'Datum der Kündigung',
        context: ['termination']
      },
      {
        id: 'termination_reason',
        label: 'Kündigungsgrund',
        category: 'Kündigung',
        description: 'Grund für die Kündigung',
        context: ['termination']
      },
      {
        id: 'move_out_deadline',
        label: 'Auszugsfrist',
        category: 'Kündigung',
        description: 'Frist bis zum Auszug',
        context: ['termination']
      }
    ]
  }
}

// Export a singleton instance
export const templateService = new TemplateService()