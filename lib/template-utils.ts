/**
 * Template utility functions for variable management and content processing
 */

import type { MentionItem, Template, TemplateItem } from '../types/template'

/**
 * Variable categories for organizing mentions in the editor
 */
export const VARIABLE_CATEGORIES = {
  PROPERTY: 'Immobilie',
  LANDLORD: 'Vermieter', 
  TENANT: 'Mieter',
  APARTMENT: 'Wohnung',
  FINANCIAL: 'Finanzen',
  CONTRACT: 'Vertrag',
  DATE: 'Datum',
  OPERATING_COSTS: 'Betriebskosten',
  TERMINATION: 'Kündigung'
} as const

/**
 * Context types that variables may require
 */
export const CONTEXT_TYPES = {
  PROPERTY: 'property',
  LANDLORD: 'landlord',
  TENANT: 'tenant',
  APARTMENT: 'apartment',
  LEASE: 'lease',
  OPERATING_COSTS: 'operating_costs',
  WATER_METER: 'water_meter',
  TERMINATION: 'termination'
} as const

/**
 * Validation error codes for template content
 */
export const VALIDATION_ERROR_CODES = {
  UNKNOWN_VARIABLE: 'UNKNOWN_VARIABLE',
  INVALID_CONTENT: 'INVALID_CONTENT',
  INVALID_MENTION_NODE: 'INVALID_MENTION_NODE',
  INVALID_DOCUMENT_STRUCTURE: 'INVALID_DOCUMENT_STRUCTURE',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const

/**
 * Validation warning codes for template content
 */
export const VALIDATION_WARNING_CODES = {
  EMPTY_CONTENT: 'EMPTY_CONTENT',
  NO_VARIABLES: 'NO_VARIABLES',
  CONTEXT_REQUIRED: 'CONTEXT_REQUIRED',
  DUPLICATE_VARIABLES: 'DUPLICATE_VARIABLES',
  MISSING_MENTION_LABEL: 'MISSING_MENTION_LABEL'
} as const

/**
 * Format a variable ID to a human-readable label
 */
export function formatVariableLabel(variableId: string): string {
  return variableId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate a variable ID from a label
 */
export function generateVariableId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Check if a variable ID is valid
 */
export function isValidVariableId(id: string): boolean {
  return /^[a-z][a-z0-9_]*[a-z0-9]$/.test(id) || /^[a-z]$/.test(id)
}

/**
 * Get the category color for UI display
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    [VARIABLE_CATEGORIES.PROPERTY]: 'bg-blue-100 text-blue-800',
    [VARIABLE_CATEGORIES.LANDLORD]: 'bg-green-100 text-green-800',
    [VARIABLE_CATEGORIES.TENANT]: 'bg-purple-100 text-purple-800',
    [VARIABLE_CATEGORIES.APARTMENT]: 'bg-orange-100 text-orange-800',
    [VARIABLE_CATEGORIES.FINANCIAL]: 'bg-yellow-100 text-yellow-800',
    [VARIABLE_CATEGORIES.CONTRACT]: 'bg-red-100 text-red-800',
    [VARIABLE_CATEGORIES.DATE]: 'bg-gray-100 text-gray-800',
    [VARIABLE_CATEGORIES.OPERATING_COSTS]: 'bg-indigo-100 text-indigo-800',
    [VARIABLE_CATEGORIES.TERMINATION]: 'bg-pink-100 text-pink-800'
  }
  
  return colors[category] || 'bg-gray-100 text-gray-800'
}

/**
 * Filter variables by search query
 */
export function filterVariablesByQuery(variables: MentionItem[], query: string): MentionItem[] {
  if (!query.trim()) return variables
  
  const lowercaseQuery = query.toLowerCase()
  
  return variables.filter(variable => 
    variable.label.toLowerCase().includes(lowercaseQuery) ||
    variable.id.toLowerCase().includes(lowercaseQuery) ||
    variable.category.toLowerCase().includes(lowercaseQuery) ||
    (variable.description && variable.description.toLowerCase().includes(lowercaseQuery))
  )
}

/**
 * Group variables by category
 */
export function groupVariablesByCategory(variables: MentionItem[]): Record<string, MentionItem[]> {
  const grouped: Record<string, MentionItem[]> = {}
  
  variables.forEach(variable => {
    if (!grouped[variable.category]) {
      grouped[variable.category] = []
    }
    grouped[variable.category].push(variable)
  })
  
  // Sort variables within each category
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.label.localeCompare(b.label))
  })
  
  return grouped
}

/**
 * Get variables that require specific context
 */
export function getVariablesRequiringContext(variables: MentionItem[], contextType: string): MentionItem[] {
  return variables.filter(variable => 
    variable.context && variable.context.includes(contextType)
  )
}

