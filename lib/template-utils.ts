import type { Template, TemplateItem } from '../types/template'

/**
 * Utility functions for template operations
 */

/**
 * Convert Template database record to TemplateItem for UI display
 */
export function templateToTemplateItem(template: Template): TemplateItem {
  return {
    id: template.id,
    name: template.titel,
    category: template.kategorie,
    content: JSON.stringify(template.inhalt),
    variables: template.kontext_anforderungen,
    createdAt: new Date(template.erstellungsdatum),
    updatedAt: template.aktualisiert_am ? new Date(template.aktualisiert_am) : null,
    size: calculateContentSize(template.inhalt),
    type: 'template'
  }
}

/**
 * Convert multiple Template records to TemplateItems
 */
export function templatesToTemplateItems(templates: Template[]): TemplateItem[] {
  return templates.map(templateToTemplateItem)
}

/**
 * Calculate the size of template content for display
 */
export function calculateContentSize(content: object): number {
  if (!content) return 0
  
  // Calculate approximate size based on JSON string length
  const jsonString = JSON.stringify(content)
  
  // Return 0 for empty objects
  if (jsonString === '{}' || jsonString === '[]') return 0
  
  return jsonString.length
}

/**
 * Extract plain text from Tiptap JSON content for search/preview
 */
export function extractPlainTextFromContent(content: object): string {
  if (!content || typeof content !== 'object') return ''
  
  const extractText = (node: any): string => {
    if (!node || typeof node !== 'object') return ''
    
    let text = ''
    
    // If this node has text, add it
    if (node.text && typeof node.text === 'string') {
      text += node.text
    }
    
    // If this node has content array, recursively extract text
    if (Array.isArray(node.content)) {
      text += node.content.map(extractText).join('')
    }
    
    return text
  }
  
  return extractText(content).trim()
}

/**
 * Get template preview text (first N characters)
 */
export function getTemplatePreview(template: Template, maxLength: number = 100): string {
  const plainText = extractPlainTextFromContent(template.inhalt)
  
  if (plainText.length <= maxLength) {
    return plainText
  }
  
  return plainText.substring(0, maxLength).trim() + '...'
}

/**
 * Format template file name for display
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
  
  if (title.trim().length > 255) {
    return { isValid: false, error: 'Titel ist zu lang (maximal 255 Zeichen)' }
  }
  
  // Check for invalid characters that might cause issues
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
  
  if (category.trim().length > 100) {
    return { isValid: false, error: 'Kategorie ist zu lang (maximal 100 Zeichen)' }
  }
  
  return { isValid: true }
}

/**
 * Sanitize template title for safe usage
 */
export function sanitizeTemplateTitle(title: string): string {
  return title
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .substring(0, 255) // Limit length
}

/**
 * Sanitize template category for safe usage
 */
export function sanitizeTemplateCategory(category: string): string {
  return category
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .substring(0, 100) // Limit length
}

/**
 * Generate a unique template title when duplicating
 */
export function generateDuplicateTitle(originalTitle: string, existingTitles: string[]): string {
  let newTitle = `${originalTitle} (Copy)`
  let counter = 1
  
  while (existingTitles.includes(newTitle)) {
    counter++
    newTitle = `${originalTitle} (Copy ${counter})`
  }
  
  return newTitle
}

/**
 * Sort templates by various criteria
 */
export function sortTemplates(
  templates: Template[], 
  sortBy: 'title' | 'created' | 'updated' | 'category',
  order: 'asc' | 'desc' = 'desc'
): Template[] {
  return [...templates].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'title':
        comparison = a.titel.localeCompare(b.titel, 'de')
        break
      case 'created':
        comparison = new Date(a.erstellungsdatum).getTime() - new Date(b.erstellungsdatum).getTime()
        break
      case 'updated':
        const aUpdated = a.aktualisiert_am ? new Date(a.aktualisiert_am).getTime() : new Date(a.erstellungsdatum).getTime()
        const bUpdated = b.aktualisiert_am ? new Date(b.aktualisiert_am).getTime() : new Date(b.erstellungsdatum).getTime()
        comparison = aUpdated - bUpdated
        break
      case 'category':
        const aCategory = a.kategorie || 'Zzz' // Put null categories at the end
        const bCategory = b.kategorie || 'Zzz'
        comparison = aCategory.localeCompare(bCategory, 'de')
        break
    }
    
    return order === 'asc' ? comparison : -comparison
  })
}

/**
 * Filter templates by search term
 */
export function filterTemplatesBySearch(templates: Template[], searchTerm: string): Template[] {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return templates
  }
  
  const term = searchTerm.toLowerCase().trim()
  
  return templates.filter(template => {
    // Search in title
    if (template.titel.toLowerCase().includes(term)) {
      return true
    }
    
    // Search in category
    if (template.kategorie && template.kategorie.toLowerCase().includes(term)) {
      return true
    }
    
    // Search in content
    const plainText = extractPlainTextFromContent(template.inhalt)
    if (plainText.toLowerCase().includes(term)) {
      return true
    }
    
    // Search in variables
    if (template.kontext_anforderungen.some(variable => 
      variable.toLowerCase().includes(term)
    )) {
      return true
    }
    
    return false
  })
}