import { TemplateService } from '../../lib/template-service'

// Mock the Supabase client
jest.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        not: jest.fn(() => ({}))
      }))
    }))
  }))
}))

describe('TemplateService - Variable Extraction and Management', () => {
  let templateService: TemplateService

  beforeEach(() => {
    templateService = new TemplateService()
  })

  describe('extractVariablesFromContent', () => {
    it('should extract variables from simple mention nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              },
              { type: 'text', text: '!' }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should extract multiple variables from complex content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
              { type: 'text', text: 'Mietvertrag für ' },
              {
                type: 'mention',
                attrs: {
                  id: 'property_name',
                  label: 'Objektname'
                }
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Zwischen ' },
              {
                type: 'mention',
                attrs: {
                  id: 'landlord_name',
                  label: 'Vermieter Name'
                }
              },
              { type: 'text', text: ' und ' },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['landlord_name', 'property_name', 'tenant_name'])
    })

    it('should handle variables in text node marks', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'tenant_name',
                marks: [
                  {
                    type: 'mention',
                    attrs: {
                      id: 'tenant_name',
                      label: 'Mieter Name'
                    }
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should handle nested content structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'mention',
                            attrs: {
                              id: 'apartment_rent',
                              label: 'Kaltmiete'
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['apartment_rent'])
    })

    it('should handle empty or invalid content gracefully', () => {
      expect(templateService.extractVariablesFromContent({})).toEqual([])
      expect(templateService.extractVariablesFromContent({ type: 'doc', content: [] })).toEqual([])
      expect(templateService.extractVariablesFromContent(null as any)).toEqual([])
      expect(templateService.extractVariablesFromContent(undefined as any)).toEqual([])
    })

    it('should deduplicate variables and return sorted array', () => {
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
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['landlord_name', 'tenant_name'])
    })

    it('should handle array content format', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'property_address', label: 'Objektadresse' }
            }
          ]
        }
      ]

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['property_address'])
    })
  })

  describe('validateTemplateVariables', () => {
    it('should validate content with valid variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect unknown variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'unknown_variable', label: 'Unknown' }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('UNKNOWN_VARIABLE')
      expect(result.errors[0].message).toContain('unknown_variable')
    })

    it('should warn about empty content', () => {
      const result = templateService.validateTemplateVariables({})
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('EMPTY_CONTENT')
    })

    it('should warn about content without variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is just plain text' }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'NO_VARIABLES')).toBe(true)
    })

    it('should warn about variables requiring context', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.warnings.some(w => w.code === 'CONTEXT_REQUIRED')).toBe(true)
    })

    it('should detect invalid mention nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {} // Missing id
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_MENTION_NODE')).toBe(true)
    })

    it('should warn about duplicate variables', () => {
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
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.warnings.some(w => w.code === 'DUPLICATE_VARIABLES')).toBe(true)
    })
  })

  describe('getVariablesByCategory', () => {
    it('should return variables organized by category', () => {
      const categorized = templateService.getVariablesByCategory()
      
      expect(categorized).toHaveProperty('Mieter')
      expect(categorized).toHaveProperty('Vermieter')
      expect(categorized).toHaveProperty('Immobilie')
      expect(categorized).toHaveProperty('Wohnung')
      expect(categorized).toHaveProperty('Finanzen')
      expect(categorized).toHaveProperty('Datum')
      
      // Check that variables are sorted within categories
      const mieterVariables = categorized['Mieter']
      expect(mieterVariables.length).toBeGreaterThan(0)
      
      for (let i = 1; i < mieterVariables.length; i++) {
        expect(mieterVariables[i-1].label.localeCompare(mieterVariables[i].label)).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('searchVariables', () => {
    it('should find variables by label', () => {
      const results = templateService.searchVariables('Mieter')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(v => v.label.toLowerCase().includes('mieter'))).toBe(true)
    })

    it('should find variables by ID', () => {
      const results = templateService.searchVariables('tenant_name')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('tenant_name')
    })

    it('should find variables by category', () => {
      const results = templateService.searchVariables('Datum')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(v => v.category === 'Datum')).toBe(true)
    })

    it('should find variables by description', () => {
      const results = templateService.searchVariables('Telefonnummer')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(v => v.description?.toLowerCase().includes('telefonnummer'))).toBe(true)
    })

    it('should return empty array for no matches', () => {
      const results = templateService.searchVariables('nonexistent')
      expect(results).toEqual([])
    })

    it('should be case insensitive', () => {
      const results1 = templateService.searchVariables('MIETER')
      const results2 = templateService.searchVariables('mieter')
      expect(results1).toEqual(results2)
    })
  })

  describe('getVariableById', () => {
    it('should return variable by ID', () => {
      const variable = templateService.getVariableById('tenant_name')
      expect(variable).toBeDefined()
      expect(variable?.id).toBe('tenant_name')
      expect(variable?.label).toBe('Mieter Name')
    })

    it('should return undefined for unknown ID', () => {
      const variable = templateService.getVariableById('unknown_id')
      expect(variable).toBeUndefined()
    })
  })

  describe('getContextRequirements', () => {
    it('should return context requirements for variables', () => {
      const requirements = templateService.getContextRequirements(['tenant_name', 'property_name'])
      expect(requirements).toContain('tenant')
      expect(requirements).toContain('property')
      expect(requirements).toEqual(requirements.sort()) // Should be sorted
    })

    it('should deduplicate context requirements', () => {
      const requirements = templateService.getContextRequirements(['tenant_name', 'tenant_email'])
      expect(requirements.filter(r => r === 'tenant')).toHaveLength(1)
    })

    it('should handle variables without context', () => {
      const requirements = templateService.getContextRequirements(['current_date'])
      expect(requirements).toEqual([])
    })

    it('should handle empty variable list', () => {
      const requirements = templateService.getContextRequirements([])
      expect(requirements).toEqual([])
    })

    it('should handle unknown variables gracefully', () => {
      const requirements = templateService.getContextRequirements(['unknown_variable'])
      expect(requirements).toEqual([])
    })
  })

  describe('getAvailableVariables', () => {
    it('should return all predefined variables', () => {
      const variables = templateService.getAvailableVariables()
      expect(variables.length).toBeGreaterThan(0)
      
      // Check that all variables have required properties
      variables.forEach(variable => {
        expect(variable).toHaveProperty('id')
        expect(variable).toHaveProperty('label')
        expect(variable).toHaveProperty('category')
        expect(variable).toHaveProperty('description')
        expect(typeof variable.id).toBe('string')
        expect(typeof variable.label).toBe('string')
        expect(typeof variable.category).toBe('string')
      })
    })

    it('should include variables from all expected categories', () => {
      const variables = templateService.getAvailableVariables()
      const categories = [...new Set(variables.map(v => v.category))]
      
      expect(categories).toContain('Mieter')
      expect(categories).toContain('Vermieter')
      expect(categories).toContain('Immobilie')
      expect(categories).toContain('Wohnung')
      expect(categories).toContain('Finanzen')
      expect(categories).toContain('Datum')
    })

    it('should have unique variable IDs', () => {
      const variables = templateService.getAvailableVariables()
      const ids = variables.map(v => v.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })
  })
})