/**
 * Client-side template service for handling API calls
 * This service is used by React components to interact with the template API
 */

import { Template, TemplateFormData, CreateTemplateRequest, UpdateTemplateRequest, ValidationResult } from '@/types/template'

export interface TemplateApiResponse {
  template?: Template
  templates?: Template[]
  validationWarnings?: Array<{
    field: string
    message: string
    code: string
  }>
  error?: string
  validationErrors?: Array<{
    field: string
    message: string
    code: string
  }>
}

export class TemplateClientService {
  private baseUrl = '/api/templates'

  /**
   * Create a new template
   */
  async createTemplate(data: TemplateFormData): Promise<Template> {
    const createRequest: CreateTemplateRequest = {
      titel: data.titel,
      inhalt: data.inhalt,
      kategorie: data.kategorie,
      user_id: '' // Will be set by the API from the authenticated user
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createRequest),
    })

    const result: TemplateApiResponse = await response.json()

    if (!response.ok) {
      if (result.validationErrors) {
        const errorMessages = result.validationErrors.map(err => err.message).join(', ')
        throw new Error(`Validation failed: ${errorMessages}`)
      }
      throw new Error(result.error || 'Failed to create template')
    }

    if (!result.template) {
      throw new Error('No template returned from server')
    }

    // Log validation warnings if any
    if (result.validationWarnings && result.validationWarnings.length > 0) {
      console.warn('Template validation warnings:', result.validationWarnings)
    }

    return result.template
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: Partial<TemplateFormData>): Promise<Template> {
    const updateRequest: UpdateTemplateRequest = {}
    
    if (data.titel !== undefined) {
      updateRequest.titel = data.titel
    }
    
    if (data.inhalt !== undefined) {
      updateRequest.inhalt = data.inhalt
    }
    
    if (data.kategorie !== undefined) {
      updateRequest.kategorie = data.kategorie
    }

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRequest),
    })

    const result: TemplateApiResponse = await response.json()

    if (!response.ok) {
      if (result.validationErrors) {
        const errorMessages = result.validationErrors.map(err => err.message).join(', ')
        throw new Error(`Validation failed: ${errorMessages}`)
      }
      throw new Error(result.error || 'Failed to update template')
    }

    if (!result.template) {
      throw new Error('No template returned from server')
    }

    return result.template
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    const result: TemplateApiResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch template')
    }

    if (!result.template) {
      throw new Error('No template returned from server')
    }

    return result.template
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result: TemplateApiResponse = await response.json()
      throw new Error(result.error || 'Failed to delete template')
    }
  }

  /**
   * Get all templates for the current user
   */
  async getUserTemplates(): Promise<Template[]> {
    const response = await fetch(this.baseUrl)
    const result: TemplateApiResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch templates')
    }

    return result.templates || []
  }

  /**
   * Get paginated templates for the current user
   */
  async getUserTemplatesPaginated(options: {
    limit?: number
    offset?: number
    category?: string
    search?: string
  } = {}): Promise<{ templates: Template[]; totalCount: number }> {
    const params = new URLSearchParams()
    
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.offset) params.append('offset', options.offset.toString())
    if (options.category) params.append('category', options.category)
    if (options.search) params.append('search', options.search)

    const response = await fetch(`${this.baseUrl}?${params}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch paginated templates')
    }

    return {
      templates: result.templates || [],
      totalCount: result.totalCount || 0
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}?category=${encodeURIComponent(category)}`)
    const result: TemplateApiResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch templates')
    }

    return result.templates || []
  }

  /**
   * Get user categories
   */
  async getUserCategories(): Promise<string[]> {
    const response = await fetch('/api/templates/categories')
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch categories')
    }

    return result.categories || []
  }
}

// Export a singleton instance
export const templateClientService = new TemplateClientService()