/**
 * Validate variable mention attributes
 */
export function validateMentionAttrs(attrs: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!attrs) {
    errors.push('Mention attributes are required')
    return { isValid: false, errors }
  }
  
  if (!attrs.id) {
    errors.push('Mention ID is required')
  } else if (!isValidVariableId(attrs.id)) {
    errors.push('Invalid mention ID format')
  }
  
  if (!attrs.label) {
    errors.push('Mention label is recommended')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create a mention node for Tiptap editor
 */
export function createMentionNode(variable: MentionItem): object {
  return {
    type: 'mention',
    attrs: {
      id: variable.id,
      label: variable.label,
      category: variable.category,
      description: variable.description
    }
  }
}

/**
 * Extract text content from Tiptap JSON, replacing mentions with their labels
 */
export function extractTextFromContent(content: any): string {
  if (!content || typeof content !== 'object') return ''
  
  const extractFromNode = (node: any): string => {
    if (!node || typeof node !== 'object') return ''
    
    // Handle text nodes
    if (node.type === 'text') {
      return node.text || ''
    }
    
    // Handle mention nodes
    if (node.type === 'mention' && node.attrs?.label) {
      return `[${node.attrs.label}]`
    }
    
    // Handle nodes with content
    if (Array.isArray(node.content)) {
      return node.content.map(extractFromNode).join('')
    }
    
    return ''
  }
  
  if (Array.isArray(content)) {
    return content.map(extractFromNode).join('\n')
  }
  
  return extractFromNode(content)
}

/**
 * Calculate content statistics
 */
export function calculateContentStats(content: any): {
  characterCount: number
  wordCount: number
  variableCount: number
  paragraphCount: number
} {
  const text = extractTextFromContent(content)
  const characterCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  
  let variableCount = 0
  let paragraphCount = 0
  
  const countNodes = (node: any): void => {
    if (!node || typeof node !== 'object') return
    
    if (node.type === 'mention') {
      variableCount++
    }
    
    if (node.type === 'paragraph') {
      paragraphCount++
    }
    
    if (Array.isArray(node.content)) {
      node.content.forEach(countNodes)
    }
  }
  
  if (Array.isArray(content)) {
    content.forEach(countNodes)
  } else {
    countNodes(content)
  }
  
  return {
    characterCount,
    wordCount,
    variableCount,
    paragraphCount
  }
}

/**
 * Sanitize variable ID to ensure it's safe for database storage
 */
export function sanitizeVariableId(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50) // Limit length
}

/**
 * Get variable usage statistics from content
 */
export function getVariableUsageStats(content: any): Record<string, number> {
  const usage: Record<string, number> = {}
  
  const countVariables = (node: any): void => {
    if (!node || typeof node !== 'object') return
    
    if (node.type === 'mention' && node.attrs?.id) {
      usage[node.attrs.id] = (usage[node.attrs.id] || 0) + 1
    }
    
    if (Array.isArray(node.content)) {
      node.content.forEach(countVariables)
    }
    
    if (Array.isArray(node.marks)) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'mention' && mark.attrs?.id) {
          usage[mark.attrs.id] = (usage[mark.attrs.id] || 0) + 1
        }
      })
    }
  }
  
  if (Array.isArray(content)) {
    content.forEach(countVariables)
  } else {
    countVariables(content)
  }
  
  return usage
}

/**
 * Convert Template database record to TemplateItem for UI display
 */
export function templateToTemplateItem(template: Template): TemplateItem {
  const contentString = JSON.stringify(template.inhalt)
  
  return {
    id: template.id,
    name: template.titel,
    category: template.kategorie,
    content: contentString,
    variables: template.kontext_anforderungen || [],
    createdAt: new Date(template.erstellungsdatum),
    updatedAt: template.aktualisiert_am ? new Date(template.aktualisiert_am) : null,
    size: calculateContentSize(template.inhalt),
    type: 'template'
  }
}

/**
 * Convert array of Template database records to TemplateItems
 */
export function templatesToTemplateItems(templates: Template[]): TemplateItem[] {
  return templates.map(templateToTemplateItem)
}

/**
 * Calculate the size of template content in bytes
 */
export function calculateContentSize(content: any): number {
  if (!content || typeof content !== 'object') return 0
  
  // Check if it's an empty object
  if (Object.keys(content).length === 0) return 0
  
  try {
    return JSON.stringify(content).length
  } catch (error) {
    console.error('Error calculating content size:', error)
    return 0
  }
}

/**
 * Extract plain text from Tiptap JSON content
 */
