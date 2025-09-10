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
   */
  extractVariablesFromContent(content: object): string[] {
    const variables = new Set<string>()

    const extractFromNode = (node: any): void => {
      if (!node || typeof node !== 'object') return

      // Check if this is a mention node with a variable ID
      if (node.type === 'mention' && node.attrs?.id) {
        variables.add(node.attrs.id)
      }

      // Recursively check content array
      if (Array.isArray(node.content)) {
        node.content.forEach(extractFromNode)
      }

      // Check marks array for mentions
      if (Array.isArray(node.marks)) {
        node.marks.forEach(extractFromNode)
      }
    }

    extractFromNode(content)
    return Array.from(variables)
  }

  /**
   * Validate template variables and content
   */
  validateTemplateVariables(content: object): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Extract variables from content
    const variables = this.extractVariablesFromContent(content)
    const availableVariables = this.getAvailableVariables()
    const availableVariableIds = availableVariables.map(v => v.id)

    // Check for invalid variables
    variables.forEach(variableId => {
      if (!availableVariableIds.includes(variableId)) {
        errors.push({
          field: 'content',
          message: `Unknown variable: ${variableId}`,
          code: 'UNKNOWN_VARIABLE'
        })
      }
    })

    // Check for empty content
    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
      warnings.push({
        field: 'content',
        message: 'Template content is empty',
        code: 'EMPTY_CONTENT'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
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
        description: 'Name der Immobilie/des Hauses'
      },
      {
        id: 'property_address',
        label: 'Objektadresse',
        category: 'Immobilie',
        description: 'Vollständige Adresse der Immobilie'
      },
      {
        id: 'property_size',
        label: 'Objektgröße',
        category: 'Immobilie',
        description: 'Gesamtgröße der Immobilie in m²'
      },

      // Landlord variables
      {
        id: 'landlord_name',
        label: 'Vermieter Name',
        category: 'Vermieter',
        description: 'Name des Vermieters'
      },
      {
        id: 'landlord_address',
        label: 'Vermieter Adresse',
        category: 'Vermieter',
        description: 'Adresse des Vermieters'
      },
      {
        id: 'landlord_phone',
        label: 'Vermieter Telefon',
        category: 'Vermieter',
        description: 'Telefonnummer des Vermieters'
      },
      {
        id: 'landlord_email',
        label: 'Vermieter E-Mail',
        category: 'Vermieter',
        description: 'E-Mail-Adresse des Vermieters'
      },

      // Tenant variables
      {
        id: 'tenant_name',
        label: 'Mieter Name',
        category: 'Mieter',
        description: 'Name des Mieters'
      },
      {
        id: 'tenant_address',
        label: 'Mieter Adresse',
        category: 'Mieter',
        description: 'Adresse des Mieters'
      },
      {
        id: 'tenant_phone',
        label: 'Mieter Telefon',
        category: 'Mieter',
        description: 'Telefonnummer des Mieters'
      },
      {
        id: 'tenant_email',
        label: 'Mieter E-Mail',
        category: 'Mieter',
        description: 'E-Mail-Adresse des Mieters'
      },
      {
        id: 'tenant_move_in_date',
        label: 'Einzugsdatum',
        category: 'Mieter',
        description: 'Datum des Einzugs'
      },
      {
        id: 'tenant_move_out_date',
        label: 'Auszugsdatum',
        category: 'Mieter',
        description: 'Datum des Auszugs'
      },

      // Apartment variables
      {
        id: 'apartment_name',
        label: 'Wohnungsname',
        category: 'Wohnung',
        description: 'Bezeichnung der Wohnung'
      },
      {
        id: 'apartment_size',
        label: 'Wohnungsgröße',
        category: 'Wohnung',
        description: 'Größe der Wohnung in m²'
      },
      {
        id: 'apartment_rent',
        label: 'Kaltmiete',
        category: 'Wohnung',
        description: 'Kaltmiete der Wohnung'
      },
      {
        id: 'apartment_additional_costs',
        label: 'Nebenkosten',
        category: 'Wohnung',
        description: 'Nebenkosten der Wohnung'
      },

      // Financial variables
      {
        id: 'total_rent',
        label: 'Gesamtmiete',
        category: 'Finanzen',
        description: 'Gesamtmiete (Kalt + Nebenkosten)'
      },
      {
        id: 'deposit_amount',
        label: 'Kaution',
        category: 'Finanzen',
        description: 'Höhe der Kaution'
      },

      // Date variables
      {
        id: 'current_date',
        label: 'Aktuelles Datum',
        category: 'Datum',
        description: 'Heutiges Datum'
      },
      {
        id: 'contract_start_date',
        label: 'Vertragsbeginn',
        category: 'Datum',
        description: 'Startdatum des Mietvertrags'
      },
      {
        id: 'contract_end_date',
        label: 'Vertragsende',
        category: 'Datum',
        description: 'Enddatum des Mietvertrags'
      }
    ]
  }
}

// Export a singleton instance
export const templateService = new TemplateService()