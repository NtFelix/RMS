/**
 * User Acceptance Tests - Edge Cases and Integration Scenarios
 * 
 * This test suite covers edge cases and complex integration scenarios
 * that users might encounter in real-world usage.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateService } from '@/lib/template-service'

// Mock dependencies
jest.mock('@/lib/template-service')
jest.mock('@/hooks/use-modal-store')

const mockTemplateService = templateService as jest.Mocked<typeof templateService>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Large template for performance testing
const largeTemplateContent = {
  type: 'doc',
  content: Array.from({ length: 100 }, (_, i) => ({
    type: 'paragraph',
    content: [
      { type: 'text', text: `This is paragraph ${i + 1} with some content. ` },
      {
        type: 'mention',
        attrs: { id: 'tenant_name', label: 'Mieter Name' }
      },
      { type: 'text', text: ' should be replaced with actual tenant name.' }
    ]
  }))
}

const mockLargeTemplate = {
  id: 'large-template',
  titel: 'Große Vorlage',
  kategorie: 'Test',
  inhalt: largeTemplateContent,
  kontext_anforderungen: ['tenant_name'],
  user_id: 'test-user',
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-15T10:30:00Z'
}

describe('Template System - Edge Cases UAT', () => {
  let user: ReturnType<typeof userEvent.setup>
  
  beforeEach(() => {
    user = userEvent.setup()
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      templateEditorModal: {
        isOpen: true,
        templateId: 'test-template',
        mode: 'edit'
      },
      closeTemplateEditorModal: jest.fn(),
      openTemplateEditorModal: jest.fn()
    })
  })

  describe('UAT-Edge-1: Large Template Handling', () => {
    test('UAT-E1.1: User works with large template (100+ paragraphs)', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockLargeTemplate)
      
      const startTime = performance.now()
      
      // Act
      render(<TemplateEditorModal />)
      
      // Assert - Large template loads within reasonable time
      await waitFor(() => {
        expect(screen.getByDisplayValue('Große Vorlage')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(5000) // 5 seconds max for large templates
      
      // Verify content is accessible
      expect(screen.getByText('This is paragraph 1 with some content.')).toBeInTheDocument()
      
      // Test scrolling performance
      const editor = screen.getByRole('textbox', { name: /template content/i })
      fireEvent.scroll(editor, { target: { scrollTop: 1000 } })
      
      // Should remain responsive
      await waitFor(() => {
        expect(editor.scrollTop).toBeGreaterThan(0)
      })
    })

    test('UAT-E1.2: User saves large template with many variables', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue(mockLargeTemplate)
      mockTemplateService.updateTemplate.mockResolvedValue({
        success: true,
        template: mockLargeTemplate
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Große Vorlage')).toBeInTheDocument()
      })
      
      // Act - Save large template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      const startTime = performance.now()
      
      await user.click(saveButton)
      
      // Assert - Save completes within reasonable time
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalled()
      }, { timeout: 10000 })
      
      const saveTime = performance.now() - startTime
      expect(saveTime).toBeLessThan(10000) // 10 seconds max for large template save
    })
  })

  describe('UAT-Edge-2: Special Characters and Encoding', () => {
    test('UAT-E2.1: User enters special German characters and symbols', async () => {
      // Arrange
      const templateWithSpecialChars = {
        id: 'special-chars-template',
        titel: 'Spezielle Zeichen Vorlage',
        kategorie: 'Test',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Umlaute: äöüÄÖÜß' }
              ]
            }
          ]
        },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      }
      
      mockTemplateService.getTemplate.mockResolvedValue(templateWithSpecialChars)
      mockTemplateService.updateTemplate.mockResolvedValue({
        success: true,
        template: templateWithSpecialChars
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Umlaute: äöüÄÖÜß')).toBeInTheDocument()
      })
      
      // Act - Add more special characters
      const editor = screen.getByRole('textbox', { name: /template content/i })
      await user.click(editor)
      await user.type(editor, ' Währung: €, Grad: °, Copyright: ©')
      
      // Save template
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Special characters are preserved
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
          'special-chars-template',
          expect.objectContaining({
            inhalt: expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.arrayContaining([
                    expect.objectContaining({
                      text: expect.stringContaining('€')
                    })
                  ])
                })
              ])
            })
          })
        )
      })
    })

    test('UAT-E2.2: User copies and pastes content from external sources', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'paste-test',
        titel: 'Paste Test',
        kategorie: 'Test',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Paste Test')).toBeInTheDocument()
      })
      
      // Act - Simulate paste with rich content
      const editor = screen.getByRole('textbox', { name: /template content/i })
      await user.click(editor)
      
      // Simulate paste event with HTML content
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      })
      
      pasteEvent.clipboardData?.setData('text/html', '<p><strong>Bold text</strong> and <em>italic text</em></p>')
      pasteEvent.clipboardData?.setData('text/plain', 'Bold text and italic text')
      
      fireEvent(editor, pasteEvent)
      
      // Assert - Content is pasted and sanitized properly
      await waitFor(() => {
        expect(screen.getByText('Bold text')).toBeInTheDocument()
        expect(screen.getByText('italic text')).toBeInTheDocument()
      })
      
      // Verify formatting is preserved
      const boldText = screen.getByText('Bold text')
      expect(boldText).toHaveStyle('font-weight: bold')
    })
  })

  describe('UAT-Edge-3: Concurrent Editing Scenarios', () => {
    test('UAT-E3.1: User receives warning when template was modified by another user', async () => {
      // Arrange
      const originalTemplate = {
        id: 'concurrent-test',
        titel: 'Original Title',
        kategorie: 'Test',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-15T10:30:00Z'
      }
      
      const modifiedTemplate = {
        ...originalTemplate,
        titel: 'Modified by Another User',
        aktualisiert_am: '2024-01-15T11:00:00Z' // Later timestamp
      }
      
      mockTemplateService.getTemplate.mockResolvedValue(originalTemplate)
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument()
      })
      
      // Act - Simulate another user modifying the template
      mockTemplateService.updateTemplate.mockRejectedValue({
        code: 'CONCURRENT_MODIFICATION',
        message: 'Template was modified by another user',
        latestVersion: modifiedTemplate
      })
      
      // User tries to save
      const titleInput = screen.getByDisplayValue('Original Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'My Changes')
      
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - Conflict resolution dialog appears
      await waitFor(() => {
        expect(screen.getByText(/Konflikt erkannt/i)).toBeInTheDocument()
        expect(screen.getByText(/wurde von einem anderen Benutzer geändert/i)).toBeInTheDocument()
      })
      
      // Verify resolution options
      expect(screen.getByRole('button', { name: /meine änderungen übernehmen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /andere version laden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zusammenführen/i })).toBeInTheDocument()
    })
  })

  describe('UAT-Edge-4: Network and Offline Scenarios', () => {
    test('UAT-E4.1: User works offline and changes are preserved', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'offline-test',
        titel: 'Offline Test',
        kategorie: 'Test',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Offline Test')).toBeInTheDocument()
      })
      
      // Act - Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      window.dispatchEvent(new Event('offline'))
      
      // User makes changes while offline
      const titleInput = screen.getByDisplayValue('Offline Test')
      await user.clear(titleInput)
      await user.type(titleInput, 'Offline Changes')
      
      // Assert - Offline indicator is shown
      await waitFor(() => {
        expect(screen.getByText(/Offline/i)).toBeInTheDocument()
        expect(screen.getByText(/Änderungen werden lokal gespeichert/i)).toBeInTheDocument()
      })
      
      // Verify changes are preserved locally
      expect(screen.getByDisplayValue('Offline Changes')).toBeInTheDocument()
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      
      window.dispatchEvent(new Event('online'))
      
      // Assert - Sync option appears
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /synchronisieren/i })).toBeInTheDocument()
      })
    })

    test('UAT-E4.2: User experiences intermittent network issues during save', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'network-test',
        titel: 'Network Test',
        kategorie: 'Test',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      })
      
      // Simulate network timeout
      mockTemplateService.updateTemplate
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          success: true,
          template: {
            id: 'network-test',
            titel: 'Network Test Updated',
            kategorie: 'Test',
            inhalt: { type: 'doc', content: [] },
            kontext_anforderungen: [],
            user_id: 'test-user',
            erstellungsdatum: '2024-01-01T00:00:00Z',
            aktualisiert_am: new Date().toISOString()
          }
        })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Network Test')).toBeInTheDocument()
      })
      
      // Act - Try to save (will fail twice, then succeed)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Assert - First failure shows retry option
      await waitFor(() => {
        expect(screen.getByText(/Netzwerkfehler/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })
      
      // Retry (will fail again)
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)
      
      // Assert - Second failure shows exponential backoff
      await waitFor(() => {
        expect(screen.getByText(/Erneuter Versuch in/i)).toBeInTheDocument()
      })
      
      // Wait for automatic retry
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich gespeichert/i)).toBeInTheDocument()
      }, { timeout: 10000 })
    })
  })

  describe('UAT-Edge-5: Accessibility and Keyboard Navigation', () => {
    test('UAT-E5.1: User navigates entire interface using only keyboard', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'keyboard-test',
        titel: 'Keyboard Navigation Test',
        kategorie: 'Test',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Test content' }]
            }
          ]
        },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Keyboard Navigation Test')).toBeInTheDocument()
      })
      
      // Act - Navigate using Tab key
      await user.tab() // Should focus title input
      expect(screen.getByDisplayValue('Keyboard Navigation Test')).toHaveFocus()
      
      await user.tab() // Should focus category select
      const categorySelect = screen.getByRole('combobox', { name: /kategorie/i })
      expect(categorySelect).toHaveFocus()
      
      await user.tab() // Should focus editor
      const editor = screen.getByRole('textbox', { name: /template content/i })
      expect(editor).toHaveFocus()
      
      // Test keyboard shortcuts in editor
      await user.keyboard('{Control>}b{/Control}') // Bold shortcut
      await user.type(editor, 'Bold text')
      
      // Assert - Bold formatting is applied
      await waitFor(() => {
        const boldText = screen.getByText('Bold text')
        expect(boldText).toHaveStyle('font-weight: bold')
      })
      
      // Navigate to save button
      await user.tab()
      await user.tab()
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      expect(saveButton).toHaveFocus()
      
      // Test save with Enter key
      await user.keyboard('{Enter}')
      
      // Assert - Save is triggered
      await waitFor(() => {
        expect(mockTemplateService.updateTemplate).toHaveBeenCalled()
      })
    })

    test('UAT-E5.2: Screen reader user can understand and use all features', async () => {
      // Arrange
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'screen-reader-test',
        titel: 'Screen Reader Test',
        kategorie: 'Test',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'test-user',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: null
      })
      
      render(<TemplateEditorModal />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Screen Reader Test')).toBeInTheDocument()
      })
      
      // Assert - All interactive elements have proper labels
      expect(screen.getByLabelText(/titel/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/kategorie/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/template content/i)).toBeInTheDocument()
      
      // Verify ARIA attributes
      const editor = screen.getByRole('textbox', { name: /template content/i })
      expect(editor).toHaveAttribute('aria-label')
      expect(editor).toHaveAttribute('aria-describedby')
      
      // Test slash command menu accessibility
      await user.click(editor)
      await user.type(editor, '/')
      
      await waitFor(() => {
        const commandMenu = screen.getByRole('listbox')
        expect(commandMenu).toHaveAttribute('aria-label', 'Verfügbare Befehle')
        
        const commands = screen.getAllByRole('option')
        commands.forEach(command => {
          expect(command).toHaveAttribute('aria-describedby')
        })
      })
      
      // Test variable mention menu accessibility
      await user.clear(editor)
      await user.type(editor, '@')
      
      await waitFor(() => {
        const variableMenu = screen.getByRole('listbox')
        expect(variableMenu).toHaveAttribute('aria-label', 'Verfügbare Variablen')
        
        const variables = screen.getAllByRole('option')
        variables.forEach(variable => {
          expect(variable).toHaveAttribute('aria-describedby')
        })
      })
    })
  })
})