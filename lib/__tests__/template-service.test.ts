import { TemplateService } from '../template-service'

// Mock the Supabase client
jest.mock('../supabase-server', () => ({
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
        not: jest.fn(() => ({})),
        order: jest.fn()
      }))
    }))
  }))
}))

describe('TemplateService', () => {
  let templateService: TemplateService

  beforeEach(() => {
    templateService = new TemplateService()
    jest.clearAllMocks()
  })

  describe('extractVariablesFromContent', () => {
    it('should extract variables from Tiptap JSON content', () => {
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
              { type: 'text', text: ', your rent is ' },
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

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['apartment_rent', 'tenant_name'])
    })

    it('should handle nested content structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
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
              {
                type: 'mention',
                attrs: {
                  id: 'landlord_name',
                  label: 'Vermieter Name'
                }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['landlord_name', 'property_name'])
    })

    it('should return empty array for content without mentions', () => {
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

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual([])
    })

    it('should handle empty or invalid content', () => {
      expect(templateService.extractVariablesFromContent({})).toEqual([])
      expect(templateService.extractVariablesFromContent(null as any)).toEqual([])
      expect(templateService.extractVariablesFromContent(undefined as any)).toEqual([])
    })

    it('should deduplicate variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              },
              { type: 'text', text: ' and ' },
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
      expect(variables).toEqual(['tenant_name'])
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
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'invalid_variable',
                  label: 'Invalid Variable'
                }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('UNKNOWN_VARIABLE')
      expect(result.errors[0].message).toContain('invalid_variable')
    })

    it('should warn about empty content', () => {
      const result = templateService.validateTemplateVariables({})
      expect(result.isValid).toBe(true) // No errors, just warnings
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('EMPTY_CONTENT')
    })
  })

  describe('getAvailableVariables', () => {
    it('should return predefined variables', () => {
      const variables = templateService.getAvailableVariables()
      
      expect(variables.length).toBeGreaterThan(0)
      expect(variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'tenant_name',
            label: 'Mieter Name',
            category: 'Mieter'
          }),
          expect.objectContaining({
            id: 'property_name',
            label: 'Objektname',
            category: 'Immobilie'
          }),
          expect.objectContaining({
            id: 'apartment_rent',
            label: 'Kaltmiete',
            category: 'Finanzen'
          })
        ])
      )
    })

    it('should have variables organized by categories', () => {
      const variables = templateService.getAvailableVariables()
      const categories = [...new Set(variables.map(v => v.category))]
      
      expect(categories).toEqual(
        expect.arrayContaining([
          'Immobilie',
          'Vermieter', 
          'Mieter',
          'Wohnung',
          'Finanzen',
          'Datum'
        ])
      )
    })

    it('should have all variables with required properties', () => {
      const variables = templateService.getAvailableVariables()
      
      variables.forEach(variable => {
        expect(variable).toHaveProperty('id')
        expect(variable).toHaveProperty('label')
        expect(variable).toHaveProperty('category')
        expect(typeof variable.id).toBe('string')
        expect(typeof variable.label).toBe('string')
        expect(typeof variable.category).toBe('string')
        expect(variable.id.length).toBeGreaterThan(0)
        expect(variable.label.length).toBeGreaterThan(0)
        expect(variable.category.length).toBeGreaterThan(0)
      })
    })
  })
})