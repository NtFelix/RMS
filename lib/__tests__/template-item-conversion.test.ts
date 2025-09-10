import { templateToTemplateItem, templatesToTemplateItems, calculateContentSize, extractPlainTextFromContent, getTemplatePreview, formatTemplateFileName } from '../template-utils'
import type { Template } from '../../types/template'

describe('Template Item Conversion', () => {
  const mockTemplate: Template = {
    id: 'template-123',
    titel: 'Mietvertrag Vorlage',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [
            { type: 'text', text: 'Mietvertrag' }
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
            },
            { type: 'text', text: ' wird folgender Mietvertrag geschlossen.' }
          ]
        }
      ]
    },
    user_id: 'user-456',
    erstellungsdatum: '2024-01-15T10:30:00Z',
    kategorie: 'Mietverträge',
    kontext_anforderungen: ['landlord_name', 'tenant_name'],
    aktualisiert_am: '2024-01-16T14:20:00Z'
  }

  const mockTemplateWithoutCategory: Template = {
    ...mockTemplate,
    id: 'template-456',
    titel: 'Allgemeine Vorlage',
    kategorie: null,
    aktualisiert_am: null
  }

  describe('templateToTemplateItem', () => {
    it('should convert Template to TemplateItem with all fields', () => {
      const result = templateToTemplateItem(mockTemplate)
      
      expect(result).toEqual({
        id: 'template-123',
        name: 'Mietvertrag Vorlage',
        category: 'Mietverträge',
        content: JSON.stringify(mockTemplate.inhalt),
        variables: ['landlord_name', 'tenant_name'],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T14:20:00Z'),
        size: expect.any(Number),
        type: 'template'
      })
      
      expect(result.size).toBeGreaterThan(0)
    })

    it('should handle template without category', () => {
      const result = templateToTemplateItem(mockTemplateWithoutCategory)
      
      expect(result.category).toBeNull()
      expect(result.updatedAt).toBeNull()
    })

    it('should handle template with empty variables array', () => {
      const templateWithoutVars = {
        ...mockTemplate,
        kontext_anforderungen: []
      }
      
      const result = templateToTemplateItem(templateWithoutVars)
      expect(result.variables).toEqual([])
    })

    it('should handle template with undefined variables', () => {
      const templateWithoutVars = {
        ...mockTemplate,
        kontext_anforderungen: undefined as any
      }
      
      const result = templateToTemplateItem(templateWithoutVars)
      expect(result.variables).toEqual([])
    })
  })

  describe('templatesToTemplateItems', () => {
    it('should convert array of templates', () => {
      const templates = [mockTemplate, mockTemplateWithoutCategory]
      const result = templatesToTemplateItems(templates)
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('template-123')
      expect(result[1].id).toBe('template-456')
      expect(result[0].type).toBe('template')
      expect(result[1].type).toBe('template')
    })

    it('should handle empty array', () => {
      const result = templatesToTemplateItems([])
      expect(result).toEqual([])
    })
  })

  describe('Template metadata calculation', () => {
    it('should calculate content size correctly', () => {
      const size = calculateContentSize(mockTemplate.inhalt)
      const expectedSize = JSON.stringify(mockTemplate.inhalt).length
      
      expect(size).toBe(expectedSize)
      expect(size).toBeGreaterThan(100) // Should be substantial content
    })

    it('should extract plain text from complex content', () => {
      const plainText = extractPlainTextFromContent(mockTemplate.inhalt)
      
      expect(plainText).toBe('MietvertragZwischen Vermieter Name und Mieter Name wird folgender Mietvertrag geschlossen.')
    })

    it('should generate template preview', () => {
      const preview = getTemplatePreview(mockTemplate, 50)
      
      expect(preview).toBe('MietvertragZwischen Vermieter Name und Mieter N...')
      expect(preview.length).toBe(50)
    })

    it('should format template file name', () => {
      const fileName = formatTemplateFileName(mockTemplate)
      expect(fileName).toBe('Mietvertrag Vorlage.template')
    })
  })

  describe('Template item display properties', () => {
    it('should include variable count in metadata', () => {
      const item = templateToTemplateItem(mockTemplate)
      expect(item.variables).toHaveLength(2)
      expect(item.variables).toContain('landlord_name')
      expect(item.variables).toContain('tenant_name')
    })

    it('should have correct type for documents interface', () => {
      const item = templateToTemplateItem(mockTemplate)
      expect(item.type).toBe('template')
    })

    it('should preserve creation and update timestamps', () => {
      const item = templateToTemplateItem(mockTemplate)
      
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(item.updatedAt).toBeInstanceOf(Date)
      expect(item.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime())
      expect(item.updatedAt!.getTime()).toBe(new Date('2024-01-16T14:20:00Z').getTime())
    })

    it('should map template title to item name', () => {
      const item = templateToTemplateItem(mockTemplate)
      expect(item.name).toBe(mockTemplate.titel)
    })

    it('should preserve category information', () => {
      const item = templateToTemplateItem(mockTemplate)
      expect(item.category).toBe(mockTemplate.kategorie)
    })
  })

  describe('Edge cases', () => {
    it('should handle template with minimal content', () => {
      const minimalTemplate: Template = {
        id: 'minimal-123',
        titel: 'Minimal',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user-123',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kategorie: null,
        kontext_anforderungen: [],
        aktualisiert_am: null
      }
      
      const item = templateToTemplateItem(minimalTemplate)
      
      expect(item.name).toBe('Minimal')
      expect(item.variables).toEqual([])
      expect(item.size).toBeGreaterThan(0) // JSON still has some size
      expect(item.category).toBeNull()
      expect(item.updatedAt).toBeNull()
    })

    it('should handle template with complex nested content', () => {
      const complexTemplate: Template = {
        ...mockTemplate,
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Title' }]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'Item with ' },
                        {
                          type: 'mention',
                          attrs: { id: 'variable_1', label: 'Variable 1' }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        kontext_anforderungen: ['variable_1']
      }
      
      const item = templateToTemplateItem(complexTemplate)
      const plainText = extractPlainTextFromContent(complexTemplate.inhalt)
      
      expect(plainText).toBe('TitleItem with Variable 1')
      expect(item.variables).toEqual(['variable_1'])
      expect(item.size).toBeGreaterThan(0)
    })
  })
})