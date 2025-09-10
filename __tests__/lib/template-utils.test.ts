import {
  formatVariableLabel,
  generateVariableId,
  isValidVariableId,
  getCategoryColor,
  filterVariablesByQuery,
  groupVariablesByCategory,
  getVariablesRequiringContext,
  validateMentionAttrs,
  createMentionNode,
  extractTextFromContent,
  calculateContentStats,
  sanitizeVariableId,
  getVariableUsageStats,
  VARIABLE_CATEGORIES,
  CONTEXT_TYPES
} from '../../lib/template-utils'
import type { MentionItem } from '../../types/template'

describe('Template Utils', () => {
  const mockVariables: MentionItem[] = [
    {
      id: 'tenant_name',
      label: 'Mieter Name',
      category: 'Mieter',
      description: 'Name des Mieters',
      context: ['tenant']
    },
    {
      id: 'landlord_name',
      label: 'Vermieter Name',
      category: 'Vermieter',
      description: 'Name des Vermieters',
      context: ['landlord']
    },
    {
      id: 'property_address',
      label: 'Objektadresse',
      category: 'Immobilie',
      description: 'Adresse der Immobilie',
      context: ['property']
    },
    {
      id: 'current_date',
      label: 'Aktuelles Datum',
      category: 'Datum',
      description: 'Heutiges Datum'
    }
  ]

  describe('formatVariableLabel', () => {
    it('should format variable ID to human-readable label', () => {
      expect(formatVariableLabel('tenant_name')).toBe('Tenant Name')
      expect(formatVariableLabel('property_address')).toBe('Property Address')
      expect(formatVariableLabel('current_date')).toBe('Current Date')
    })

    it('should handle single words', () => {
      expect(formatVariableLabel('name')).toBe('Name')
    })

    it('should handle empty strings', () => {
      expect(formatVariableLabel('')).toBe('')
    })
  })

  describe('generateVariableId', () => {
    it('should generate valid variable ID from label', () => {
      expect(generateVariableId('Mieter Name')).toBe('mieter_name')
      expect(generateVariableId('Objektadresse')).toBe('objektadresse')
      expect(generateVariableId('Current Date & Time')).toBe('current_date_time')
    })

    it('should handle special characters', () => {
      expect(generateVariableId('Name (Vollständig)')).toBe('name_vollstndig')
      expect(generateVariableId('E-Mail Adresse')).toBe('email_adresse')
    })

    it('should handle multiple spaces', () => {
      expect(generateVariableId('Multiple   Spaces   Here')).toBe('multiple_spaces_here')
    })
  })

  describe('isValidVariableId', () => {
    it('should validate correct variable IDs', () => {
      expect(isValidVariableId('tenant_name')).toBe(true)
      expect(isValidVariableId('property123')).toBe(true)
      expect(isValidVariableId('a')).toBe(true)
      expect(isValidVariableId('valid_id_123')).toBe(true)
    })

    it('should reject invalid variable IDs', () => {
      expect(isValidVariableId('123invalid')).toBe(false)
      expect(isValidVariableId('_invalid')).toBe(false)
      expect(isValidVariableId('invalid_')).toBe(false)
      expect(isValidVariableId('invalid-id')).toBe(false)
      expect(isValidVariableId('')).toBe(false)
      expect(isValidVariableId('Invalid ID')).toBe(false)
    })
  })

  describe('getCategoryColor', () => {
    it('should return correct colors for known categories', () => {
      expect(getCategoryColor(VARIABLE_CATEGORIES.TENANT)).toContain('purple')
      expect(getCategoryColor(VARIABLE_CATEGORIES.LANDLORD)).toContain('green')
      expect(getCategoryColor(VARIABLE_CATEGORIES.PROPERTY)).toContain('blue')
    })

    it('should return default color for unknown categories', () => {
      expect(getCategoryColor('Unknown Category')).toBe('bg-gray-100 text-gray-800')
    })
  })

  describe('filterVariablesByQuery', () => {
    it('should filter variables by label', () => {
      const results = filterVariablesByQuery(mockVariables, 'Aktuelles')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('current_date')
    })

    it('should filter variables by ID', () => {
      const results = filterVariablesByQuery(mockVariables, 'tenant_name')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('tenant_name')
    })

    it('should filter variables by category', () => {
      const results = filterVariablesByQuery(mockVariables, 'Datum')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('current_date')
    })

    it('should filter variables by description', () => {
      const results = filterVariablesByQuery(mockVariables, 'Heutiges')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('current_date')
    })

    it('should return all variables for empty query', () => {
      const results = filterVariablesByQuery(mockVariables, '')
      expect(results).toHaveLength(mockVariables.length)
    })

    it('should be case insensitive', () => {
      const results1 = filterVariablesByQuery(mockVariables, 'MIETER')
      const results2 = filterVariablesByQuery(mockVariables, 'mieter')
      expect(results1).toEqual(results2)
    })
  })

  describe('groupVariablesByCategory', () => {
    it('should group variables by category', () => {
      const grouped = groupVariablesByCategory(mockVariables)
      
      expect(grouped).toHaveProperty('Mieter')
      expect(grouped).toHaveProperty('Vermieter')
      expect(grouped).toHaveProperty('Immobilie')
      expect(grouped).toHaveProperty('Datum')
      
      expect(grouped['Mieter']).toHaveLength(1)
      expect(grouped['Mieter'][0].id).toBe('tenant_name')
    })

    it('should sort variables within categories', () => {
      const variablesWithMultipleInCategory: MentionItem[] = [
        {
          id: 'tenant_name',
          label: 'Mieter Name',
          category: 'Mieter',
          description: 'Name des Mieters'
        },
        {
          id: 'tenant_email',
          label: 'Mieter E-Mail',
          category: 'Mieter',
          description: 'E-Mail des Mieters'
        }
      ]
      
      const grouped = groupVariablesByCategory(variablesWithMultipleInCategory)
      const mieterVariables = grouped['Mieter']
      
      expect(mieterVariables[0].label).toBe('Mieter E-Mail')
      expect(mieterVariables[1].label).toBe('Mieter Name')
    })
  })

  describe('getVariablesRequiringContext', () => {
    it('should return variables requiring specific context', () => {
      const tenantVariables = getVariablesRequiringContext(mockVariables, 'tenant')
      expect(tenantVariables).toHaveLength(1)
      expect(tenantVariables[0].id).toBe('tenant_name')
    })

    it('should return empty array for non-existent context', () => {
      const results = getVariablesRequiringContext(mockVariables, 'nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should handle variables without context', () => {
      const results = getVariablesRequiringContext(mockVariables, 'any')
      expect(results.length).toBeLessThan(mockVariables.length)
    })
  })

  describe('validateMentionAttrs', () => {
    it('should validate correct mention attributes', () => {
      const attrs = {
        id: 'tenant_name',
        label: 'Mieter Name'
      }
      
      const result = validateMentionAttrs(attrs)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing attributes', () => {
      const result = validateMentionAttrs(null)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Mention attributes are required')
    })

    it('should detect missing ID', () => {
      const attrs = { label: 'Test Label' }
      const result = validateMentionAttrs(attrs)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Mention ID is required')
    })

    it('should detect invalid ID format', () => {
      const attrs = { id: '123invalid', label: 'Test Label' }
      const result = validateMentionAttrs(attrs)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid mention ID format')
    })

    it('should warn about missing label', () => {
      const attrs = { id: 'valid_id' }
      const result = validateMentionAttrs(attrs)
      expect(result.errors).toContain('Mention label is recommended')
    })
  })

  describe('createMentionNode', () => {
    it('should create valid mention node', () => {
      const variable = mockVariables[0]
      const node = createMentionNode(variable)
      
      expect(node).toEqual({
        type: 'mention',
        attrs: {
          id: variable.id,
          label: variable.label,
          category: variable.category,
          description: variable.description
        }
      })
    })
  })

  describe('extractTextFromContent', () => {
    it('should extract text from simple content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: '!' }
            ]
          }
        ]
      }
      
      const text = extractTextFromContent(content)
      expect(text).toBe('Hello [Mieter Name]!')
    })

    it('should handle empty content', () => {
      expect(extractTextFromContent(null)).toBe('')
      expect(extractTextFromContent({})).toBe('')
      expect(extractTextFromContent([])).toBe('')
    })

    it('should handle array content', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'First paragraph' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Second paragraph' }
          ]
        }
      ]
      
      const text = extractTextFromContent(content)
      expect(text).toBe('First paragraph\nSecond paragraph')
    })
  })

  describe('calculateContentStats', () => {
    it('should calculate content statistics', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Second paragraph' }
            ]
          }
        ]
      }
      
      const stats = calculateContentStats(content)
      expect(stats.paragraphCount).toBe(2)
      expect(stats.variableCount).toBe(1)
      expect(stats.characterCount).toBeGreaterThan(0)
      expect(stats.wordCount).toBeGreaterThan(0)
    })

    it('should handle empty content', () => {
      const stats = calculateContentStats({})
      expect(stats.paragraphCount).toBe(0)
      expect(stats.variableCount).toBe(0)
      expect(stats.characterCount).toBe(0)
      expect(stats.wordCount).toBe(0)
    })
  })

  describe('sanitizeVariableId', () => {
    it('should sanitize variable IDs', () => {
      expect(sanitizeVariableId('Invalid-ID!')).toBe('invalid_id')
      expect(sanitizeVariableId('  spaces  ')).toBe('spaces')
      expect(sanitizeVariableId('Multiple___Underscores')).toBe('multiple_underscores')
    })

    it('should limit length', () => {
      const longId = 'a'.repeat(100)
      const sanitized = sanitizeVariableId(longId)
      expect(sanitized.length).toBeLessThanOrEqual(50)
    })
  })

  describe('getVariableUsageStats', () => {
    it('should count variable usage', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              }
            ]
          }
        ]
      }
      
      const usage = getVariableUsageStats(content)
      expect(usage['tenant_name']).toBe(2)
      expect(usage['landlord_name']).toBe(1)
    })

    it('should handle empty content', () => {
      const usage = getVariableUsageStats({})
      expect(Object.keys(usage)).toHaveLength(0)
    })
  })
})