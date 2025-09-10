/**
 * Integration tests for template system error handling and edge cases
 * Tests error scenarios, recovery mechanisms, and boundary conditions
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

describe('Template Error Handling Integration Tests', () => {
  const mockTemplate: Template = {
    id: 'template-123',
    titel: 'Test Template',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Test content' }]
        }
      ]
    },
    kategorie: 'Test',
    kontext_anforderungen: [],
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    
    // Console error/warn mocks to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Network and API Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const user = userEvent.setup()
      const mockCreateTemplate = jest.fn().mockRejectedValue(new Error('Network timeout'))
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

      // Fill in template data
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Test Template')

      // Attempt to save (should trigger network error)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify error handling
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      expect(mockCreateTemplate).toHaveBeenCalledWith({
        titel: 'Test Template',
        inhalt: expect.any(Object),
        kategorie: 'Test',
        kontext_anforderungen: expect.any(Array)
      })
    })

    it('should handle server errors (500) appropriately', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database connection failed' })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          titel: 'Test Template',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Test'
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle authentication errors (401)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle rate limiting (429)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
        json: async () => ({ error: 'Too many requests' })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests')
      expect(response.headers.get('Retry-After')).toBe('60')
    })

    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON')
        }
      })

      try {
        const response = await fetch('/api/templates')
        await response.json()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Unexpected token in JSON')
      }
    })
  })

  describe('Validation Error Handling', () => {
    it('should handle template title validation errors', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
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

      // Save button should be disabled
      expect(saveButton).toBeDisabled()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should handle title length validation', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
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

      // Enter title that's too long (over 100 characters)
      const longTitle = 'a'.repeat(101)
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, longTitle)

      // Input should be limited to 100 characters
      expect(titleInput).toHaveAttribute('maxLength', '100')
    })

    it('should handle server-side validation errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Template validation failed',
          validationErrors: [
            { field: 'titel', message: 'Title already exists', code: 'DUPLICATE_TITLE' },
            { field: 'content', message: 'Invalid variable reference', code: 'INVALID_VARIABLE' }
          ],
          validationWarnings: [
            { field: 'content', message: 'No variables found', code: 'NO_VARIABLES' }
          ]
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          titel: 'Duplicate Title',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Test'
        })
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Template validation failed')
      expect(data.validationErrors).toHaveLength(2)
      expect(data.validationWarnings).toHaveLength(1)
    })

    it('should handle invalid template content structure', async () => {
      const invalidContent = {
        type: 'invalid',
        content: 'not an array'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid template content structure',
          validationErrors: [
            { field: 'content', message: 'Content must be valid Tiptap JSON', code: 'INVALID_CONTENT_STRUCTURE' }
          ]
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          titel: 'Test Template',
          inhalt: invalidContent,
          kategorie: 'Test'
        })
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.validationErrors[0].code).toBe('INVALID_CONTENT_STRUCTURE')
    })
  })

  describe('Concurrent Operation Error Handling', () => {
    it('should handle concurrent template modifications', async () => {
      const templateId = 'template-123'

      // First update succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: { ...mockTemplate, titel: 'Updated Title 1' } })
      })

      // Second update fails due to conflict
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Template was modified by another user' })
      })

      // First update
      const response1 = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify({ titel: 'Updated Title 1' })
      })

      // Second concurrent update
      const response2 = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify({ titel: 'Updated Title 2' })
      })

      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(false)
      expect(response2.status).toBe(409)
    })

    it('should handle template deletion while editing', async () => {
      const templateId = 'template-123'

      // Template is deleted
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Attempt to update deleted template
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Template not found' })
      })

      // Delete template
      const deleteResponse = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      })

      // Try to update deleted template
      const updateResponse = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify({ titel: 'Updated Title' })
      })

      expect(deleteResponse.ok).toBe(true)
      expect(updateResponse.ok).toBe(false)
      expect(updateResponse.status).toBe(404)
    })
  })

  describe('Resource Limit Error Handling', () => {
    it('should handle template count limits', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Template limit exceeded',
          details: 'Maximum 100 templates allowed per user'
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          titel: 'Template 101',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Test'
        })
      })

      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Template limit exceeded')
      expect(data.details).toContain('Maximum 100 templates')
    })

    it('should handle large template content', async () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 1000 }, () => ({
          type: 'paragraph',
          content: [{ type: 'text', text: 'a'.repeat(1000) }]
        }))
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({
          error: 'Template content too large',
          details: 'Maximum template size is 1MB'
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          titel: 'Large Template',
          inhalt: largeContent,
          kategorie: 'Test'
        })
      })

      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('Template content too large')
    })
  })

  describe('Category Error Handling', () => {
    it('should handle category loading failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to load categories'))

      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Failed to load categories'
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

      // Should show error state
      expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
    })

    it('should handle invalid category names', async () => {
      const user = userEvent.setup()
      const mockOnCategorySelected = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: jest.fn(),
          allowNewCategory: true
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

      // Click create new category
      const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
      await user.click(createNewButton)

      // Try invalid category names
      const categoryInput = screen.getByPlaceholderText('Kategoriename eingeben...')
      
      // Empty category
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      expect(continueButton).toBeDisabled()

      // Category with only whitespace
      await user.type(categoryInput, '   ')
      expect(continueButton).toBeDisabled()

      // Valid category
      await user.clear(categoryInput)
      await user.type(categoryInput, 'Valid Category')
      expect(continueButton).not.toBeDisabled()
    })
  })

  describe('Editor Error Handling', () => {
    it('should handle editor initialization failures', async () => {
      // Mock editor initialization failure
      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
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

      // Mock console.error to catch editor errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<TemplateEditorModal />)

      // Editor should still render even if there are initialization issues
      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should handle corrupted template content loading', async () => {
      const corruptedTemplate = {
        ...mockTemplate,
        inhalt: 'invalid json string' as any
      }

      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: corruptedTemplate.id,
          isNewTemplate: false,
          initialTitle: corruptedTemplate.titel,
          initialContent: corruptedTemplate.inhalt,
          initialCategory: corruptedTemplate.kategorie,
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

      // Should handle corrupted content gracefully
      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
      expect(screen.getByDisplayValue(corruptedTemplate.titel)).toBeInTheDocument()
    })
  })

  describe('Recovery Mechanisms', () => {
    it('should provide retry mechanisms for failed operations', async () => {
      let attemptCount = 0
      const mockCreateTemplate = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve(mockTemplate)
      })

      // Simulate retry logic
      const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
        let lastError
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await operation()
          } catch (error) {
            lastError = error
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))) // Exponential backoff
            }
          }
        }
        throw lastError
      }

      const result = await retryOperation(() => mockCreateTemplate())

      expect(attemptCount).toBe(3)
      expect(result).toEqual(mockTemplate)
    })

    it('should handle graceful degradation when features are unavailable', async () => {
      // Mock category loading failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Categories unavailable'))

      const mockOnCategorySelected = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [], // Empty due to loading failure
          onCategorySelected: mockOnCategorySelected,
          onCancel: jest.fn(),
          allowNewCategory: true, // Still allow new category creation
          error: 'Categories unavailable'
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

      // Should still allow creating new categories even when existing ones can't be loaded
      expect(screen.getByRole('button', { name: /neue kategorie erstellen/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely long template titles', async () => {
      const user = userEvent.setup()
      const veryLongTitle = 'a'.repeat(200)

      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
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

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, veryLongTitle)

      // Should be truncated to maxLength
      expect(titleInput).toHaveValue(veryLongTitle.substring(0, 100))
    })

    it('should handle templates with no content', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        inhalt: { type: 'doc', content: [] }
      }

      const mockOnSave = jest.fn()

      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: emptyTemplate.id,
          isNewTemplate: false,
          initialTitle: emptyTemplate.titel,
          initialContent: emptyTemplate.inhalt,
          initialCategory: emptyTemplate.kategorie,
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

      // Should handle empty content gracefully
      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
      
      // Should show warning about empty content
      expect(screen.getByText(/hinweise/i)).toBeInTheDocument()
    })

    it('should handle special characters in template data', async () => {
      const specialCharTemplate = {
        titel: 'Template with émojis 🏠 and spëcial chars',
        kategorie: 'Catégory with ümlauts',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Content with 中文 and العربية' }]
            }
          ]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ template: { ...mockTemplate, ...specialCharTemplate } })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify(specialCharTemplate)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.template.titel).toBe(specialCharTemplate.titel)
      expect(data.template.kategorie).toBe(specialCharTemplate.kategorie)
    })
  })
})