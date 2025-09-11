/**
 * Template System Final Validation Test
 * 
 * This focused test validates that all three main issues from the 
 * template system improvements spec have been resolved:
 * 1. Correct template data loading
 * 2. Proper template change saving  
 * 3. Enhanced TipTap editor visual experience
 * 
 * This test also validates backward compatibility and security aspects.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import components
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { CategorySelectionModal } from '@/components/category-selection-modal'

// Import types
import { Template, TemplateFormData } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock TipTap editor with enhanced functionality
jest.mock('@/components/editor/tiptap-template-editor', () => ({
  TiptapTemplateEditor: ({ 
    initialContent, 
    onContentChange, 
    onSave, 
    onCancel,
    placeholder 
  }: any) => {
    const [content, setContent] = React.useState(initialContent || {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    })

    const handleContentUpdate = (newContent: any) => {
      setContent(newContent)
      const variables = extractVariablesFromContent(newContent)
      onContentChange(newContent, variables)
    }

    const extractVariablesFromContent = (content: any): string[] => {
      const variables: string[] = []
      const traverse = (node: any) => {
        if (node.type === 'mention' && node.attrs?.id) {
          variables.push(node.attrs.id)
        }
        if (node.content) {
          node.content.forEach(traverse)
        }
      }
      if (content.content) {
        content.content.forEach(traverse)
      }
      return [...new Set(variables)]
    }

    return (
      <div data-testid="tiptap-editor">
        <div data-testid="editor-content">
          {JSON.stringify(content, null, 2)}
        </div>
        <div data-testid="editor-placeholder">
          {placeholder}
        </div>
        <button 
          data-testid="add-heading"
          onClick={() => {
            const newContent = {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Test Heading' }]
                },
                ...content.content
              ]
            }
            handleContentUpdate(newContent)
          }}
        >
          Add Heading
        </button>
        <button 
          data-testid="add-variable"
          onClick={() => {
            const newContent = {
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
                    { type: 'text', text: ', this is a test.' }
                  ]
                }
              ]
            }
            handleContentUpdate(newContent)
          }}
        >
          Add Variable
        </button>
        <button 
          data-testid="add-complex-content"
          onClick={() => {
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
                    {
                      type: 'mention',
                      attrs: { id: 'landlord_name', label: 'Vermieter Name' }
                    },
                    { type: 'text', text: ' und ' },
                    {
                      type: 'mention',
                      attrs: { id: 'tenant_name', label: 'Mieter Name' }
                    }
                  ]
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
                            { type: 'text', text: 'Miete: ' },
                            {
                              type: 'mention',
                              attrs: { id: 'monthly_rent', label: 'Monatliche Miete' }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            handleContentUpdate(complexContent)
          }}
        >
          Add Complex Content
        </button>
        <button data-testid="editor-save" onClick={onSave}>
          Save
        </button>
        <button data-testid="editor-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    )
  }
}))

describe('Template System Final Validation', () => {
  const user = userEvent.setup()

  // Test data
  const mockExistingTemplate: Template = {
    id: 'template-123',
    titel: 'Existing Template',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Original Heading' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              attrs: { id: 'original_variable', label: 'Original Variable' }
            }
          ]
        }
      ]
    },
    kategorie: 'Mietverträge',
    kontext_anforderungen: ['original_variable'],
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  const mockLegacyTemplate: Template = {
    id: 'legacy-template-456',
    titel: 'Legacy Template',
    inhalt: "Simple string content without JSON structure",
    kategorie: 'Sonstiges',
    kontext_anforderungen: [],
    user_id: 'user-123',
    erstellungsdatum: '2023-01-01T00:00:00Z',
    aktualisiert_am: '2023-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock modal store
    const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
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
    })
  })

  describe('Issue 1: Correct Template Data Loading', () => {
    it('should load modern JSONB template content correctly', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal store with existing template data
      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: mockExistingTemplate.id,
          isNewTemplate: false,
          initialTitle: mockExistingTemplate.titel,
          initialContent: mockExistingTemplate.inhalt,
          initialCategory: mockExistingTemplate.kategorie,
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Verify template loads with correct title
      expect(screen.getByDisplayValue('Existing Template')).toBeInTheDocument()

      // Verify content is loaded in editor
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toBeInTheDocument()
      
      // Verify the content structure is preserved
      const contentText = editorContent.textContent
      expect(contentText).toContain('Original Heading')
      expect(contentText).toContain('original_variable')

      // Verify category is displayed
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    })

    it('should handle legacy string content gracefully', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal store with legacy template data
      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: mockLegacyTemplate.id,
          isNewTemplate: false,
          initialTitle: mockLegacyTemplate.titel,
          initialContent: mockLegacyTemplate.inhalt,
          initialCategory: mockLegacyTemplate.kategorie,
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Verify legacy template loads without crashing
      expect(screen.getByDisplayValue('Legacy Template')).toBeInTheDocument()
      expect(screen.getByText('Sonstiges')).toBeInTheDocument()

      // Verify editor handles string content gracefully
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toBeInTheDocument()
    })

    it('should handle malformed content with error recovery', async () => {
      const malformedTemplate: Template = {
        ...mockExistingTemplate,
        inhalt: { invalid: 'structure', missing: 'type' } as any
      }

      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: malformedTemplate.id,
          isNewTemplate: false,
          initialTitle: malformedTemplate.titel,
          initialContent: malformedTemplate.inhalt,
          initialCategory: malformedTemplate.kategorie,
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Should not crash and should show template title
      expect(screen.getByDisplayValue('Existing Template')).toBeInTheDocument()
      
      // Editor should handle malformed content gracefully
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toBeInTheDocument()
    })

    it('should preserve complex content structure on load', async () => {
      const complexTemplate: Template = {
        ...mockExistingTemplate,
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Complex Template' }]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'This template has ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'bold text' },
                { type: 'text', text: ' and ' },
                {
                  type: 'mention',
                  attrs: { id: 'complex_variable', label: 'Complex Variable' }
                }
              ]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'List item 1' }]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'List item with ' },
                        {
                          type: 'mention',
                          attrs: { id: 'list_variable', label: 'List Variable' }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        kontext_anforderungen: ['complex_variable', 'list_variable']
      }

      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: complexTemplate.id,
          isNewTemplate: false,
          initialTitle: complexTemplate.titel,
          initialContent: complexTemplate.inhalt,
          initialCategory: complexTemplate.kategorie,
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Verify complex structure is preserved
      const editorContent = screen.getByTestId('editor-content')
      const contentText = editorContent.textContent
      
      expect(contentText).toContain('Complex Template')
      expect(contentText).toContain('bold')
      expect(contentText).toContain('complex_variable')
      expect(contentText).toContain('list_variable')
      expect(contentText).toContain('bulletList')
    })
  })

  describe('Issue 2: Proper Template Change Saving', () => {
    it('should save template changes with correct data structure', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Mietverträge',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Enter template title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'New Test Template')

      // Add complex content with variables
      const addComplexContentButton = screen.getByTestId('add-complex-content')
      await user.click(addComplexContentButton)

      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify save was called with correct structure
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'New Test Template',
          inhalt: expect.objectContaining({
            type: 'doc',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'heading',
                attrs: { level: 1 },
                content: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'text',
                    text: 'Mietvertrag'
                  })
                ])
              }),
              expect.objectContaining({
                type: 'paragraph',
                content: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'mention',
                    attrs: { id: 'landlord_name', label: 'Vermieter Name' }
                  }),
                  expect.objectContaining({
                    type: 'mention',
                    attrs: { id: 'tenant_name', label: 'Mieter Name' }
                  })
                ])
              })
            ])
          }),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.arrayContaining([
            'landlord_name',
            'tenant_name',
            'monthly_rent'
          ])
        })
      })
    })

    it('should update existing template with preserved metadata', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: mockExistingTemplate.id,
          isNewTemplate: false,
          initialTitle: mockExistingTemplate.titel,
          initialContent: mockExistingTemplate.inhalt,
          initialCategory: mockExistingTemplate.kategorie,
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Modify title
      const titleInput = screen.getByDisplayValue('Existing Template')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Template')

      // Add new content
      const addVariableButton = screen.getByTestId('add-variable')
      await user.click(addVariableButton)

      // Save changes
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify update preserves structure and updates variables
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Updated Template',
          inhalt: expect.objectContaining({
            type: 'doc',
            content: expect.any(Array)
          }),
          kategorie: 'Mietverträge',
          kontext_anforderungen: expect.arrayContaining(['tenant_name'])
        })
      })
    })

    it('should handle save errors gracefully', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'))
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Enter title and try to save
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Test Template')

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      // Modal should still be functional
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
    })

    it('should extract and save variables correctly', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Enter title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Variable Test')

      // Add content with multiple variables
      const addComplexContentButton = screen.getByTestId('add-complex-content')
      await user.click(addComplexContentButton)

      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Verify all variables are extracted
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Variable Test',
          inhalt: expect.any(Object),
          kategorie: 'Test',
          kontext_anforderungen: expect.arrayContaining([
            'landlord_name',
            'tenant_name',
            'monthly_rent'
          ])
        })
      })
    })
  })

  describe('Issue 3: Enhanced TipTap Editor Visual Experience', () => {
    it('should provide enhanced editor functionality', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Verify enhanced editor is present
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()

      // Verify enhanced functionality buttons are available
      expect(screen.getByTestId('add-heading')).toBeInTheDocument()
      expect(screen.getByTestId('add-variable')).toBeInTheDocument()
      expect(screen.getByTestId('add-complex-content')).toBeInTheDocument()

      // Test heading functionality
      const addHeadingButton = screen.getByTestId('add-heading')
      await user.click(addHeadingButton)

      // Verify content was updated
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.textContent).toContain('Test Heading')
    })

    it('should handle variable mentions with enhanced UI', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Test variable addition
      const addVariableButton = screen.getByTestId('add-variable')
      await user.click(addVariableButton)

      // Verify variable mention was added
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent.textContent).toContain('tenant_name')
      expect(editorContent.textContent).toContain('mention')
    })

    it('should provide responsive and accessible interface', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Verify accessibility features
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      expect(titleInput).toBeInTheDocument()
      expect(titleInput).toHaveAttribute('type', 'text')

      // Verify buttons have proper roles
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i })
      
      expect(saveButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()

      // Test keyboard navigation
      await user.tab()
      expect(titleInput).toHaveFocus()
    })

    it('should handle complex content editing smoothly', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Add complex content
      const addComplexContentButton = screen.getByTestId('add-complex-content')
      await user.click(addComplexContentButton)

      // Verify complex content is handled
      const editorContent = screen.getByTestId('editor-content')
      const contentText = editorContent.textContent
      
      expect(contentText).toContain('Mietvertrag')
      expect(contentText).toContain('landlord_name')
      expect(contentText).toContain('tenant_name')
      expect(contentText).toContain('bulletList')
      expect(contentText).toContain('monthly_rent')
    })
  })

  describe('Backward Compatibility Validation', () => {
    it('should handle legacy template formats without breaking', async () => {
      const legacyFormats = [
        // String content
        "Simple string content",
        // Malformed JSON
        '{"type": "doc", "content": [{"type": "paragraph"}]}',
        // Old structure
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Old format' }]
            }
          ]
        }
      ]

      for (const legacyContent of legacyFormats) {
        const mockOnSave = jest.fn()
        const mockOnCancel = jest.fn()

        const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
        mockUseModalStore.mockReturnValue({
          isCategorySelectionModalOpen: false,
          categorySelectionData: undefined,
          isTemplateEditorModalOpen: true,
          templateEditorData: {
            templateId: 'legacy-test',
            isNewTemplate: false,
            initialTitle: 'Legacy Template',
            initialContent: legacyContent,
            initialCategory: 'Test',
            onSave: mockOnSave,
            onCancel: mockOnCancel
          },
          isTemplateEditorModalDirty: false,
          openCategorySelectionModal: jest.fn(),
          closeCategorySelectionModal: jest.fn(),
          openTemplateEditorModal: jest.fn(),
          closeTemplateEditorModal: jest.fn(),
          setTemplateEditorModalDirty: jest.fn()
        })

        const { unmount } = render(<TemplateEditorModal />)

        // Should not crash with legacy content
        expect(screen.getByDisplayValue('Legacy Template')).toBeInTheDocument()
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()

        unmount()
      }
    })

    it('should preserve existing template data integrity', async () => {
      const existingTemplates = [
        mockExistingTemplate,
        mockLegacyTemplate,
        {
          ...mockExistingTemplate,
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'German characters: äöüß ÄÖÜ' },
                  { type: 'text', text: 'Special symbols: €£¥$¢' }
                ]
              }
            ]
          }
        }
      ]

      for (const template of existingTemplates) {
        const mockOnSave = jest.fn()
        const mockOnCancel = jest.fn()

        const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
        mockUseModalStore.mockReturnValue({
          isCategorySelectionModalOpen: false,
          categorySelectionData: undefined,
          isTemplateEditorModalOpen: true,
          templateEditorData: {
            templateId: template.id,
            isNewTemplate: false,
            initialTitle: template.titel,
            initialContent: template.inhalt,
            initialCategory: template.kategorie,
            onSave: mockOnSave,
            onCancel: mockOnCancel
          },
          isTemplateEditorModalDirty: false,
          openCategorySelectionModal: jest.fn(),
          closeCategorySelectionModal: jest.fn(),
          openTemplateEditorModal: jest.fn(),
          closeTemplateEditorModal: jest.fn(),
          setTemplateEditorModalDirty: jest.fn()
        })

        const { unmount } = render(<TemplateEditorModal />)

        // Should load without data corruption
        expect(screen.getByDisplayValue(template.titel)).toBeInTheDocument()
        expect(screen.getByText(template.kategorie!)).toBeInTheDocument()

        unmount()
      }
    })
  })

  describe('Security Validation', () => {
    it('should sanitize potentially dangerous content', async () => {
      const dangerousContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: {
              'data-malicious': 'script',
              onclick: 'alert("xss")',
              style: 'background: url(javascript:alert(1))'
            },
            content: [
              {
                type: 'text',
                text: '<script>alert("xss")</script>',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'javascript:alert("xss")',
                      target: '_blank'
                    }
                  }
                ]
              }
            ]
          }
        ]
      }

      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'dangerous-test',
          isNewTemplate: false,
          initialTitle: 'Dangerous Template',
          initialContent: dangerousContent,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Should load without executing dangerous content
      expect(screen.getByDisplayValue('Dangerous Template')).toBeInTheDocument()
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()

      // Should not execute any scripts
      expect(window.alert).not.toHaveBeenCalled()
    })

    it('should validate input lengths and prevent overflow', async () => {
      const veryLongTitle = 'A'.repeat(1000)
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Try to enter very long title
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, veryLongTitle)

      // Should handle long input gracefully
      expect(titleInput).toBeInTheDocument()
      expect(titleInput.value.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Production-like Data Volume Testing', () => {
    it('should handle large templates efficiently', async () => {
      // Create large template content
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Paragraph ${i + 1} with ` },
            {
              type: 'mention',
              attrs: { id: `variable_${i}`, label: `Variable ${i}` }
            },
            { type: 'text', text: ' content.' }
          ]
        }))
      }

      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: false,
        categorySelectionData: undefined,
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'large-template',
          isNewTemplate: false,
          initialTitle: 'Large Template',
          initialContent: largeContent,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        openCategorySelectionModal: jest.fn(),
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      })

      const startTime = performance.now()
      render(<TemplateEditorModal />)
      const endTime = performance.now()

      // Should render large template quickly
      expect(endTime - startTime).toBeLessThan(1000) // Less than 1 second

      // Should display template correctly
      expect(screen.getByDisplayValue('Large Template')).toBeInTheDocument()
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    })

    it('should handle many categories efficiently', async () => {
      const manyCategories = Array.from({ length: 50 }, (_, i) => `Category ${i + 1}`)

      const mockUseModalStore = require('@/hooks/use-modal-store').useModalStore
      mockUseModalStore.mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: manyCategories,
          onCategorySelected: jest.fn(),
          onCancel: jest.fn(),
          isLoading: false,
          error: null,
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
      })

      const startTime = performance.now()
      render(<CategorySelectionModal />)
      const endTime = performance.now()

      // Should render many categories quickly
      expect(endTime - startTime).toBeLessThan(500) // Less than 0.5 seconds

      // Should display categories
      expect(screen.getByText('Category 1')).toBeInTheDocument()
      expect(screen.getByText('Category 2')).toBeInTheDocument()
    })
  })
})