/**
 * Template Context Menu Content Handling Tests
 * 
 * Tests the improved content parsing and variable extraction functionality
 * in the template context menu component.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TemplateContextMenu } from '@/components/template-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import { templateClientService } from '@/lib/template-client-service'
import { parseTemplateContent, extractTemplateVariables } from '@/lib/template-content-parser'
import type { TemplateItem } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/template-client-service')
jest.mock('@/lib/template-content-parser')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateClientService = templateClientService as jest.Mocked<typeof templateClientService>
const mockParseTemplateContent = parseTemplateContent as jest.MockedFunction<typeof parseTemplateContent>
const mockExtractTemplateVariables = extractTemplateVariables as jest.MockedFunction<typeof extractTemplateVariables>

const mockToast = jest.fn()
const mockOpenTemplateEditorModal = jest.fn()

describe('Template Context Menu Content Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({ toast: mockToast })
    mockUseModalStore.mockReturnValue({
      openTemplateEditorModal: mockOpenTemplateEditorModal,
    } as any)
  })

  const createMockTemplate = (content: any): TemplateItem => ({
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

  describe('Edit Template with String Content', () => {
    it('should parse string JSON content correctly', async () => {
      const stringContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: '!' }
            ]
          }
        ]
      })

      const parsedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: '!' }
            ]
          }
        ]
      }

      const mockTemplate = createMockTemplate(stringContent)

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: parsedContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: ['tenant_name'],
        errors: [],
        warnings: []
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(stringContent)
        expect(mockExtractTemplateVariables).toHaveBeenCalledWith(parsedContent)
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith({
          templateId: 'test-template-id',
          initialTitle: 'Test Template',
          initialContent: parsedContent,
          initialCategory: 'Test Category',
          isNewTemplate: false,
          onSave: expect.any(Function),
          onCancel: expect.any(Function)
        })
      })
    })

    it('should handle malformed string content with recovery', async () => {
      const malformedContent = '{"type": "doc", "content": [{"type": "paragraph",}]}'
      const mockTemplate = createMockTemplate(malformedContent)

      const recoveredContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: recoveredContent,
        errors: [],
        warnings: ['JSON was malformed but recovered successfully'],
        wasRecovered: true
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: [],
        errors: [],
        warnings: []
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(malformedContent)
        expect(mockToast).toHaveBeenCalledWith({
          title: "Inhalt wiederhergestellt",
          description: "Der Vorlageninhalt wurde automatisch repariert. Bitte überprüfen Sie den Inhalt.",
          variant: "default"
        })
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: recoveredContent
          })
        )
      })
    })

    it('should handle parsing errors gracefully', async () => {
      const invalidContent = 'completely invalid content'
      const mockTemplate = createMockTemplate(invalidContent)

      const fallbackContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: false,
        content: fallbackContent,
        errors: ['Content parsing failed: Invalid JSON'],
        warnings: [],
        wasRecovered: true
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: [],
        errors: [],
        warnings: []
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(invalidContent)
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Laden der Vorlage",
          description: "Der Inhalt der Vorlage konnte nicht geladen werden. Die Vorlage wird mit leerem Inhalt geöffnet.",
          variant: "destructive"
        })
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: fallbackContent
          })
        )
      })
    })
  })

  describe('Edit Template with Object Content', () => {
    it('should parse object content correctly', async () => {
      const objectContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Property: ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Immobilien Adresse' } }
            ]
          }
        ]
      }

      const mockTemplate = createMockTemplate(objectContent)

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: objectContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: ['property_address'],
        errors: [],
        warnings: []
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(objectContent)
        expect(mockExtractTemplateVariables).toHaveBeenCalledWith(objectContent)
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: objectContent
          })
        )
      })
    })
  })

  describe('Duplicate Template with Content Parsing', () => {
    it('should parse content and extract variables for duplication', async () => {
      const templateContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Dear ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } },
              { type: 'text', text: ', your rent for ' },
              { type: 'mention', attrs: { id: 'property_address', label: 'Immobilien Adresse' } },
              { type: 'text', text: ' is due.' }
            ]
          }
        ]
      }

      const mockTemplate = createMockTemplate(templateContent)

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: templateContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: ['tenant_name', 'property_address'],
        errors: [],
        warnings: []
      })

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
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click duplicate option
      const duplicateOption = screen.getByText('Duplizieren')
      fireEvent.click(duplicateOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(templateContent)
        expect(mockExtractTemplateVariables).toHaveBeenCalledWith(templateContent)
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
      })
    })

    it('should handle duplication with parsing errors', async () => {
      const invalidContent = 'invalid content'
      const mockTemplate = createMockTemplate(invalidContent)

      mockParseTemplateContent.mockReturnValue({
        success: false,
        content: { type: 'doc', content: [] },
        errors: ['Content parsing failed'],
        warnings: [],
        wasRecovered: true
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click duplicate option
      const duplicateOption = screen.getByText('Duplizieren')
      fireEvent.click(duplicateOption)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(invalidContent)
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Duplizieren",
          description: "Der Inhalt der Vorlage konnte nicht gelesen werden.",
          variant: "destructive"
        })
        expect(mockTemplateClientService.createTemplate).not.toHaveBeenCalled()
      })
    })
  })

  describe('Variable Extraction Error Handling', () => {
    it('should handle variable extraction errors gracefully', async () => {
      const templateContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }

      const mockTemplate = createMockTemplate(templateContent)

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: templateContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: [],
        errors: ['Variable extraction failed'],
        warnings: ['Some variables could not be extracted']
      })

      render(
        <TemplateContextMenu template={mockTemplate}>
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockExtractTemplateVariables).toHaveBeenCalledWith(templateContent)
        expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
          expect.objectContaining({
            initialContent: templateContent
          })
        )
      })

      // Should still open the editor despite variable extraction errors
      expect(mockOpenTemplateEditorModal).toHaveBeenCalled()
    })
  })

  describe('End-to-End Template Editing Workflow', () => {
    it('should complete the full edit workflow with content parsing', async () => {
      const originalContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'tenant_name', label: 'Mieter Name' } }
            ]
          }
        ]
      }

      const mockTemplate = createMockTemplate(originalContent)
      const mockOnTemplateUpdated = jest.fn()

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: originalContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      mockExtractTemplateVariables.mockReturnValue({
        variables: ['tenant_name'],
        errors: [],
        warnings: []
      })

      mockTemplateClientService.updateTemplate.mockResolvedValue({
        id: 'test-template-id',
        titel: 'Updated Template',
        inhalt: originalContent,
        kategorie: 'Updated Category',
        kontext_anforderungen: ['tenant_name'],
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        aktualisiert_am: new Date().toISOString()
      })

      render(
        <TemplateContextMenu 
          template={mockTemplate}
          onTemplateUpdated={mockOnTemplateUpdated}
        >
          <div>Template Item</div>
        </TemplateContextMenu>
      )

      // Right-click to open context menu
      const templateItem = screen.getByText('Template Item')
      fireEvent.contextMenu(templateItem)

      // Click edit option
      const editOption = screen.getByText('Bearbeiten')
      fireEvent.click(editOption)

      await waitFor(() => {
        expect(mockOpenTemplateEditorModal).toHaveBeenCalled()
      })

      // Simulate saving the template
      const onSaveCallback = mockOpenTemplateEditorModal.mock.calls[0][0].onSave
      await onSaveCallback({
        titel: 'Updated Template',
        inhalt: originalContent,
        kategorie: 'Updated Category',
        kontext_anforderungen: ['tenant_name']
      })

      await waitFor(() => {
        expect(mockTemplateClientService.updateTemplate).toHaveBeenCalledWith(
          'test-template-id',
          {
            titel: 'Updated Template',
            inhalt: originalContent,
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
  })
})