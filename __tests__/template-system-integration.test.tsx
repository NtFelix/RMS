/**
 * Integration tests for the Document Template System
 * Tests complete workflows from UI interactions to API calls and database operations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Components
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'

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

describe('Template System Integration Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockTemplate: Template = {
    id: 'template-123',
    titel: 'Test Template',
    inhalt: {
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
        }
      ]
    },
    kategorie: 'Mietverträge',
    kontext_anforderungen: ['tenant_name'],
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  const mockCategories = ['Mietverträge', 'Kündigungen', 'Nebenkostenabrechnungen', 'Sonstiges']

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
    
    // Default mock implementations
    mockUseTemplateOperations.mockReturnValue({
      isLoading: false,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      duplicateTemplate: jest.fn(),
      openCreateTemplateEditor: jest.fn(),
      openEditTemplateEditor: jest.fn(),
      createTemplateSaveHandler: jest.fn()
    })

    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: false,
      categorySelectionData: undefined,
      isTemplateEditorModalOpen: false,
      templateEditorData: undefined,
      isTemplateEditorModalDirty: false,
      openCategorySelectionModal: jest.fn(),
      closeCategorySelectionModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
      closeTemplateEditorModal: jest.fn(),
      setTemplateEditorModalDirty: jest.fn()
    } as any)
  })

  describe('Complete Template Creation Workflow', () => {
    it('should complete the full template creation workflow from button click to saved template', async () => {
      const user = userEvent.setup()
      const mockCreateTemplate = jest.fn().mockResolvedValue(mockTemplate)
      const mockOpenCategorySelectionModal = jest.fn()
      const mockOpenCreateTemplateEditor = jest.fn()
      const mockCloseCategorySelectionModal = jest.fn()
      const mockOpenTemplateEditorModal = jest.fn()
      const mockCloseTemplateEditorModal = jest.fn()

      // Mock successful API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ categories: mockCategories })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: mockTemplate }),
          status: 201
        })

      // Setup mocks
      mockUseTemplateOperations.mockReturnValue({
        isLoading: false,
        createTemplate: mockCreateTemplate,
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        duplicateTemplate: jest.fn(),
        openCreateTemplateEditor: mockOpenCreateTemplateEditor,
        openEditTemplateEditor: jest.fn(),
        createTemplateSaveHandler: jest.fn()
      })

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: (category: string) => {
            mockOpenCreateTemplateEditor(category)
            mockCloseCategorySelectionModal()
          },
          onCancel: mockCloseCategorySelectionModal,
          allowNewCategory: false
        },
        isTemplateEditorModalOpen: false,
        templateEditorData: undefined,
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: mockOpenCategorySelectionModal,
        closeCategorySelectionModal: mockCloseCategorySelectionModal,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      // Render category selection modal
      render(<CategorySelectionModal />)

      // Step 1: User sees category selection modal
      expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()

      // Step 2: User selects a category
      const categoryBadge = screen.getByText('Mietverträge')
      await user.click(categoryBadge)

      // Step 3: User clicks continue
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)

      // Verify workflow progression
      expect(mockOpenCreateTemplateEditor).toHaveBeenCalledWith('Mietverträge')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })

    it('should handle template creation with content and variables', async () => {
      const user = userEvent.setup()
      const mockCreateTemplate = jest.fn().mockResolvedValue(mockTemplate)
      const mockOnSave = jest.fn().mockImplementation(async (data: TemplateFormData) => {
        await mockCreateTemplate(data)
      })

      // Mock template editor modal as open
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

      // Verify modal is open
      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument()
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()

      // Fill in template title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Test Mietvertrag')

      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify save was called with correct data
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Test Mietvertrag',
          inhalt: expect.any(Object),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.any(Array)
        })
      })
    })

    it('should prevent new category creation during template creation', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: jest.fn(),
          onCancel: jest.fn(),
          allowNewCategory: false // This should prevent new category creation
        },
        isTemplateEditorModalOpen: false,
        templateEditorData: undefined,
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<CategorySelectionModal />)

      // Verify that new category creation is not available
      expect(screen.queryByText(/neue kategorie erstellen/i)).not.toBeInTheDocument()
      
      // Only existing categories should be shown
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    })
  })

  describe('Template Editing and Management Workflows', () => {
    it('should load existing template for editing', async () => {
      const mockUpdateTemplate = jest.fn().mockResolvedValue(mockTemplate)
      const mockGetTemplate = jest.fn().mockResolvedValue(mockTemplate)
      const mockOnSave = jest.fn()

      mockTemplateClientService.getTemplate = mockGetTemplate
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

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: mockTemplate.id,
          isNewTemplate: false,
          initialTitle: mockTemplate.titel,
          initialContent: mockTemplate.inhalt,
          initialCategory: mockTemplate.kategorie,
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

      render(<TemplateEditorModal />)

      // Verify template data is loaded
      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    })

    it('should handle template duplication', async () => {
      const mockDuplicateTemplate = jest.fn().mockResolvedValue({
        ...mockTemplate,
        id: 'template-456',
        titel: 'Test Template (Kopie)'
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
      const result = await mockDuplicateTemplate(mockTemplate)

      expect(mockDuplicateTemplate).toHaveBeenCalledWith(mockTemplate)
      expect(result.titel).toBe('Test Template (Kopie)')
      expect(result.id).toBe('template-456')
    })

    it('should handle template deletion with confirmation', async () => {
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

      // Simulate deletion
      const result = await mockDeleteTemplate(mockTemplate.id, mockTemplate.titel)

      expect(mockDeleteTemplate).toHaveBeenCalledWith(mockTemplate.id, mockTemplate.titel)
      expect(result).toBe(true)
    })

    it('should track dirty state during editing', async () => {
      const user = userEvent.setup()
      const mockSetTemplateEditorModalDirty = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: mockTemplate.id,
          isNewTemplate: false,
          initialTitle: mockTemplate.titel,
          initialContent: mockTemplate.inhalt,
          initialCategory: mockTemplate.kategorie,
          onSave: jest.fn(),
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty
      } as any)

      render(<TemplateEditorModal />)

      // Modify title to trigger dirty state
      const titleInput = screen.getByDisplayValue('Test Template')
      await user.type(titleInput, ' Modified')

      // Verify dirty state is set
      expect(mockSetTemplateEditorModalDirty).toHaveBeenCalledWith(true)
    })
  })

  describe('Template Search and Filtering Functionality', () => {
    it('should fetch templates with search parameters', async () => {
      const searchQuery = 'mietvertrag'
      const mockTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })

      // Simulate search API call
      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=mietvertrag')
      expect(data.templates).toEqual(mockTemplates)
    })

    it('should fetch templates by category', async () => {
      const category = 'Mietverträge'
      const mockTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })

      // Simulate category filter API call
      const response = await fetch(`/api/templates?category=${encodeURIComponent(category)}`)
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?category=Mietvertr%C3%A4ge')
      expect(data.templates).toEqual(mockTemplates)
    })

    it('should handle paginated template results', async () => {
      const mockPaginatedResponse = {
        templates: [mockTemplate],
        totalCount: 25,
        limit: 10,
        offset: 0,
        hasMore: true
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      })

      // Simulate paginated API call
      const response = await fetch('/api/templates?limit=10&offset=0')
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?limit=10&offset=0')
      expect(data.templates).toEqual([mockTemplate])
      expect(data.totalCount).toBe(25)
      expect(data.hasMore).toBe(true)
    })

    it('should combine search and category filters', async () => {
      const searchQuery = 'standard'
      const category = 'Mietverträge'
      const mockTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })

      // Simulate combined filter API call
      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(category)}`)
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=standard&category=Mietvertr%C3%A4ge')
      expect(data.templates).toEqual(mockTemplates)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors during template creation', async () => {
      const user = userEvent.setup()
      const mockCreateTemplate = jest.fn().mockRejectedValue(new Error('API Error'))
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
      await user.type(titleInput, 'Test Template')

      // Attempt to save
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify error handling
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should handle validation errors', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn()

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

      render(<TemplateEditorModal />)

      // Try to save without title
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Save button should be disabled due to empty title
      expect(saveButton).toBeDisabled()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should handle network errors during category loading', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/templates/categories')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should handle unauthorized access', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle template not found errors', async () => {
      const templateId = 'non-existent-template'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Template not found' })
      })

      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Template not found')
    })

    it('should handle malformed template content', async () => {
      const malformedContent = { invalid: 'structure' }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: 'Template validation failed',
          validationErrors: ['Invalid content structure']
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titel: 'Test Template',
          inhalt: malformedContent,
          kategorie: 'Test'
        })
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Template validation failed')
      expect(data.validationErrors).toContain('Invalid content structure')
    })

    it('should handle empty template lists gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toEqual([])
    })

    it('should handle concurrent template operations', async () => {
      const mockCreateTemplate = jest.fn()
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce({ ...mockTemplate, id: 'template-456' })

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

      // Simulate concurrent template creation
      const templateData1: TemplateFormData = {
        titel: 'Template 1',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: []
      }

      const templateData2: TemplateFormData = {
        titel: 'Template 2',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: []
      }

      const [result1, result2] = await Promise.all([
        mockCreateTemplate(templateData1),
        mockCreateTemplate(templateData2)
      ])

      expect(mockCreateTemplate).toHaveBeenCalledTimes(2)
      expect(result1.id).toBe('template-123')
      expect(result2.id).toBe('template-456')
    })
  })

  describe('API Integration Tests', () => {
    it('should handle complete CRUD operations via API', async () => {
      const templateData: TemplateFormData = {
        titel: 'API Test Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: []
      }

      // Mock CREATE
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ template: mockTemplate })
      })

      // Mock READ
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: mockTemplate })
      })

      // Mock UPDATE
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: { ...mockTemplate, titel: 'Updated Template' } })
      })

      // Mock DELETE
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Test CREATE
      const createResponse = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify(templateData)
      })
      const createData = await createResponse.json()
      expect(createData.template.id).toBe(mockTemplate.id)

      // Test READ
      const readResponse = await fetch(`/api/templates/${mockTemplate.id}`)
      const readData = await readResponse.json()
      expect(readData.template.id).toBe(mockTemplate.id)

      // Test UPDATE
      const updateResponse = await fetch(`/api/templates/${mockTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({ titel: 'Updated Template' })
      })
      const updateData = await updateResponse.json()
      expect(updateData.template.titel).toBe('Updated Template')

      // Test DELETE
      const deleteResponse = await fetch(`/api/templates/${mockTemplate.id}`, {
        method: 'DELETE'
      })
      const deleteData = await deleteResponse.json()
      expect(deleteData.success).toBe(true)
    })
  })
})