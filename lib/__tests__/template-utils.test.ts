import {
  templateToTemplateItem,
  templatesToTemplateItems,
  calculateContentSize,
  extractPlainTextFromContent,
  getTemplatePreview,
  formatTemplateFileName,
  validateTemplateTitle,
  validateTemplateCategory,
  sanitizeTemplateTitle,
  sanitizeTemplateCategory,
  generateDuplicateTitle,
  sortTemplates,
  filterTemplatesBySearch
} from '../template-utils'
import type { Template } from '../../types/template'

describe('template-utils', () => {
  const mockTemplate: Template = {
    id: '123',
    titel: 'Test Template',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      ]
    },
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    kategorie: 'Test Category',
    kontext_anforderungen: ['tenant_name'],
    aktualisiert_am: '2024-01-02T00:00:00Z'
  }

  describe('templateToTemplateItem', () => {
    it('should convert Template to TemplateItem', () => {
      const result = templateToTemplateItem(mockTemplate)
      
      expect(result).toEqual({
        id: '123',
        name: 'Test Template',
        category: 'Test Category',
        content: JSON.stringify(mockTemplate.inhalt),
        variables: ['tenant_name'],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        size: expect.any(Number),
        type: 'template'
      })
    })

    it('should handle null updatedAt', () => {
      const template = { ...mockTemplate, aktualisiert_am: null }
      const result = templateToTemplateItem(template)
      
      expect(result.updatedAt).toBeNull()
    })
  })

  describe('templatesToTemplateItems', () => {
    it('should convert array of Templates to TemplateItems', () => {
      const templates = [mockTemplate, { ...mockTemplate, id: '456' }]
      const result = templatesToTemplateItems(templates)
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('123')
      expect(result[1].id).toBe('456')
    })
  })

  describe('calculateContentSize', () => {
    it('should calculate content size', () => {
      const size = calculateContentSize(mockTemplate.inhalt)
      expect(size).toBeGreaterThan(0)
    })

    it('should return 0 for empty content', () => {
      expect(calculateContentSize({})).toBe(0)
      expect(calculateContentSize(null as any)).toBe(0)
    })
  })

  describe('extractPlainTextFromContent', () => {
    it('should extract plain text from Tiptap content', () => {
      const text = extractPlainTextFromContent(mockTemplate.inhalt)
      expect(text).toBe('Hello world')
    })

    it('should handle nested content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Title' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }]
          }
        ]
      }
      
      const text = extractPlainTextFromContent(content)
      expect(text).toBe('TitleContent')
    })

    it('should return empty string for invalid content', () => {
      expect(extractPlainTextFromContent(null as any)).toBe('')
      expect(extractPlainTextFromContent({})).toBe('')
    })
  })

  describe('getTemplatePreview', () => {
    it('should return preview text', () => {
      const preview = getTemplatePreview(mockTemplate, 5)
      expect(preview).toBe('Hello...')
    })

    it('should return full text if shorter than max length', () => {
      const preview = getTemplatePreview(mockTemplate, 100)
      expect(preview).toBe('Hello world')
    })
  })

  describe('formatTemplateFileName', () => {
    it('should format template file name', () => {
      const fileName = formatTemplateFileName(mockTemplate)
      expect(fileName).toBe('Test Template.template')
    })
  })

  describe('validateTemplateTitle', () => {
    it('should validate valid title', () => {
      const result = validateTemplateTitle('Valid Title')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty title', () => {
      const result = validateTemplateTitle('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Titel ist erforderlich')
    })

    it('should reject title with invalid characters', () => {
      const result = validateTemplateTitle('Invalid<Title>')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Titel enthält ungültige Zeichen')
    })

    it('should reject too long title', () => {
      const longTitle = 'a'.repeat(256)
      const result = validateTemplateTitle(longTitle)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Titel ist zu lang (maximal 255 Zeichen)')
    })
  })

  describe('validateTemplateCategory', () => {
    it('should validate valid category', () => {
      const result = validateTemplateCategory('Valid Category')
      expect(result.isValid).toBe(true)
    })

    it('should reject empty category', () => {
      const result = validateTemplateCategory('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Kategorie ist erforderlich')
    })
  })

  describe('sanitizeTemplateTitle', () => {
    it('should sanitize title', () => {
      const result = sanitizeTemplateTitle('  Invalid<Title>  ')
      expect(result).toBe('InvalidTitle')
    })

    it('should limit length', () => {
      const longTitle = 'a'.repeat(300)
      const result = sanitizeTemplateTitle(longTitle)
      expect(result.length).toBe(255)
    })
  })

  describe('sanitizeTemplateCategory', () => {
    it('should sanitize category', () => {
      const result = sanitizeTemplateCategory('  Invalid<Category>  ')
      expect(result).toBe('InvalidCategory')
    })
  })

  describe('generateDuplicateTitle', () => {
    it('should generate unique duplicate title', () => {
      const existingTitles = ['Original', 'Original (Copy)']
      const result = generateDuplicateTitle('Original', existingTitles)
      expect(result).toBe('Original (Copy 2)')
    })

    it('should use simple copy if no conflict', () => {
      const existingTitles = ['Other Template']
      const result = generateDuplicateTitle('Original', existingTitles)
      expect(result).toBe('Original (Copy)')
    })
  })

  describe('sortTemplates', () => {
    const templates: Template[] = [
      { ...mockTemplate, id: '1', titel: 'B Template', erstellungsdatum: '2024-01-01T00:00:00Z' },
      { ...mockTemplate, id: '2', titel: 'A Template', erstellungsdatum: '2024-01-02T00:00:00Z' }
    ]

    it('should sort by title ascending', () => {
      const result = sortTemplates(templates, 'title', 'asc')
      expect(result[0].titel).toBe('A Template')
      expect(result[1].titel).toBe('B Template')
    })

    it('should sort by created date descending', () => {
      const result = sortTemplates(templates, 'created', 'desc')
      expect(result[0].id).toBe('2') // More recent
      expect(result[1].id).toBe('1')
    })
  })

  describe('filterTemplatesBySearch', () => {
    const templates: Template[] = [
      { ...mockTemplate, id: '1', titel: 'Contract Template', kategorie: 'Legal' },
      { ...mockTemplate, id: '2', titel: 'Invoice Template', kategorie: 'Finance' }
    ]

    it('should filter by title', () => {
      const result = filterTemplatesBySearch(templates, 'contract')
      expect(result).toHaveLength(1)
      expect(result[0].titel).toBe('Contract Template')
    })

    it('should filter by category', () => {
      const result = filterTemplatesBySearch(templates, 'finance')
      expect(result).toHaveLength(1)
      expect(result[0].kategorie).toBe('Finance')
    })

    it('should return all templates for empty search', () => {
      const result = filterTemplatesBySearch(templates, '')
      expect(result).toHaveLength(2)
    })
  })
})