export function extractPlainTextFromContent(content: any): string {
  if (!content || typeof content !== 'object') return ''
  
  const extractFromNode = (node: any): string => {
    if (!node || typeof node !== 'object') return ''
    
    // Handle text nodes
    if (node.type === 'text') {
      return node.text || ''
    }
    
    // Handle mention nodes - extract the label
    if (node.type === 'mention' && node.attrs?.label) {
      return node.attrs.label
    }
    
    // Handle nodes with content
    if (Array.isArray(node.content)) {
      return node.content.map(extractFromNode).join('')
    }
    
    return ''
  }
  
  if (Array.isArray(content)) {
    return content.map(extractFromNode).join('')
  }
  
  if (content.content && Array.isArray(content.content)) {
    return content.content.map(extractFromNode).join('')
  }
  
  return extractFromNode(content)
}

/**
 * Get a preview of template content (first N characters)
 */
export function getTemplatePreview(template: Template, maxLength: number = 100): string {
  const plainText = extractPlainTextFromContent(template.inhalt)
  
  if (plainText.length <= maxLength) {
    return plainText
  }
  
  // For very short maxLength, ensure we don't go negative
  const truncateLength = Math.max(0, maxLength - 3)
  return plainText.substring(0, truncateLength) + '...'
}

/**
 * Format template name as a file name with .template extension
 */
export function formatTemplateFileName(template: Template): string {
  return `${template.titel}.template`
}

/**
 * Validate template title
 */
export function validateTemplateTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Titel ist erforderlich' }
  }
  
  if (title.length > 255) {
    return { isValid: false, error: 'Titel ist zu lang (maximal 255 Zeichen)' }
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(title)) {
    return { isValid: false, error: 'Titel enthält ungültige Zeichen' }
  }
  
  return { isValid: true }
}

/**
 * Validate template category
 */
export function validateTemplateCategory(category: string): { isValid: boolean; error?: string } {
  if (!category || category.trim().length === 0) {
    return { isValid: false, error: 'Kategorie ist erforderlich' }
  }
  
  if (category.length > 100) {
    return { isValid: false, error: 'Kategorie ist zu lang (maximal 100 Zeichen)' }
  }
  
  return { isValid: true }
}

/**
 * Sanitize template title by removing invalid characters
 */
export function sanitizeTemplateTitle(title: string): string {
  return title
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .substring(0, 255)
}

/**
 * Sanitize template category by removing invalid characters
 */
export function sanitizeTemplateCategory(category: string): string {
  return category
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .substring(0, 100)
}

/**
 * Generate a unique duplicate title
 */
export function generateDuplicateTitle(originalTitle: string, existingTitles: string[]): string {
  let counter = 1
  let newTitle = `${originalTitle} (Copy)`
  
  while (existingTitles.includes(newTitle)) {
    counter++
    newTitle = `${originalTitle} (Copy ${counter})`
  }
  
  return newTitle
}

/**
 * Sort templates by different criteria
 */
export function sortTemplates(
  templates: Template[], 
  sortBy: 'title' | 'created' | 'updated' | 'category', 
  order: 'asc' | 'desc' = 'asc'
): Template[] {
  const sorted = [...templates].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'title':
        comparison = a.titel.localeCompare(b.titel)
        break
      case 'created':
        comparison = new Date(a.erstellungsdatum).getTime() - new Date(b.erstellungsdatum).getTime()
        break
      case 'updated':
        const aUpdated = a.aktualisiert_am ? new Date(a.aktualisiert_am).getTime() : 0
        const bUpdated = b.aktualisiert_am ? new Date(b.aktualisiert_am).getTime() : 0
        comparison = aUpdated - bUpdated
        break
      case 'category':
        const aCat = a.kategorie || ''
        const bCat = b.kategorie || ''
        comparison = aCat.localeCompare(bCat)
        break
    }
    
    return order === 'desc' ? -comparison : comparison
  })
  
  return sorted
}

/**
 * Filter templates by search query
 */
export function filterTemplatesBySearch(templates: Template[], searchQuery: string): Template[] {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return templates
  }
  
  const query = searchQuery.toLowerCase().trim()
  
  return templates.filter(template => {
    // Search in title
    if (template.titel.toLowerCase().includes(query)) {
      return true
    }
    
    // Search in category
    if (template.kategorie && template.kategorie.toLowerCase().includes(query)) {
      return true
    }
    
    // Search in content
    const plainText = extractPlainTextFromContent(template.inhalt)
    if (plainText.toLowerCase().includes(query)) {
      return true
    }
    
    // Search in variables
    if (template.kontext_anforderungen && template.kontext_anforderungen.some(variable => 
      variable.toLowerCase().includes(query)
    )) {
      return true
    }
    
    return false
  })
}