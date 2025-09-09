/**
 * Template System Integration Tests
 * Comprehensive tests for the complete template workflow
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { EnhancedFileEditor } from '@/components/enhanced-file-editor'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import { templateProcessor } from '@/lib/template-system/template-processor'
import type { Template, TemplateContext } from '@/types/template-system'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/template-system/template-processor')
jest.mock('@/components/enhanced-file-editor')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateProcessor = templateProcessor as jest.Mocked<typeof templateProcessor>
const MockEnhancedFileEditor = EnhancedFileEditor as jest.MockedFunction<typeof EnhancedFileEditor>

// Mock fetch globally
global.fetch = jest.fn()

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('Template System Integration Tests', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  // Mock template data
  const mockTemplate: Template = {
    id: 'template-1',
    user_id: 'user-1',
    titel: 'Mietvertrag Template',
    inhalt: 'Sehr geehrte/r @mieter.name,\n\nhiermit bestätigen wir Ihren Mietvertrag für @wohnung.adresse.\nDie monatliche Miete beträgt @wohnung.miete.\n\nDatum: @datum\n\nMit freundlichen Grüßen\n@vermieter.name',
    kategorie: 'vertrag',
    kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  const mockContext: TemplateContext = {
    mieter: {
      id: 'mieter-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49 123 456789',
      einzug: '2023-01-15'
    },
    wohnung: {
      id: 'wohnung-1',
      name: 'Wohnung 2A',
      groesse: 85,
      miete: 1200,
      haus_id: 'haus-1'
    },
    haus: {
      id: 'haus-1',
      name: 'Musterhaus',
      strasse: 'Musterstraße 123',
      ort: 'Berlin'
    },
    vermieter: {
      id: 'user-1',
      name: 'Anna Vermieter',
      email: 'anna@vermieter.de'
    },
    datum: new Date('2024-02-09T10:00:00Z')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    // Mock enhanced file editor
    MockEnhancedFileEditor.mockImplementation(({ isOpen, onClose, onSave, initialContent }: any) => (
      <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
        <textarea
          data-testid="editor-textarea"
          defaultValue={initialContent}
        />
        <button
          data-testid="editor-save"
          onClick={() => onSave(mockTemplate.inhalt)}
        >
          Save
        </button>
        <button data-testid="editor-close" onClick={onClose}>
          Close
        </button>
      </div>
    ))

    // Mock template processor
    mockTemplateProcessor.processTemplate.mockReturnValue({
      processedContent: 'Sehr geehrte/r Max Mustermann,\n\nhiermit bestätigen wir Ihren Mietvertrag für Wohnung 2A, Musterstraße 123, Berlin.\nDie monatliche Miete beträgt 1.200,00 €.\n\nDatum: 09.02.2024\n\nMit freundlichen Grüßen\nAnna Vermieter',
      unresolvedPlaceholders: [],
      success: true
    })

    mockTemplateProcessor.getUsedPlaceholders.mockReturnValue([
      { key: '@mieter.name', label: 'Mieter Name', description: 'Name des Mieters', category: 'mieter' },
      { key: '@wohnung.adresse', label: 'Wohnung Adresse', description: 'Adresse der Wohnung', category: 'wohnung' },
      { key: '@wohnung.miete', label: 'Wohnung Miete', description: 'Miete der Wohnung', category: 'wohnung' },
      { key: '@datum', label: 'Datum', description: 'Aktuelles Datum', category: 'datum' },
      { key: '@vermieter.name', label: 'Vermieter Name', description: 'Name des Vermieters', category: 'vermieter' }
    ])

    mockTemplateProcessor.validateContext.mockReturnValue({
      isValid: true,
      missingContext: []
    })
  })

  describe('Complete Template Workflow: Create → Edit → Use', () => {
    it('should complete the full template lifecycle successfully', async () => {
      const user = userEvent.setup()

      // Step 1: Create Template
      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock successful API responses for creation
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTemplate)
        })

      const { rerender } = render(<TemplateCreateModal />)

      // Fill in template creation form
      await user.type(screen.getByLabelText(/Template-Name/), mockTemplate.titel)
      await user.click(screen.getByText('Vertrag'))
      
      // Select context requirements
      await user.click(screen.getByRole('checkbox', { name: /Mieter/ }))
      await user.click(screen.getByRole('checkbox', { name: /Wohnung/ }))
      await user.click(screen.getByRole('checkbox', { name: /Haus/ }))

      // Add content via editor
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))

      // Submit template creation
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockTemplate)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Template erstellt',
          description: `Das Template "${mockTemplate.titel}" wurde erfolgreich erstellt.`
        })
      })

      // Step 2: Edit Template (simulated by opening file editor)
      const updatedContent = mockTemplate.inhalt + '\n\nZusätzliche Informationen: @mieter.telefon'
      
      MockEnhancedFileEditor.mockImplementation(({ isOpen, onClose, onSave, initialContent }: any) => (
        <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
          <textarea
            data-testid="editor-textarea"
            defaultValue={initialContent}
          />
          <button
            data-testid="editor-save"
            onClick={() => onSave(updatedContent)}
          >
            Save
          </button>
          <button data-testid="editor-close" onClick={onClose}>
            Close
          </button>
        </div>
      ))

      // Mock template update API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockTemplate, inhalt: updatedContent })
      })

      // Step 3: Use Template
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: { ...mockTemplate, inhalt: updatedContent },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading for template usage
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.haus])
        })

      rerender(<TemplateUsageModal />)

      // Wait for entities to load
      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select context entities
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
      await user.click(wohnungSelect)
      await user.click(screen.getByText('Wohnung 2A'))

      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)
      await user.click(screen.getByText('Musterhaus'))

      // Generate document
      await waitFor(() => {
        const generateButton = screen.getByText('Dokument erstellen')
        expect(generateButton).not.toBeDisabled()
      })

      await user.click(screen.getByText('Dokument erstellen'))

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          updatedContent,
          expect.objectContaining({
            mieter: mockContext.mieter,
            wohnung: mockContext.wohnung,
            haus: mockContext.haus
          })
        )
        expect(mockOnGenerate).toHaveBeenCalled()
        expect(mockCloseModal).toHaveBeenCalled()
      })
    })

    it('should handle template creation with validation errors', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      render(<TemplateCreateModal />)

      // Try to submit without required fields
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText('Template-Name ist erforderlich')).toBeInTheDocument()
      })

      // Fill name but leave content empty
      await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText('Template-Inhalt ist erforderlich')).toBeInTheDocument()
      })
    })

    it('should handle template usage with missing context', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: mockTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.haus])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Only select mieter, leave wohnung and haus unselected
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      // Generate button should be disabled
      const generateButton = screen.getByText('Dokument erstellen')
      expect(generateButton).toBeDisabled()

      // Should show validation error
      expect(screen.getByText(/Bitte wählen Sie folgende erforderliche Kontexte aus/)).toBeInTheDocument()
    })
  })

  describe('Error Scenarios and Network Failures', () => {
    it('should handle network failure during template creation', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock network failure
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockRejectedValueOnce(new Error('Network error'))

      render(<TemplateCreateModal />)

      // Fill form and submit
      await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Netzwerkfehler',
          description: 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
          variant: 'destructive'
        })
      })

      // Modal should remain open
      expect(mockCloseModal).not.toHaveBeenCalled()
    })

    it('should handle server error during template creation', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock server error
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' })
        })

      render(<TemplateCreateModal />)

      // Fill form and submit
      await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler beim Erstellen',
          description: 'Internal server error',
          variant: 'destructive'
        })
      })
    })

    it('should handle entity loading failure during template usage', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: mockTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading failure
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to load entities'))

      render(<TemplateUsageModal />)

      // Should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByText('Template verwenden: Mietvertrag Template')).toBeInTheDocument()
      })

      // Should show error state or fallback
      expect(screen.queryByText('Lade verfügbare Entitäten...')).toBeInTheDocument()
    })

    it('should handle template processing failure', async () => {
      const user = userEvent.setup()

      // Mock processing failure
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: mockTemplate.inhalt,
        unresolvedPlaceholders: [],
        success: false,
        errors: ['Template processing failed']
      })

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: mockTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.haus])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select contexts and show preview
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('Verarbeitungsfehler')).toBeInTheDocument()
      })
    })

    it('should handle invalid template data', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      render(<TemplateCreateModal />)

      // Try to create template with malicious content
      await user.type(screen.getByLabelText(/Template-Name/), 'Malicious Template')
      await user.click(screen.getByText('E-Mail'))

      // Mock editor with malicious content
      MockEnhancedFileEditor.mockImplementation(({ isOpen, onClose, onSave }: any) => (
        <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
          <button
            data-testid="editor-save"
            onClick={() => onSave('<script>alert("xss")</script>@mieter.name')}
          >
            Save
          </button>
          <button data-testid="editor-close" onClick={onClose}>
            Close
          </button>
        </div>
      ))

      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      // Should show validation error for malicious content
      await waitFor(() => {
        expect(screen.getByText(/Skript-Tags sind nicht erlaubt/)).toBeInTheDocument()
      })
    })
  })

  describe('Context Combinations and Edge Cases', () => {
    it('should handle template with all context types', async () => {
      const user = userEvent.setup()

      const complexTemplate: Template = {
        ...mockTemplate,
        inhalt: '@mieter.name @wohnung.adresse @haus.name @vermieter.name @datum',
        kontext_anforderungen: ['mieter', 'wohnung', 'haus', 'vermieter']
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.haus])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show all required context selectors
      expect(screen.getByText('Mieter *')).toBeInTheDocument()
      expect(screen.getByText('Wohnung *')).toBeInTheDocument()
      expect(screen.getByText('Haus *')).toBeInTheDocument()
      // Vermieter is automatically available from current user
    })

    it('should handle template with no context requirements', async () => {
      const simpleTemplate: Template = {
        ...mockTemplate,
        inhalt: 'Heute ist @datum. Mit freundlichen Grüßen @vermieter.name',
        kontext_anforderungen: []
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: simpleTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should not show entity loading or context selectors
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      expect(screen.queryByText('Mieter *')).not.toBeInTheDocument()
      expect(screen.queryByText('Wohnung *')).not.toBeInTheDocument()

      // Generate button should be enabled immediately
      const generateButton = screen.getByText('Dokument erstellen')
      expect(generateButton).not.toBeDisabled()
    })

    it('should handle partial placeholder resolution', async () => {
      const user = userEvent.setup()

      // Mock partial processing result
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Sehr geehrte/r Max Mustermann,\n\nhiermit bestätigen wir Ihren Mietvertrag für [Wohnung Adresse].\nDie monatliche Miete beträgt [Wohnung Miete].',
        unresolvedPlaceholders: ['@wohnung.adresse', '@wohnung.miete'],
        success: true
      })

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: mockTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with only mieter
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select only mieter
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      // Show preview
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('2 unaufgelöste Platzhalter')).toBeInTheDocument()
        expect(screen.getByText('Unaufgelöste Platzhalter:')).toBeInTheDocument()
        expect(screen.getByText('@wohnung.adresse')).toBeInTheDocument()
        expect(screen.getByText('@wohnung.miete')).toBeInTheDocument()
      })
    })
  })
})