/**
 * Test suite for template category-based organization
 * Tests the implementation of task 10.2: category-based organization
 */

import { templateVirtualFolderProvider } from '@/lib/template-virtual-folder-provider'
import { templateService } from '@/lib/template-service'

// Mock the template service
jest.mock('@/lib/template-service', () => ({
  templateService: {
    getUserCategories: jest.fn(),
    getCategoryTemplateCount: jest.fn(),
    getUserTemplates: jest.fn(),
    getTemplatesByCategory: jest.fn(),
  }
}))

// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
          head: () => ({ count: 0, error: null })
        })
      })
    })
  })
}))

describe('Template Category Organization', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Template Root Folder', () => {
    it('should create template root folder with correct type', async () => {
      // Mock empty templates
      ;(templateService.getUserCategories as jest.Mock).mockResolvedValue([])
      
      const rootFolder = await templateVirtualFolderProvider.getTemplateRootFolder(mockUserId)
      
      expect(rootFolder).toEqual({
        name: 'Vorlagen',
        path: `user_${mockUserId}/Vorlagen`,
        type: 'template_root',
        isEmpty: true,
        children: [],
        fileCount: 0,
        displayName: 'Vorlagen'
      })
    })

    it('should show correct file count when templates exist', async () => {
      // Mock templates exist
      ;(templateService.getUserCategories as jest.Mock).mockResolvedValue(['Mietverträge', 'Kündigungen'])
      
      // Mock the private method by creating a spy on the class instance
      const countSpy = jest.spyOn(templateVirtualFolderProvider as any, 'getTotalTemplateCount')
      countSpy.mockResolvedValue(5)
      
      const rootFolder = await templateVirtualFolderProvider.getTemplateRootFolder(mockUserId)
      
      expect(rootFolder.isEmpty).toBe(false)
      expect(rootFolder.fileCount).toBe(5)
    })
  })

  describe('Template Category Folders', () => {
    it('should create category folders with correct types', async () => {
      const mockCategories = ['Mietverträge', 'Kündigungen', 'Sonstiges']
      ;(templateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)
      ;(templateService.getCategoryTemplateCount as jest.Mock)
        .mockResolvedValueOnce(3) // Mietverträge
        .mockResolvedValueOnce(2) // Kündigungen
        .mockResolvedValueOnce(1) // Sonstiges

      // Mock uncategorized count
      const uncategorizedSpy = jest.spyOn(templateVirtualFolderProvider as any, 'getUncategorizedTemplateCount')
      uncategorizedSpy.mockResolvedValue(1)

      const categoryFolders = await templateVirtualFolderProvider.getTemplateCategoryFolders(mockUserId)
      
      expect(categoryFolders).toHaveLength(4) // 3 categories + 1 uncategorized
      
      // Check first category
      expect(categoryFolders[0]).toEqual({
        name: 'Kündigungen',
        path: `user_${mockUserId}/Vorlagen/Kündigungen`,
        type: 'template_category',
        isEmpty: false,
        children: [],
        fileCount: 2,
        displayName: 'Kündigungen'
      })

      // Check that Sonstiges is at the end
      const sonstigesFolder = categoryFolders.find(f => f.name === 'Sonstiges')
      expect(sonstigesFolder).toBeDefined()
      expect(categoryFolders[categoryFolders.length - 1].name).toBe('Sonstiges')
    })

    it('should handle empty categories correctly', async () => {
      const mockCategories = ['Empty Category']
      ;(templateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)
      ;(templateService.getCategoryTemplateCount as jest.Mock).mockResolvedValue(0)

      // Mock no uncategorized templates
      const uncategorizedSpy = jest.spyOn(templateVirtualFolderProvider as any, 'getUncategorizedTemplateCount')
      uncategorizedSpy.mockResolvedValue(0)

      const categoryFolders = await templateVirtualFolderProvider.getTemplateCategoryFolders(mockUserId)
      
      expect(categoryFolders).toHaveLength(1)
      expect(categoryFolders[0].isEmpty).toBe(true)
      expect(categoryFolders[0].fileCount).toBe(0)
    })

    it('should not include Sonstiges folder when no uncategorized templates exist', async () => {
      const mockCategories = ['Mietverträge']
      ;(templateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)
      ;(templateService.getCategoryTemplateCount as jest.Mock).mockResolvedValue(1)

      // Mock no uncategorized templates
      const uncategorizedSpy = jest.spyOn(templateVirtualFolderProvider as any, 'getUncategorizedTemplateCount')
      uncategorizedSpy.mockResolvedValue(0)

      const categoryFolders = await templateVirtualFolderProvider.getTemplateCategoryFolders(mockUserId)
      
      expect(categoryFolders).toHaveLength(1)
      expect(categoryFolders.find(f => f.name === 'Sonstiges')).toBeUndefined()
    })
  })

  describe('Template Category Content', () => {
    it('should get templates for specific category', async () => {
      const mockTemplates = [
        {
          id: '1',
          titel: 'Standard Mietvertrag',
          kategorie: 'Mietverträge',
          erstellungsdatum: '2024-01-01T00:00:00Z',
          aktualisiert_am: '2024-01-02T00:00:00Z',
          kontext_anforderungen: ['tenant_name', 'property_address'],
          inhalt: { type: 'doc', content: [] },
          user_id: mockUserId
        }
      ]

      ;(templateService.getTemplatesByCategory as jest.Mock).mockResolvedValue(mockTemplates)

      const templates = await templateVirtualFolderProvider.getTemplatesForCategory(mockUserId, 'Mietverträge')
      
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('Standard Mietvertrag')
      expect(templates[0].category).toBe('Mietverträge')
      expect(templates[0].variables).toEqual(['tenant_name', 'property_address'])
    })

    it('should handle Sonstiges category for uncategorized templates', async () => {
      const mockUncategorizedTemplates = [
        {
          id: '1',
          titel: 'Uncategorized Template',
          kategorie: null,
          erstellungsdatum: '2024-01-01T00:00:00Z',
          aktualisiert_am: null,
          kontext_anforderungen: [],
          inhalt: { type: 'doc', content: [] },
          user_id: mockUserId
        }
      ]

      // Mock the private method
      const uncategorizedSpy = jest.spyOn(templateVirtualFolderProvider as any, 'getUncategorizedTemplates')
      uncategorizedSpy.mockResolvedValue(mockUncategorizedTemplates)

      const templates = await templateVirtualFolderProvider.getTemplatesForCategory(mockUserId, 'Sonstiges')
      
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('Uncategorized Template')
      expect(templates[0].category).toBeNull()
    })
  })

  describe('Path Parsing', () => {
    it('should correctly parse template root path', () => {
      const path = `user_${mockUserId}/Vorlagen`
      const { TemplateVirtualFolderProvider } = require('@/lib/template-virtual-folder-provider')
      const result = TemplateVirtualFolderProvider.parseTemplatePath(path)
      
      expect(result).toEqual({
        userId: mockUserId,
        category: undefined
      })
    })

    it('should correctly parse template category path', () => {
      const path = `user_${mockUserId}/Vorlagen/Mietverträge`
      const { TemplateVirtualFolderProvider } = require('@/lib/template-virtual-folder-provider')
      const result = TemplateVirtualFolderProvider.parseTemplatePath(path)
      
      expect(result).toEqual({
        userId: mockUserId,
        category: 'Mietverträge'
      })
    })

    it('should return null for invalid paths', () => {
      const invalidPaths = [
        'invalid/path',
        `user_${mockUserId}/Documents`,
        'completely/invalid/path'
      ]

      const { TemplateVirtualFolderProvider } = require('@/lib/template-virtual-folder-provider')
      invalidPaths.forEach(path => {
        const result = TemplateVirtualFolderProvider.parseTemplatePath(path)
        expect(result).toBeNull()
      })
    })
  })

  describe('Template Path Detection', () => {
    it('should correctly identify template paths', () => {
      const templatePaths = [
        `user_${mockUserId}/Vorlagen`,
        `user_${mockUserId}/Vorlagen/Mietverträge`,
        `user_${mockUserId}/Vorlagen/Sonstiges`
      ]

      const { TemplateVirtualFolderProvider } = require('@/lib/template-virtual-folder-provider')
      templatePaths.forEach(path => {
        const isTemplate = TemplateVirtualFolderProvider.isTemplatePath(path)
        expect(isTemplate).toBe(true)
      })
    })

    it('should correctly identify non-template paths', () => {
      const nonTemplatePaths = [
        `user_${mockUserId}`,
        `user_${mockUserId}/Documents`,
        `user_${mockUserId}/house-123`,
        'invalid/path'
      ]

      const { TemplateVirtualFolderProvider } = require('@/lib/template-virtual-folder-provider')
      nonTemplatePaths.forEach(path => {
        const isTemplate = TemplateVirtualFolderProvider.isTemplatePath(path)
        expect(isTemplate).toBe(false)
      })
    })
  })
})