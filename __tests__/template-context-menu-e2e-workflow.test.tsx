/**
 * End-to-End Template Context Menu Workflow Test
 * 
 * Tests the complete workflow of template context menu operations
 * with robust content parsing and variable extraction.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TemplateContextMenu } from '@/components/template-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import { templateClientService } from '@/lib/template-client-service'
import type { TemplateItem } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/template-client-service')

// Mock the content parser with real implementation behavior
jest.mock('@/lib/template-content-parser', () => ({
  parseTemplateContent: jest.fn((content) => {
    // Simulate real parsing behavior
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content)
        return {
          success: true,
          content: parsed,
          errors: [],
          warnings: [],
          wasRecovered: false
        }
      } catch {
        return {
          success: false,
          content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
          errors: ['Content parsing failed: Invalid JSON'],
          warnings: [],
          wasRecovered: true
        }
      }
    }
    
    if (typeof content === 'object' && content !== null) {
      return {
        success: true,
        content: content,
        errors: [],
        warnings: [],
        wasRecovered: false
      }
    }
    
    return {
      success: false,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
      errors: ['Invalid content type'],
      warnings: [],
      wasRecovered: true
    }
  }),
  
  extractTemplateVariables: jest.fn((content) => {
    // Simulate variable extraction
    const variables = []
    
    function extractFromNode(node) {
      if (node.type === 'mention' && node.attrs?.id) {
        variables.push(node.attrs.id)
      }
      if (node.content) {
        node.content.forEach(extractFromNode)
      }
    }
    
    if (content && content.content) {
      content.content.forEach(extractFromNode)
    }
    
    return {
      variables: [...new Set(variables)],
      errors: [],
      warnings: []
    }
  })
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateClientService = templateClientService as jest.Mocked<typeof templateClientService>

const mockToast = jest.fn()
const mockOpenTemplateEditorModal = jest.fn()

describe('Template Context Menu E2E Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({ toast: mockToast })
    mockUseModalStore.mockReturnValue({
      openTemplateEditorModal: mockOpenTemplateEditorModal,
    } as any)
  })

  const createTemplateWithContent = (content: any): TemplateItem => ({
    id: 'test-template-id',
    name: 'Test Template',
    category: 'Test Category',
    content: content,
    variables: ['tenant_name', 'property_address'],
    createdAt: new Date(),
    updatedAt: new Date(),
    size: 1024,
    type: 'template'
  })

  describe('Complete Edit Workflow', () => {
    it('should handle complete edit workflow with valid JSON string content', async () => {
      const jsonContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Dear ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: ', your property at ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Immobilien Adresse' } },
              { type: 'text', text: ' requires attention.' }
            ]
          }
        ]
      })

      const template = createTemplateWithContent(jsonContent)
      const mockOnTemplateUpdated = jest.fn()

      mockTemplateClientService.updateTemplate.mockResolvedValue({
        id: 'test-template-id',
        titel: 'Updated Template',
        inhalt: JSON.parse(jsonContent),
        kategorie: 'Updated Category',
        kontext_anforderungen: ['tenant_name', 'property_address'],
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        aktualisiert_am: new Date().toISOString()
      })

      render(
        <TemplateContextMenu 
          template={template}
          onTemplateUpdated={mockOnTemplateUpdated}
        >
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith({
          templateId: 'test-template-id',
          initialTitle: 'Test Template',
          initialContent: JSON.parse(jsonContent),
          initialCategory: 'Test Category',
          isNewTemplate: false,
          onSave: expect.any(Function),
          onCancel: expect.any(Function)
        })
      })

      // Simulate saving
      const onSaveCallback = mockOpenTemplateEditorModal.mock.calls[0][0].onSave
      await onSaveCallback({
        titel: 'Updated Template',
        inhalt: JSON.parse(jsonContent),
        kategorie: 'Updated Category',
        kontext_anforderungen: ['tenant_name', 'property_address']
      })

      await waitFor(() => {
        expect(mockTemplateClientService.updateTemplate).toHaveBeenCalledWith(
          'test-template-id',
          {
            titel: 'Updated Template',
            inhalt: JSON.parse(jsonContent),
            kategorie: 'Updated Category'
          }
        )
        expect(mockToast).toHaveBeenCalledWith({
          title: "Vorlage aktualisiert",
          description: '"Updated Template" wurde erfolgreich aktualisiert.',
        })
        expect(mockOnTemplateUpdated).toHaveBeenCalled()
      })
    })

    it('should handle complete edit workflow with object content', async () => {
      const objectContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Property Notice' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Tenant: ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } }
            ]
          }
        ]
      }

      const template = createTemplateWithContent(objectContent)

      render(
        <TemplateContextMenu template={template}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Open context menu and edit
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: objectContent
          })
        )
      })

      // No error toasts should be shown for valid content
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive"
        })
      )
    })
  })

  describe('Complete Duplicate Workflow', () => {
    it('should handle complete duplicate workflow with variable extraction', async () => {
      const templateContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: ', regarding ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Immobilien Adresse' } }
            ]
          }
        ]
      }

      const template = createTemplateWithContent(templateContent)
      const mockOnTemplateUpdated = jest.fn()

      mockTemplateClientService.createTemplate.mockResolvedValue({
        id: 'new-template-id',
        titel: 'Test Template (Copy)',
        inhalt: templateContent,
        kategorie: 'Test Category',
        kontext_anforderungen: ['tenant_name', 'property_address'],
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        aktualisiert_am: null
      })

      render(
        <TemplateContextMenu 
          template={template}
          onTemplateUpdated={mockOnTemplateUpdated}
        >
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Open context menu and duplicate
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      const duplicateOption = screen.getByText('Duplizieren')
      fireEvent.click(duplicateOption)

      await waitFor(() => {
        expect(mockTemplateClientService.createTemplate).toHaveBeenCalledWith({
          titel: 'Test Template (Copy)',
          inhalt: templateContent,
          kategorie: 'Test Category',
          kontext_anforderungen: ['tenant_name', 'property_address']
        })
        expect(mockToast).toHaveBeenCalledWith({
          title: "Vorlage dupliziert",
          description: '"Test Template (Copy)" wurde erfolgreich erstellt.',
        })
        expect(mockOnTemplateUpdated).toHaveBeenCalled()
      })
    })
  })

  describe('Error Recovery Workflows', () => {
    it('should recover from malformed JSON content during edit', async () => {
      const malformedJson = '{"type": "doc", "content": [{"type": "paragraph",}]}'
      const template = createTemplateWithContent(malformedJson)

      render(
        <TemplateContextMenu template={template}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Open context menu and edit
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        // Should show error toast for parsing failure
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Laden der Vorlage",
          description: "Der Inhalt der Vorlage konnte nicht geladen werden. Die Vorlage wird mit leerem Inhalt geöffnet.",
          variant: "destructive"
        })

        // Should still open editor with fallback content
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
          })
        )
      })
    })

    it('should handle duplication failure gracefully', async () => {
      const invalidContent = null
      const template = createTemplateWithContent(invalidContent)

      render(
        <TemplateContextMenu template={template}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Open context menu and duplicate
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      const duplicateOption = screen.getByText('Duplizieren')
      fireEvent.click(duplicateOption)

      await waitFor(() => {
        // Should show error toast
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Duplizieren",
          description: "Der Inhalt der Vorlage konnte nicht gelesen werden.",
          variant: "destructive"
        })

        // Should not attempt to create template
        expect(mockTemplateClientService.createTemplate).not.toHaveBeenCalled()
      })
    })
  })

  describe('Variable Extraction Accuracy', () => {
    it('should extract variables correctly from complex content', async () => {
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
              { type: 'text', text: 'Notice for ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Property: ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Immobilien Adresse' } }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Rent amount: ' },
              { type: 'mention', attrs: { id: 'rent_amount', label: 'Miete' } }
            ]
          }
        ]
      }

      const template = createTemplateWithContent(complexContent)

      mockTemplateClientService.createTemplate.mockResolvedValue({
        id: 'new-template-id',
        titel: 'Test Template (Copy)',
        inhalt: complexContent,
        kategorie: 'Test Category',
        kontext_anforderungen: ['tenant_name', 'property_address', 'rent_amount'],
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        aktualisiert_am: null
      })

      render(
        <TemplateContextMenu template={template}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Duplicate to test variable extraction
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      const duplicateOption = screen.getByText('Duplizieren')
      fireEvent.click(duplicateOption)

      await waitFor(() => {
        expect(mockTemplateClientService.createTemplate).toHaveBeenCalledWith({
          titel: 'Test Template (Copy)',
          inhalt: complexContent,
          kategorie: 'Test Category',
          kontext_anforderungen: ['tenant_name', 'property_address', 'rent_amount']
        })
      })
    })
  })
})