/**
 * Template Service Validation Integration Tests
 * Tests the integration between template service and enhanced validation
 */

import { TemplateService } from '../../lib/template-service'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              titel: 'Test Template',
              inhalt: { type: 'doc', content: [] },
              kategorie: 'Test',
              user_id: '123e4567-e89b-12d3-a456-426614174000',
              erstellungsdatum: new Date().toISOString(),
              kontext_anforderungen: [],
              aktualisiert_am: null
            },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          not: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          })),
          single: jest.fn(() => Promise.resolve({
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              titel: 'Test Template',
              inhalt: { type: 'doc', content: [] },
              kategorie: 'Test',
              user_id: '123e4567-e89b-12d3-a456-426614174000',
              erstellungsdatum: new Date().toISOString(),
              kontext_anforderungen: [],
              aktualisiert_am: null
            },
            error: null
          })),
          order: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                titel: 'Updated Template',
                inhalt: { type: 'doc', content: [] },
                kategorie: 'Test',
                user_id: '123e4567-e89b-12d3-a456-426614174000',
                erstellungsdatum: new Date().toISOString(),
                kontext_anforderungen: [],
                aktualisiert_am: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}))

describe('Template Service Validation Integration', () => {
  let templateService: TemplateService
  
  beforeEach(() => {
    templateService = new TemplateService()
    jest.clearAllMocks()
  })
  
  describe('Create Template with Validation', () => {
    it('should create template with valid data', async () => {
      const validData = {
        titel: 'Valid Template',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Valid content' }]
            }
          ]
        },
        kategorie: 'Valid Category',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = await templateService.createTemplate(validData)
      
      expect(result).toBeDefined()
      expect(result.titel).toBe('Test Template') // From mock
    })
    
    it('should reject template with invalid title', async () => {
      const invalidData = {
        titel: '', // Invalid: empty title
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Valid content' }]
            }
          ]
        },
        kategorie: 'Valid Category',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      await expect(templateService.createTemplate(invalidData)).rejects.toThrow()
    })
    
    it('should reject template with invalid category', async () => {
      const invalidData = {
        titel: 'Valid Title',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Valid content' }]
            }
          ]
        },
        kategorie: '', // Invalid: empty category
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      await expect(templateService.createTemplate(invalidData)).rejects.toThrow()
    })
    
    it('should reject template with invalid content', async () => {
      const invalidData = {
        titel: 'Valid Title',
        inhalt: {}, // Invalid: empty content
        kategorie: 'Valid Category',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      await expect(templateService.createTemplate(invalidData)).rejects.toThrow()
    })
    
    it('should reject template with invalid user_id', async () => {
      const invalidData = {
        titel: 'Valid Title',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Valid content' }]
            }
          ]
        },
        kategorie: 'Valid Category',
        user_id: 'invalid-uuid' // Invalid: not a UUID
      }
      
      await expect(templateService.createTemplate(invalidData)).rejects.toThrow()
    })
  })
  
  describe('Update Template with Validation', () => {
    it('should update template with valid data', async () => {
      const validUpdateData = {
        titel: 'Updated Title'
      }
      
      const result = await templateService.updateTemplate(
        '123e4567-e89b-12d3-a456-426614174000',
        validUpdateData
      )
      
      expect(result).toBeDefined()
      expect(result.titel).toBe('Updated Template') // From mock
    })
    
    it('should reject update with invalid title', async () => {
      const invalidUpdateData = {
        titel: '' // Invalid: empty title
      }
      
      await expect(templateService.updateTemplate(
        '123e4567-e89b-12d3-a456-426614174000',
        invalidUpdateData
      )).rejects.toThrow()
    })
    
    it('should reject update with invalid content', async () => {
      const invalidUpdateData = {
        inhalt: null // Invalid: null content
      }
      
      await expect(templateService.updateTemplate(
        '123e4567-e89b-12d3-a456-426614174000',
        invalidUpdateData
      )).rejects.toThrow()
    })
  })
  
  describe('Variable Extraction with Validation', () => {
    it('should extract and validate variables from content', () => {
      const contentWithVariables = {
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
              { type: 'text', text: ', your rent is ' },
              {
                type: 'mention',
                attrs: { id: 'rent_amount', label: 'Miete' }
              }
            ]
          }
        ]
      }
      
      const variables = templateService.extractVariablesFromContent(contentWithVariables)
      
      expect(variables).toContain('tenant_name')
      expect(variables).toContain('rent_amount')
      expect(variables).toHaveLength(2)
    })
    
    it('should validate template variables', () => {
      const contentWithInvalidVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: { id: 'invalid-variable-name', label: 'Invalid Variable' }
              }
            ]
          }
        ]
      }
      
      const validation = templateService.validateTemplateVariables(contentWithInvalidVariables)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })
  
  describe('Business Logic Validation', () => {
    it('should handle complex validation scenarios', async () => {
      const complexData = {
        titel: 'Complex Template with Variables',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Contract' }]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Between ' },
                {
                  type: 'mention',
                  attrs: { id: 'landlord_name', label: 'Landlord Name' }
                },
                { type: 'text', text: ' and ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Tenant Name' }
                }
              ]
            }
          ]
        },
        kategorie: 'Contracts',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      // This should succeed as it has valid structure and variables
      const result = await templateService.createTemplate(complexData)
      expect(result).toBeDefined()
    })
  })
})