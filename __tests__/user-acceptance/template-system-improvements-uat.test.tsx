/**
 * User Acceptance Tests for Template System Improvements
 * 
 * This test suite validates the three main improvement areas:
 * 1. Correct template data loading
 * 2. Proper template change saving
 * 3. Enhanced TipTap editor visual experience
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateService } from '@/lib/template-service'

// Mock dependencies
jest.mock('@/lib/template-service')
jest.mock('@/hooks/use-modal-store')

const mockTemplateService = templateService as jest.Mocked<typeof templateService>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Test data representing real user scenarios
const mockTemplateWithComplexContent = {
  id: 'test-template-1',
  titel: 'Mietvertrag Vorlage',
  kategorie: 'Verträge',
  inhalt: {
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
          { type: 'text', text: 'Zwischen dem Vermieter und ' },
          {
            type: 'mention',
            attrs: { id: 'tenant_name', label: 'Mieter Name' }
          },
          { type: 'text', text: ' wird folgender Mietvertrag geschlossen:' }
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
                  { type: 'text', text: 'Mietobjekt: ' },
                  {
                    type: 'mention',
                    attrs: { id: 'property_address', label: 'Immobilien Adresse' }
                  }
                ]
              }
            ]
          },
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
                  },
                  { type: 'text', text: ' EUR' }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  kontext_anforderungen: ['tenant_name', 'property_address', 'monthly_rent'],
  user_id: 'test-user',
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-15T10:30:00Z'
}

const mockTemplateWithStringContent = {
  id: 'test-template-2',
  titel: 'Kündigung Vorlage',
  kategorie: 'Kündigungen',
  inhalt: JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hiermit kündige ich das Mietverhältnis für ' },
          {
            type: 'mention',
            attrs: { id: 'tenant_name', label: 'Mieter Name' }
          }
        ]
      }
    ]
  }),
  kontext_anforderungen: ['tenant_name'],
  user_id: 'test-user',
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: null
}

describe('Template System Improvements - User Acceptance Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  
  beforeEach(() => {
    user = userEvent.setup()
    
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup default modal store mock
    mockUseModalStore.mockReturnValue({
      templateEditorModal: {
        isOpen: true,
        templateId: 'test-template-1',
        mode: 'edit'
      },
      closeTemplateEditorModal: jest.fn(),
      openTemplateEditorModal: jest.fn()
    })
  })

  describe('UAT 1: Template Data Loading', () => {
    test('UAT-1.1: User opens existing template with complex JSONB content', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Template content loads correctly
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      })
      
      // Verify rich text formatting is preserved
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag')).toBeInTheDocument()
        expect(screen.getByText('Zwischen dem Vermieter und')).toBeInTheDocument()
      })
      
      // Verify variables/mentions are displayed correctly
      await waitFor(() => {
        expect(screen.getByText('Mieter Name')).toBeInTheDocument()
        expect(screen.getByText('Immobilien Adresse')).toBeInTheDocument()
        expect(screen.getByText('Monatliche Miete')).toBeInTheDocument()
      })
      
      // Verify content structure is maintained (headings, lists)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Mietvertrag')
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
    })

    test('UAT-1.2: User opens template with string-formatted JSONB content', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithStringContent)
      mockUseModalStore.mockReturnValue({
        templateEditorModal: {
          isOpen: true,
          templateId: 'test-template-2',
          mode: 'edit'
        },
        closeTemplateEditorModal: jest.fn(),
        openTemplateEditorModal: jest.fn()
      })
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - String content is properly parsed and displayed
      await waitFor(() => {
        expect(screen.getByDisplayValue('Kündigung Vorlage')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Hiermit kündige ich das Mietverhältnis für')).toBeInTheDocument()
        expect(screen.getByText('Mieter Name')).toBeInTheDocument()
      })
    })

    test('UAT-1.3: User encounters template with malformed content', async () => {
      // Arrange
      const malformedTemplate = {
        ...mockTemplateWithComplexContent,
        inhalt: 'invalid json content'
      }
      mockTemplateService.getTemplate.mockResolvedValue(malformedTemplate)
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Error is handled gracefully with fallback content
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden des Inhalts/)).toBeInTheDocument()
      })
      
      // Verify user can still interact with the editor
      const titleInput = screen.getByDisplayValue('Mietvertrag Vorlage')
      expect(titleInput).toBeInTheDocument()
      expect(titleInput).not.toBeDisabled()
    })

    test('UAT-1.4: User switches between multiple templates', async () => {
      // Arrange
      const { rerender } = render(<TemplateEditorModal />)
      mockTemplateService.getTemplate.mockResolvedValueOnce(mockTemplateWithComplexContent)
      
      // Act - Load first template
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag')).toBeInTheDocument()
      })
      
      // Switch to second template
      mockUseModalStore.mockReturnValue({
        templateEditorModal: {
          isOpen: true,
          templateId: 'test-template-2',
          mode: 'edit'
        },
        closeTemplateEditorModal: jest.fn(),
        openTemplateEditorModal: jest.fn()
      })
      mockTemplateService.getTemplate.mockResolvedValueOnce(mockTemplateWithStringContent)
      
      rerender(<TemplateEditorModal />)
      
      // Assert - Second template content loads independently
      await waitFor(() => {
        expect(screen.getByDisplayValue('Kündigung Vorlage')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Hiermit kündige ich das Mietverhältnis für')).toBeInTheDocument()
      })
      
      // Verify no cross-contamination from first template
      expect(screen.queryByText('Mietvertrag')).not.toBeInTheDocument()
    })
  })

  describe('UAT 2: Template Change Saving', () => {
    test('UAT-2.1: User modifies template content and saves successfully', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      mockTemplateService.updateTemplate.mockResolvedValue({
        success: true,
        template: {
          ...mockTemplateWithComplexContent,
          aktualisiert_am: new Date().toISOString()
        }
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      })
      
      // Act - Modify template title
      const titleInput = screen.getByDisplayValue('Mietvertrag Vorlage')
      await user.clear(titleInput)
      await user.type(titleInput, 'Geänderter Mietvertrag')
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Changes are saved correctly
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
          'test-template-1',
          expect.objectContaining({
            titel: 'Geänderter Mietvertrag'
          })
        )
      })
      
      // Verify success feedback
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich gespeichert/i)).toBeInTheDocument()
      })
    })

    test('UAT-2.2: User adds new variables and they are saved to kontext_anforderungen', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      mockTemplateService.updateTemplate.mockResolvedValue({
        success: true,
        template: mockTemplateWithComplexContent
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      })
      
      // Act - Add new variable mention in editor
      const editor = screen.getByRole('textbox', { name: /template content/i })
      await user.click(editor)
      await user.type(editor, ' @')
      
      // Wait for mention suggestions
      await waitFor(() => {
        expect(screen.getByText('Verfügbare Variablen')).toBeInTheDocument()
      })
      
      // Select a new variable
      const newVariable = screen.getByText('Kaution Betrag')
      await user.click(newVariable)
      
      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - New variable is included in kontext_anforderungen
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
          'test-template-1',
          expect.objectContaining({
            kontext_anforderungen: expect.arrayContaining(['kaution_betrag'])
          })
        )
      })
    })

    test('UAT-2.3: User removes variables and they are removed from kontext_anforderungen', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      mockTemplateService.updateTemplate.mockResolvedValue({
        success: true,
        template: mockTemplateWithComplexContent
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mieter Name')).toBeInTheDocument()
      })
      
      // Act - Remove a variable mention
      const variableMention = screen.getByText('Mieter Name')
      await user.click(variableMention)
      await user.keyboard('{Delete}')
      
      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Variable is removed from kontext_anforderungen
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
          'test-template-1',
          expect.objectContaining({
            kontext_anforderungen: expect.not.arrayContaining(['tenant_name'])
          })
        )
      })
    })

    test('UAT-2.4: User encounters save error and can retry', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      mockTemplateService.updateTemplate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          template: mockTemplateWithComplexContent
        })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      })
      
      // Act - Try to save (will fail first time)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Error message is shown
      await waitFor(() => {
        expect(screen.getByText(/Speichern fehlgeschlagen/i)).toBeInTheDocument()
      })
      
      // Verify retry option is available
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      expect(retryButton).toBeInTheDocument()
      
      // Act - Retry save
      await user.click(retryButton)
      
      // Assert - Second attempt succeeds
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich gespeichert/i)).toBeInTheDocument()
      })
    })
  })

  describe('UAT 3: Enhanced TipTap Editor Visual Experience', () => {
    test('UAT-3.1: User uses enhanced slash command menu', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      })
      
      // Act - Trigger slash command menu
      const editor = screen.getByRole('textbox', { name: /template content/i })
      await user.click(editor)
      await user.type(editor, '/')
      
      // Assert - Enhanced command menu appears with visual improvements
      await waitFor(() => {
        expect(screen.getByText('Verfügbare Befehle')).toBeInTheDocument()
      })
      
      // Verify commands have icons and descriptions
      const headingCommand = screen.getByText('Überschrift 1')
      expect(headingCommand).toBeInTheDocument()
      
      const headingDescription = screen.getByText('Große Abschnittsüberschrift')
      expect(headingDescription).toBeInTheDocument()
      
      // Verify command categories
      expect(screen.getByText('Struktur')).toBeInTheDocument()
      expect(screen.getByText('Listen')).toBeInTheDocument()
      expect(screen.getByText('Variablen')).toBeInTheDocument()
    })

    test('UAT-3.2: User uses enhanced variable mention system', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      })
      
      // Act - Trigger variable mention menu
      const editor = screen.getByRole('textbox', { name: /template content/i })
      await user.click(editor)
      await user.type(editor, '@')
      
      // Assert - Enhanced variable menu appears
      await waitFor(() => {
        expect(screen.getByText('Verfügbare Variablen')).toBeInTheDocument()
      })
      
      // Verify variables are categorized
      expect(screen.getByText('Mieter')).toBeInTheDocument()
      expect(screen.getByText('Immobilie')).toBeInTheDocument()
      expect(screen.getByText('Finanzen')).toBeInTheDocument()
      
      // Verify variables have descriptions and examples
      const tenantNameVar = screen.getByText('Mieter Name')
      expect(tenantNameVar).toBeInTheDocument()
      
      // Hover to see tooltip
      await user.hover(tenantNameVar)
      await waitFor(() => {
        expect(screen.getByText('Vollständiger Name des Mieters')).toBeInTheDocument()
        expect(screen.getByText('Beispiel: Max Mustermann')).toBeInTheDocument()
      })
    })

    test('UAT-3.3: User uses floating bubble menu for text selection', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Zwischen dem Vermieter und')).toBeInTheDocument()
      })
      
      // Act - Select text to trigger bubble menu
      const textElement = screen.getByText('Zwischen dem Vermieter und')
      
      // Simulate text selection
      await user.pointer([
        { target: textElement, offset: 0 },
        { target: textElement, offset: 10 }
      ])
      
      // Assert - Bubble menu appears with formatting options
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fett/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /kursiv/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /variable einfügen/i })).toBeInTheDocument()
      })
      
      // Test formatting action
      const boldButton = screen.getByRole('button', { name: /fett/i })
      await user.click(boldButton)
      
      // Verify text is formatted
      await waitFor(() => {
        const boldText = screen.getByText('Zwischen de')
        expect(boldText).toHaveStyle('font-weight: bold')
      })
    })

    test('UAT-3.4: User uses enhanced toolbar', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      })
      
      // Assert - Toolbar is visible with all formatting options
      expect(screen.getByRole('button', { name: /fett/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /kursiv/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unterstrichen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /aufzählung/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /nummerierte liste/i })).toBeInTheDocument()
      
      // Verify keyboard shortcuts are displayed
      const boldButton = screen.getByRole('button', { name: /fett/i })
      await user.hover(boldButton)
      
      await waitFor(() => {
        expect(screen.getByText('Strg+B')).toBeInTheDocument()
      })
      
      // Test toolbar responsiveness on smaller screens
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      window.dispatchEvent(new Event('resize'))
      
      // Verify toolbar adapts to smaller screen
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mehr optionen/i })).toBeInTheDocument()
      })
    })
  })

  describe('UAT 4: Performance and User Experience', () => {
    test('UAT-4.1: Editor loads within acceptable time limits', async () => {
      // Arrange
      const startTime = performance.now()
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Editor loads within 2 seconds
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(2000)
    })

    test('UAT-4.2: User receives appropriate loading states and feedback', async () => {
      // Arrange
      let resolveTemplate: (value: any) => void
      const templatePromise = new Promise(resolve => {
        resolveTemplate = resolve
      })
      mockTemplateService.getTemplate.mockReturnValue(templatePromise)
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Loading state is shown
      expect(screen.getByText(/Vorlage wird geladen/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Resolve the promise
      act(() => {
        resolveTemplate!(mockTemplateWithComplexContent)
      })
      
      // Verify loading state disappears
      await waitFor(() => {
        expect(screen.queryByText(/Vorlage wird geladen/i)).not.toBeInTheDocument()
      })
    })

    test('UAT-4.3: User experiences smooth interactions without lag', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      })
      
      // Act - Test responsive typing
      const editor = screen.getByRole('textbox', { name: /template content/i })
      const startTime = performance.now()
      
      await user.click(editor)
      await user.type(editor, 'Test typing responsiveness')
      
      const typingTime = performance.now() - startTime
      
      // Assert - Typing is responsive (under 200ms per character on average)
      const averageTimePerChar = typingTime / 'Test typing responsiveness'.length
      expect(averageTimePerChar).toBeLessThan(200)
      
      // Verify text appears immediately
      expect(screen.getByText('Test typing responsiveness')).toBeInTheDocument()
    })
  })

  describe('UAT 5: Error Handling and Recovery', () => {
    test('UAT-5.1: User encounters network error and can recover', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Network error'))
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Error is handled gracefully
      await waitFor(() => {
        expect(screen.getByText(/Vorlage konnte nicht geladen werden/i)).toBeInTheDocument()
      })
      
      // Verify recovery options are available
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /neue vorlage erstellen/i })).toBeInTheDocument()
    })

    test('UAT-5.2: User receives validation feedback for invalid content', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplateWithComplexContent)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument()
      })
      
      // Act - Enter invalid content (empty title)
      const titleInput = screen.getByDisplayValue('Mietvertrag Vorlage')
      await user.clear(titleInput)
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Validation error is shown
      await waitFor(() => {
        expect(screen.getByText(/Titel ist erforderlich/i)).toBeInTheDocument()
      })
      
      // Verify save is prevented
      expect(mockTemplateService.updateTemplate).not.toHaveBeenCalled()
    })
  })
})