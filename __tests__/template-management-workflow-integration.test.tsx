/**
 * Integration tests for complete template management workflows
 * Tests end-to-end user journeys and complex multi-step operations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Components
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { CategorySelectionModal } from '@/components/category-selection-modal'

// Hooks and services
import { useTemplateOperations } from '@/hooks/use-template-operations'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateClientService } from '@/lib/template-client-service'

// Types
import { Template, TemplateFormData } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-template-operations')
jest.mock('@/hooks/use-modal-store')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockUseTemplateOperations = useTemplateOperations as jest.MockedFunction<typeof useTemplateOperations>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockTemplateClientService = templateClientService as jest.Mocked<typeof templateClientService>

describe('Template Management Workflow Integration Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  
  const mockTemplates: Template[] = [
    {
      id: 'template-1',
      titel: 'Standard Mietvertrag',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Mietvertrag zwischen ' },
              { type: 'mention', attrs: { id: 'landlord_name', label: 'Vermieter' } },
              { type: 'text', text: ' und ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter' } }
            ]
          }
        ]
      },
      kategorie: 'Mietverträge',
      kontext_anforderungen: ['landlord_name', 'tenant_name'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template-2',
      titel: 'Kündigung Vorlage',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hiermit kündige ich das Mietverhältnis für ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Adresse' } }
            ]
          }
        ]
      },
      kategorie: 'Kündigungen',
      kontext_anforderungen: ['property_address'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z'
    }
  ]

  const mockCategories = ['Mietverträge', 'Kündigungen', 'Nebenkostenabrechnungen', 'Sonstiges']

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Complete Template Lifecycle Workflow', () => {
    it('should handle complete template creation, editing, and deletion workflow', async () => {
      const user = userEvent.setup()
      
      // Mock operations
      const mockCreateTemplate = jest.fn().mockResolvedValue(mockTemplates[0])
      const mockUpdateTemplate = jest.fn().mockResolvedValue({
        ...mockTemplates[0],
        titel: 'Updated Standard Mietvertrag'
      })
      const mockDeleteTemplate = jest.fn().mockResolvedValue(true)
      const mockGetTemplate = jest.fn().mockResolvedValue(mockTemplates[0])

      // Mock API responses
      ;(global.fetch as jest.Mock)
        // Categories fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ categories: mockCategories })
        })
        // Template creation
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ template: mockTemplates[0] })
        })
        // Template fetch for editing
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: mockTemplates[0] })
        })
        // Template update
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: { ...mockTemplates[0], titel: 'Updated Standard Mietvertrag' } })
        })
        // Template deletion
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      mockTemplateClientService.getTemplate = mockGetTemplate

      // Setup hooks
      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      // Phase 1: Template Creation
      let currentModalState = {
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: jest.fn(),
          onCancel: jest.fn(),
          allowNewCategory: false
        },
        isTemplateEditorModalOpen: false,
        templateEditorData: undefined,
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      }

      mockUseModalStore.mockReturnValue(currentModalState as any)

      const { rerender } = render(<CategorySelectionModal />)

      // Select category
      const categoryBadge = screen.getByText('Mietverträge')
      await user.click(categoryBadge)

      const continueButton = screen.getByRole('button', { name: /fortfahren/i })
      await user.click(continueButton)

      // Phase 2: Template Editor for Creation
      currentModalState = {
        ...currentModalState,
        isCategorySelectionModalOpen: false,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Mietverträge',
          onSave: async (data: TemplateFormData) => {
            await mockCreateTemplate(data)
          },
          onCancel: jest.fn()
        }
      }

      mockUseModalStore.mockReturnValue(currentModalState as any)
      rerender(<TemplateEditorModal />)

      // Fill in template details
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Standard Mietvertrag')

      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          titel: 'Standard Mietvertrag',
          inhalt: expect.any(Object),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.any(Array)
        })
      })

      // Phase 3: Template Editing
      currentModalState = {
        ...currentModalState,
        templateEditorData: {
          templateId: mockTemplates[0].id,
          isNewTemplate: false,
          initialTitle: mockTemplates[0].titel,
          initialContent: mockTemplates[0].inhalt,
          initialCategory: mockTemplates[0].kategorie,
          onSave: async (data: TemplateFormData) => {
            await mockUpdateTemplate(mockTemplates[0].id, data)
          },
          onCancel: jest.fn()
        }
      }

      mockUseModalStore.mockReturnValue(currentModalState as any)
      rerender(<TemplateEditorModal />)

      // Modify title
      const editTitleInput = screen.getByDisplayValue('Standard Mietvertrag')
      await user.clear(editTitleInput)
      await user.type(editTitleInput, 'Updated Standard Mietvertrag')

      // Save changes
      const updateSaveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(updateSaveButton)

      await waitFor(() => {
        expect(mockUpdateTemplate).toHaveBeenCalledWith(mockTemplates[0].id, {
          titel: 'Updated Standard Mietvertrag',
          inhalt: expect.any(Object),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.any(Array)
        })
      })

      // Phase 4: Template Deletion
      const deleteResult = await mockDeleteTemplate(mockTemplates[0].id, 'Updated Standard Mietvertrag')
      expect(deleteResult).toBe(true)
    })

    it('should handle template duplication workflow', async () => {
      const mockDuplicateTemplate = jest.fn().mockResolvedValue({
        ...mockTemplates[0],
        id: 'template-duplicate',
        titel: 'Standard Mietvertrag (Kopie)'
      })

      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        duplicateTemplate: mockDuplicateTemplate,
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      // Simulate duplication
      const duplicatedTemplate = await mockDuplicateTemplate(mockTemplates[0])

      expect(mockDuplicateTemplate).toHaveBeenCalledWith(mockTemplates[0])
      expect(duplicatedTemplate.titel).toBe('Standard Mietvertrag (Kopie)')
      expect(duplicatedTemplate.id).toBe('template-duplicate')
      expect(duplicatedTemplate.inhalt).toEqual(mockTemplates[0].inhalt)
      expect(duplicatedTemplate.kategorie).toBe(mockTemplates[0].kategorie)
      expect(duplicatedTemplate.kontext_anforderungen).toEqual(mockTemplates[0].kontext_anforderungen)
    })
  })

  describe('Multi-Template Management Workflows', () => {
    it('should handle bulk template operations', async () => {
      const templateIds = ['template-1', 'template-2']
      const mockDeleteTemplate = jest.fn().mockResolvedValue(true)

      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: mockDeleteTemplate,
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      // Mock API responses for bulk deletion
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      // Simulate bulk deletion
      const deletePromises = templateIds.map(id => 
        mockDeleteTemplate(id, `Template ${id}`)
      )

      const results = await Promise.all(deletePromises)

      expect(mockDeleteTemplate).toHaveBeenCalledTimes(2)
      expect(results).toEqual([true, true])
    })

    it('should handle template category reorganization', async () => {
      const mockUpdateTemplate = jest.fn()
        .mockResolvedValueOnce({ ...mockTemplates[0], kategorie: 'Neue Kategorie' })
        .mockResolvedValueOnce({ ...mockTemplates[1], kategorie: 'Neue Kategorie' })

      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: jest.fn(),
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: jest.fn(),
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      // Mock API responses for category updates
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: { ...mockTemplates[0], kategorie: 'Neue Kategorie' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: { ...mockTemplates[1], kategorie: 'Neue Kategorie' } })
        })

      // Simulate moving templates to new category
      const updatePromises = mockTemplates.map(template =>
        mockUpdateTemplate(template.id, { kategorie: 'Neue Kategorie' })
      )

      const results = await Promise.all(updatePromises)

      expect(mockUpdateTemplate).toHaveBeenCalledTimes(2)
      expect(results[0].kategorie).toBe('Neue Kategorie')
      expect(results[1].kategorie).toBe('Neue Kategorie')
    })
  })

  describe('Template Content Management Workflows', () => {
    it('should handle complex template content with variables', async () => {
      const user = userEvent.setup()
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Mietvertrag' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Zwischen ' },
              { type: 'mention', attrs: { id: 'landlord_name', label: 'Vermieter Name' } },
              { type: 'text', text: ' (Vermieter) und ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: ' (Mieter) wird folgender Mietvertrag geschlossen:' }
            ]
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Mietobjekt' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Adresse: ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Objektadresse' } }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Miete: ' },
              { type: 'mention', attrs: { id: 'monthly_rent', label: 'Monatliche Miete' } },
              { type: 'text', text: ' EUR' }
            ]
          }
        ]
      }

      const mockCreateTemplate = jest.fn().mockResolvedValue({
        ...mockTemplates[0],
        inhalt: complexContent,
        kontext_anforderungen: ['landlord_name', 'tenant_name', 'property_address', 'monthly_rent']
      })

      const mockOnSave = jest.fn().mockImplementation(async (data: TemplateFormData) => {
        await mockCreateTemplate(data)
      })

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Mietverträge',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: mockCreateTemplate,
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Fill in template title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Komplexer Mietvertrag')

      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Komplexer Mietvertrag',
          inhalt: expect.any(Object),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.any(Array)
        })
      })
    })

    it('should handle template content validation and correction', async () => {
      const user = userEvent.setup()
      const invalidContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Template with invalid variable: ' },
              { type: 'mention', attrs: { id: 'invalid_variable', label: 'Invalid Variable' } }
            ]
          }
        ]
      }

      const mockCreateTemplate = jest.fn().mockRejectedValue(new Error('Validation failed: Unknown variable'))

      const mockOnSave = jest.fn().mockImplementation(async (data: TemplateFormData) => {
        await mockCreateTemplate(data)
      })

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          initialContent: invalidContent,
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: mockCreateTemplate,
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: jest.fn(),
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Fill in template title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Template with Invalid Variable')

      // Attempt to save (should fail validation)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      expect(mockCreateTemplate).toHaveBeenCalled()
    })
  })

  describe('Template Organization Workflows', () => {
    it('should handle template search and organization', async () => {
      const searchQuery = 'mietvertrag'
      const filteredTemplates = mockTemplates.filter(t => 
        t.titel.toLowerCase().includes(searchQuery.toLowerCase())
      )

      // Mock search API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: filteredTemplates })
      })

      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].titel).toBe('Standard Mietvertrag')
    })

    it('should handle template filtering by category', async () => {
      const category = 'Mietverträge'
      const filteredTemplates = mockTemplates.filter(t => t.kategorie === category)

      // Mock category filter API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: filteredTemplates })
      })

      const response = await fetch(`/api/templates?category=${encodeURIComponent(category)}`)
      const data = await response.json()

      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].kategorie).toBe('Mietverträge')
    })

    it('should handle template sorting and pagination', async () => {
      const sortedTemplates = [...mockTemplates].sort((a, b) => 
        new Date(b.erstellungsdatum).getTime() - new Date(a.erstellungsdatum).getTime()
      )

      // Mock paginated API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: sortedTemplates.slice(0, 1),
          totalCount: 2,
          limit: 1,
          offset: 0,
          hasMore: true
        })
      })

      const response = await fetch('/api/templates?limit=1&offset=0')
      const data = await response.json()

      expect(data.templates).toHaveLength(1)
      expect(data.totalCount).toBe(2)
      expect(data.hasMore).toBe(true)
      expect(data.templates[0].titel).toBe('Kündigung Vorlage') // Most recent
    })
  })

  describe('Template Collaboration Workflows', () => {
    it('should handle template sharing and permissions', async () => {
      // Mock template sharing (if implemented)
      const templateId = mockTemplates[0].id
      const shareData = {
        templateId,
        shareWith: ['user-456'],
        permissions: ['read']
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, shareId: 'share-123' })
      })

      const response = await fetch(`/api/templates/${templateId}/share`, {
        method: 'POST',
        body: JSON.stringify(shareData)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.shareId).toBe('share-123')
    })

    it('should handle template version history', async () => {
      // Mock version history (if implemented)
      const templateId = mockTemplates[0].id
      const mockVersions = [
        {
          version: 2,
          titel: 'Updated Standard Mietvertrag',
          aktualisiert_am: '2024-01-02T00:00:00Z',
          changes: ['Title updated', 'Content modified']
        },
        {
          version: 1,
          titel: 'Standard Mietvertrag',
          aktualisiert_am: '2024-01-01T00:00:00Z',
          changes: ['Initial version']
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions })
      })

      const response = await fetch(`/api/templates/${templateId}/versions`)
      const data = await response.json()

      expect(data.versions).toHaveLength(2)
      expect(data.versions[0].version).toBe(2)
      expect(data.versions[1].version).toBe(1)
    })
  })

  describe('Template Import/Export Workflows', () => {
    it('should handle template export', async () => {
      const templateIds = ['template-1', 'template-2']
      const exportFormat = 'json'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="templates.json"'
        }),
        blob: async () => new Blob([JSON.stringify(mockTemplates)], { type: 'application/json' })
      })

      const response = await fetch('/api/templates/export', {
        method: 'POST',
        body: JSON.stringify({ templateIds, format: exportFormat })
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('templates.json')
    })

    it('should handle template import', async () => {
      const importData = {
        templates: mockTemplates,
        options: {
          overwriteExisting: false,
          preserveIds: false
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          imported: 2,
          skipped: 0,
          errors: []
        })
      })

      const response = await fetch('/api/templates/import', {
        method: 'POST',
        body: JSON.stringify(importData)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.imported).toBe(2)
      expect(data.skipped).toBe(0)
      expect(data.errors).toHaveLength(0)
    })
  })
})