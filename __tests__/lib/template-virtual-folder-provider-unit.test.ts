/**
 * Unit tests for TemplateVirtualFolderProvider
 * Tests virtual folder structure creation and template organization
 */

import { TemplateVirtualFolderProvider, templateVirtualFolderProvider } from '../../lib/template-virtual-folder-provider'
import { templateService } from '../../lib/template-service'
import type { Template, TemplateItem } from '../../types/template'
import type { VirtualFolder } from '../../app/(dashboard)/dateien/actions'

// Mock dependencies
jest.mock('../../lib/supabase-server')
jest.mock('../../lib/template-service')

jest.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn()
          })),
          not: jest.fn(),
          order: jest.fn()
        }))
      }))
    }))
  }))
}))

describe('TemplateVirtualFolderProvider Unit Tests', () => {
  let provider: TemplateVirtualFolderProvider
  let mockTemplateService: jest.Mocked<typeof templateService>
  let mockSupabaseClient: any

  beforeEach(() => {
    provider = new TemplateVirtualFolderProvider()
    mockTemplateService = templateService as jest.Mocked<typeof templateService>
    
    // Get the mocked Supabase client
    const { createSupabaseServerClient } = require('../../lib/supabase-server')
    mockSupabaseClient = createSupabaseServerClient()
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('getTemplateRootFolder', () => {
    it('should return template root folder with correct structure', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue(['Category 1', 'Category 2'])
      
      // Mock total template count
      const mockEq = jest.fn().mockResolvedValue({
        count: 5,
        error: null
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateRootFolder('user-123')

      expect(result).toEqual({
        name: 'Vorlagen',
        path: 'user_user-123/Vorlagen',
        type: 'template_root',
        isEmpty: false,
        children: [],
        fileCount: 5,
        displayName: 'Vorlagen'
      })
    })

    it('should handle empty template collection', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue([])
      
      const mockEq = jest.fn().mockResolvedValue({
        count: 0,
        error: null
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateRootFolder('user-123')

      expect(result.isEmpty).toBe(true)
      expect(result.fileCount).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      mockTemplateService.getUserCategories.mockRejectedValue(new Error('Database error'))

      const result = await provider.getTemplateRootFolder('user-123')

      expect(result).toEqual({
        name: 'Vorlagen',
        path: 'user_user-123/Vorlagen',
        type: 'template_root',
        isEmpty: true,
        children: [],
        fileCount: 0,
        displayName: 'Vorlagen'
      })
    })
  })

  describe('getTemplateCategoryFolders', () => {
    it('should return category folders with template counts', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue(['Mietverträge', 'Kündigungen'])
      mockTemplateService.getCategoryTemplateCount
        .mockResolvedValueOnce(3) // Mietverträge
        .mockResolvedValueOnce(2) // Kündigungen

      // Mock uncategorized count
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            count: 1,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateCategoryFolders('user-123')

      expect(result).toHaveLength(3) // 2 categories + Sonstiges
      expect(result[0]).toEqual({
        name: 'Kündigungen',
        path: 'user_user-123/Vorlagen/Kündigungen',
        type: 'template_category',
        isEmpty: false,
        children: [],
        fileCount: 2,
        displayName: 'Kündigungen'
      })
      expect(result[1]).toEqual({
        name: 'Mietverträge',
        path: 'user_user-123/Vorlagen/Mietverträge',
        type: 'template_category',
        isEmpty: false,
        children: [],
        fileCount: 3,
        displayName: 'Mietverträge'
      })
      expect(result[2]).toEqual({
        name: 'Sonstiges',
        path: 'user_user-123/Vorlagen/Sonstiges',
        type: 'template_category',
        isEmpty: false,
        children: [],
        fileCount: 1,
        displayName: 'Sonstiges'
      })
    })

    it('should not include Sonstiges folder when no uncategorized templates', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue(['Mietverträge'])
      mockTemplateService.getCategoryTemplateCount.mockResolvedValue(3)

      // Mock uncategorized count as 0
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            count: 0,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateCategoryFolders('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Mietverträge')
    })

    it('should handle empty categories', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue(['Empty Category'])
      mockTemplateService.getCategoryTemplateCount.mockResolvedValue(0)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            count: 0,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateCategoryFolders('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].isEmpty).toBe(true)
      expect(result[0].fileCount).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      mockTemplateService.getUserCategories.mockRejectedValue(new Error('Database error'))

      const result = await provider.getTemplateCategoryFolders('user-123')

      expect(result).toEqual([])
    })

    it('should sort categories alphabetically with Sonstiges at end', async () => {
      mockTemplateService.getUserCategories.mockResolvedValue(['Zebra', 'Alpha', 'Beta'])
      mockTemplateService.getCategoryTemplateCount.mockResolvedValue(1)

      // Mock uncategorized count
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            count: 1,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplateCategoryFolders('user-123')

      expect(result.map(f => f.name)).toEqual(['Alpha', 'Beta', 'Zebra', 'Sonstiges'])
    })
  })

  describe('getTemplatesForCategory', () => {
    const mockTemplates: Template[] = [
      {
        id: 'template-1',
        titel: 'Template 1',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mietverträge',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      },
      {
        id: 'template-2',
        titel: 'Template 2',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mietverträge',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-02T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      }
    ]

    it('should return templates for specific category', async () => {
      mockTemplateService.getTemplatesByCategory.mockResolvedValue(mockTemplates)

      const result = await provider.getTemplatesForCategory('user-123', 'Mietverträge')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'template-1',
        name: 'Template 1',
        category: 'Mietverträge',
        type: 'template'
      }))
      expect(mockTemplateService.getTemplatesByCategory).toHaveBeenCalledWith('user-123', 'Mietverträge')
    })

    it('should handle Sonstiges category for uncategorized templates', async () => {
      const uncategorizedTemplates: Template[] = [
        {
          id: 'template-3',
          titel: 'Uncategorized Template',
          inhalt: { type: 'doc', content: [] },
          kategorie: null,
          user_id: 'user-123',
          erstellungsdatum: '2024-01-03T00:00:00Z',
          kontext_anforderungen: [],
          aktualisiert_am: null
        }
      ]

      // Mock the private method by mocking the Supabase call
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: uncategorizedTemplates,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await provider.getTemplatesForCategory('user-123', 'Sonstiges')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'template-3',
        name: 'Uncategorized Template',
        category: null,
        type: 'template'
      }))
    })

    it('should handle empty category', async () => {
      mockTemplateService.getTemplatesByCategory.mockResolvedValue([])

      const result = await provider.getTemplatesForCategory('user-123', 'Empty Category')

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      mockTemplateService.getTemplatesByCategory.mockRejectedValue(new Error('Database error'))

      const result = await provider.getTemplatesForCategory('user-123', 'Mietverträge')

      expect(result).toEqual([])
    })
  })

  describe('getAllTemplatesAsItems', () => {
    const mockTemplates: Template[] = [
      {
        id: 'template-1',
        titel: 'Template 1',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Category 1',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      },
      {
        id: 'template-2',
        titel: 'Template 2',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Category 2',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-02T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      }
    ]

    it('should return all templates as template items', async () => {
      mockTemplateService.getUserTemplates.mockResolvedValue(mockTemplates)

      const result = await provider.getAllTemplatesAsItems('user-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'template-1',
        name: 'Template 1',
        category: 'Category 1',
        type: 'template'
      }))
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'template-2',
        name: 'Template 2',
        category: 'Category 2',
        type: 'template'
      }))
    })

    it('should handle empty template list', async () => {
      mockTemplateService.getUserTemplates.mockResolvedValue([])

      const result = await provider.getAllTemplatesAsItems('user-123')

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      mockTemplateService.getUserTemplates.mockRejectedValue(new Error('Database error'))

      const result = await provider.getAllTemplatesAsItems('user-123')

      expect(result).toEqual([])
    })
  })

  describe('Static utility methods', () => {
    describe('isTemplatePath', () => {
      it('should identify template paths correctly', () => {
        expect(TemplateVirtualFolderProvider.isTemplatePath('user_123/Vorlagen')).toBe(true)
        expect(TemplateVirtualFolderProvider.isTemplatePath('user_123/Vorlagen/Category')).toBe(true)
        expect(TemplateVirtualFolderProvider.isTemplatePath('user_123/Documents')).toBe(false)
        expect(TemplateVirtualFolderProvider.isTemplatePath('user_123')).toBe(false)
        expect(TemplateVirtualFolderProvider.isTemplatePath('')).toBe(false)
      })
    })

    describe('parseTemplatePath', () => {
      it('should parse template root path correctly', () => {
        const result = TemplateVirtualFolderProvider.parseTemplatePath('user_123/Vorlagen')
        expect(result).toEqual({
          userId: '123',
          category: undefined
        })
      })

      it('should parse template category path correctly', () => {
        const result = TemplateVirtualFolderProvider.parseTemplatePath('user_123/Vorlagen/Mietverträge')
        expect(result).toEqual({
          userId: '123',
          category: 'Mietverträge'
        })
      })

      it('should handle invalid paths', () => {
        expect(TemplateVirtualFolderProvider.parseTemplatePath('invalid/path')).toBeNull()
        expect(TemplateVirtualFolderProvider.parseTemplatePath('user_123/Documents')).toBeNull()
        expect(TemplateVirtualFolderProvider.parseTemplatePath('123/Vorlagen')).toBeNull()
        expect(TemplateVirtualFolderProvider.parseTemplatePath('')).toBeNull()
      })

      it('should handle complex user IDs', () => {
        const result = TemplateVirtualFolderProvider.parseTemplatePath('user_abc-123-def/Vorlagen/Category')
        expect(result).toEqual({
          userId: 'abc-123-def',
          category: 'Category'
        })
      })
    })
  })

  describe('Private methods (via Supabase calls)', () => {
    describe('getTotalTemplateCount', () => {
      it('should count total templates correctly', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 10,
            error: null
          })
        })
        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect
        } as any)

        const result = await provider.getTemplateRootFolder('user-123')

        expect(result.fileCount).toBe(10)
        expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true })
      })

      it('should handle count errors', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Count error' }
          })
        })
        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect
        } as any)

        const result = await provider.getTemplateRootFolder('user-123')

        expect(result.fileCount).toBe(0)
      })
    })

    describe('getUncategorizedTemplateCount', () => {
      it('should count uncategorized templates correctly', async () => {
        mockTemplateService.getUserCategories.mockResolvedValue(['Category 1'])
        mockTemplateService.getCategoryTemplateCount.mockResolvedValue(5)

        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              count: 3,
              error: null
            })
          })
        })
        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect
        } as any)

        const result = await provider.getTemplateCategoryFolders('user-123')

        const sonstigesFolder = result.find(f => f.name === 'Sonstiges')
        expect(sonstigesFolder?.fileCount).toBe(3)
      })

      it('should handle uncategorized count errors', async () => {
        mockTemplateService.getUserCategories.mockResolvedValue(['Category 1'])
        mockTemplateService.getCategoryTemplateCount.mockResolvedValue(5)

        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'Count error' }
            })
          })
        })
        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect
        } as any)

        const result = await provider.getTemplateCategoryFolders('user-123')

        const sonstigesFolder = result.find(f => f.name === 'Sonstiges')
        expect(sonstigesFolder).toBeUndefined()
      })
    })
  })

  describe('Singleton instance', () => {
    it('should export singleton instance', () => {
      expect(templateVirtualFolderProvider).toBeInstanceOf(TemplateVirtualFolderProvider)
    })
  })
})