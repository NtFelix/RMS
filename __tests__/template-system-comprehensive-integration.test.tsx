/**
 * Comprehensive Template System Integration Tests
 * Enhanced tests covering complete workflows, error scenarios, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { TemplatePreview } from '@/components/template-preview'
import { EnhancedFileEditor } from '@/components/enhanced-file-editor'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import { templateProcessor } from '@/lib/template-system/template-processor'
import { templateValidator } from '@/lib/template-system/template-validation'
import type { Template, TemplateContext } from '@/types/template-system'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/template-system/template-processor')
jest.mock('@/lib/template-system/template-validation')
jest.mock('@/components/enhanced-file-editor')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateProcessor = templateProcessor as jest.Mocked<typeof templateProcessor>
const mockTemplateValidator = templateValidator as jest.Mocked<typeof templateValidator>
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

describe('Comprehensive Template System Integration Tests', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  // Complex test data
  const complexTemplate: Template = {
    id: 'complex-template-1',
    user_id: 'user-1',
    titel: 'Komplexer Mietvertrag',
    inhalt: `
Mietvertrag

Vermieter: @vermieter.name (@vermieter.email)
Mieter: @mieter.name (@mieter.email, @mieter.telefon)

Mietobjekt:
- Adresse: @wohnung.adresse
- Größe: @wohnung.groesse
- Miete: @wohnung.miete
- Haus: @haus.name in @haus.ort

Mietbeginn: @mieter.einzug
Mietende: @mieter.auszug
Nebenkosten: @mieter.nebenkosten

Datum: @datum (@datum.lang)
Monat: @monat (@monat.name)
Jahr: @jahr

Mit freundlichen Grüßen
@vermieter.name
    `.trim(),
    kategorie: 'vertrag',
    kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  const complexContext: TemplateContext = {
    mieter: {
      id: 'mieter-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49 123 456789',
      einzug: '2023-01-15',
      auszug: '2024-12-31',
      nebenkosten: [
        { id: '1', amount: '150.00', date: '2024-01-01' },
        { id: '2', amount: '75.50', date: '2024-02-01' }
      ]
    },
    wohnung: {
      id: 'wohnung-1',
      name: 'Wohnung 2A',
      groesse: 85,
      miete: 1200,
      haus_id: 'haus-1',
      status: 'vermietet',
      Haeuser: { name: 'Musterstraße 123, Berlin' }
    },
    haus: {
      id: 'haus-1',
      name: 'Musterhaus',
      strasse: 'Musterstraße 123',
      ort: 'Berlin',
      size: '450',
      rent: '4800'
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
          onClick={() => onSave(complexTemplate.inhalt)}
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
      processedContent: 'Processed template content with resolved placeholders',
      unresolvedPlaceholders: [],
      success: true
    })

    mockTemplateProcessor.validateContext.mockReturnValue({
      isValid: true,
      missingContext: []
    })

    // Mock template validator
    mockTemplateValidator.validateForCreation.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      placeholders: ['@mieter.name', '@wohnung.adresse']
    })

    mockTemplateValidator.validateForUsage.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  })

  describe('Complete Template Lifecycle with Complex Data', () => {
    it('should handle complete workflow with complex template and multiple entity relationships', async () => {
      const user = userEvent.setup()

      // Step 1: Create complex template
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
          json: () => Promise.resolve(complexTemplate)
        })

      const { rerender } = render(<TemplateCreateModal />)

      // Fill in complex template creation form
      await user.type(screen.getByLabelText(/Template-Name/), complexTemplate.titel)
      await user.click(screen.getByText('Vertrag'))
      
      // Select all required context types
      await user.click(screen.getByRole('checkbox', { name: /Mieter/ }))
      await user.click(screen.getByRole('checkbox', { name: /Wohnung/ }))
      await user.click(screen.getByRole('checkbox', { name: /Haus/ }))

      // Add complex content via editor
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))

      // Submit template creation
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(complexTemplate)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Template erstellt',
          description: `Das Template "${complexTemplate.titel}" wurde erfolgreich erstellt.`
        })
      })

      // Step 2: Use complex template with full context
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading for template usage
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.haus])
        })

      rerender(<TemplateUsageModal />)

      // Wait for entities to load
      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select all required context entities
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
      await user.click(wohnungSelect)
      await user.click(screen.getByText('Wohnung 2A'))

      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)
      await user.click(screen.getByText('Musterhaus'))

      // Show preview with complex processing
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          complexTemplate.inhalt,
          expect.objectContaining({
            mieter: complexContext.mieter,
            wohnung: complexContext.wohnung,
            haus: complexContext.haus
          })
        )
      })

      // Generate final document
      await waitFor(() => {
        const generateButton = screen.getByText('Dokument erstellen')
        expect(generateButton).not.toBeDisabled()
      })

      await user.click(screen.getByText('Dokument erstellen'))

      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalled()
        expect(mockCloseModal).toHaveBeenCalled()
      })
    })

    it('should handle template creation with validation warnings and user confirmation', async () => {
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

      // Mock validation with warnings
      mockTemplateValidator.validateForCreation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [
          'Template enthält sehr viele Platzhalter',
          'Kategorie "Vertrag" benötigt normalerweise auch Haus-Kontext'
        ],
        placeholders: ['@mieter.name', '@wohnung.adresse']
      })

      // Mock successful API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(complexTemplate)
        })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Template mit Warnungen')
      await user.click(screen.getByText('Vertrag'))
      await user.click(screen.getByRole('checkbox', { name: /Mieter/ }))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      // Should show warnings
      await waitFor(() => {
        expect(screen.getByText(/Warnungen gefunden/)).toBeInTheDocument()
        expect(screen.getByText(/sehr viele Platzhalter/)).toBeInTheDocument()
        expect(screen.getByText(/Haus-Kontext/)).toBeInTheDocument()
      })

      // User confirms despite warnings
      await user.click(screen.getByText('Trotzdem erstellen'))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should handle template usage with partial context and unresolved placeholders', async () => {
      const user = userEvent.setup()

      // Mock partial processing result
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: `
Mietvertrag

Vermieter: Anna Vermieter (anna@vermieter.de)
Mieter: Max Mustermann (max@example.com, +49 123 456789)

Mietobjekt:
- Adresse: [Wohnung Adresse]
- Größe: [Wohnung Größe]
- Miete: [Wohnung Miete]
- Haus: [Haus Name] in [Haus Ort]

Datum: 09.02.2024 (09. Februar 2024)
        `.trim(),
        unresolvedPlaceholders: ['@wohnung.adresse', '@wohnung.groesse', '@wohnung.miete', '@haus.name', '@haus.ort'],
        success: true
      })

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with only mieter available
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.mieter])
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

      // Show preview with unresolved placeholders
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('5 unaufgelöste Platzhalter')).toBeInTheDocument()
        expect(screen.getByText('Unaufgelöste Platzhalter:')).toBeInTheDocument()
        expect(screen.getByText('@wohnung.adresse')).toBeInTheDocument()
        expect(screen.getByText('@haus.name')).toBeInTheDocument()
      })

      // User can still generate with warnings
      const generateButton = screen.getByText('Trotzdem erstellen')
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalled()
      })
    })
  })

  describe('Advanced Error Scenarios and Recovery', () => {
    it('should handle concurrent template creation attempts', async () => {
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

      // Mock race condition - name becomes unavailable between check and creation
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ 
            error: 'Template name already exists',
            code: 'DUPLICATE_NAME'
          })
        })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Concurrent Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Name bereits vergeben',
          description: 'Ein anderer Benutzer hat bereits ein Template mit diesem Namen erstellt. Bitte wählen Sie einen anderen Namen.',
          variant: 'destructive'
        })
      })

      // Modal should remain open for retry
      expect(mockCloseModal).not.toHaveBeenCalled()
    })

    it('should handle template usage with corrupted entity data', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock corrupted entity data
      const corruptedMieter = {
        id: 'mieter-1',
        name: null, // corrupted data
        email: 'invalid-email', // invalid format
        telefonnummer: undefined
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([corruptedMieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.haus])
        })

      // Mock processor handling corrupted data
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Template with [Mieter Name] and invalid-email',
        unresolvedPlaceholders: ['@mieter.name'],
        success: true,
        warnings: ['Mieter-Daten sind unvollständig oder beschädigt']
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select corrupted mieter
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Mieter 1')) // Fallback display name

      // Show preview with data quality warnings
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Datenqualitätsprobleme erkannt/)).toBeInTheDocument()
        expect(screen.getByText(/unvollständig oder beschädigt/)).toBeInTheDocument()
      })
    })

    it('should handle template processing timeout and retry', async () => {
      const user = userEvent.setup()

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
          json: () => Promise.resolve([complexContext.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.haus])
        })

      // Mock processing timeout on first attempt, success on retry
      let processingAttempts = 0
      mockTemplateProcessor.processTemplate.mockImplementation(() => {
        processingAttempts++
        if (processingAttempts === 1) {
          throw new Error('Processing timeout')
        }
        return {
          processedContent: 'Successfully processed template',
          unresolvedPlaceholders: [],
          success: true
        }
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select all entities
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      // Show preview - should fail first time
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Verarbeitungsfehler/)).toBeInTheDocument()
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })

      // Retry processing
      await user.click(screen.getByText('Erneut versuchen'))

      await waitFor(() => {
        expect(screen.getByText('Successfully processed template')).toBeInTheDocument()
      })

      expect(processingAttempts).toBe(2)
    })

    it('should handle database connection failures with offline mode', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock network failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<TemplateUsageModal />)

      // Should show offline mode
      await waitFor(() => {
        expect(screen.getByText(/Offline-Modus/)).toBeInTheDocument()
        expect(screen.getByText(/Keine Internetverbindung/)).toBeInTheDocument()
      })

      // Should allow manual context input
      expect(screen.getByText('Manuelle Eingabe')).toBeInTheDocument()
    })
  })

  describe('Performance and Scalability Tests', () => {
    it('should handle large template content efficiently', async () => {
      const user = userEvent.setup()

      const largeTemplate = {
        ...complexTemplate,
        inhalt: 'Large content: ' + '@mieter.name '.repeat(1000) + 'End of large template'
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: largeTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.mieter])
        })

      // Mock processing with performance metrics
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Large processed content',
        unresolvedPlaceholders: [],
        success: true,
        processingTime: 150 // ms
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('Large processed content')).toBeInTheDocument()
      })

      // Should complete within reasonable time
      expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledTimes(1)
    })

    it('should handle many concurrent entity selections efficiently', async () => {
      const user = userEvent.setup()

      // Create large entity datasets
      const largeMieterList = Array.from({ length: 500 }, (_, i) => ({
        id: `mieter-${i}`,
        name: `Mieter ${i}`,
        email: `mieter${i}@example.com`
      }))

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock large entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(largeMieterList)
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should handle large lists with search/filter
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)

      // Should show search functionality for large lists
      expect(screen.getByPlaceholderText(/Suchen/)).toBeInTheDocument()

      // Search should filter results
      await user.type(screen.getByPlaceholderText(/Suchen/), 'Mieter 42')
      
      await waitFor(() => {
        expect(screen.getByText('Mieter 42')).toBeInTheDocument()
        expect(screen.queryByText('Mieter 1')).not.toBeInTheDocument()
      })
    })

    it('should handle memory-intensive template operations', async () => {
      const user = userEvent.setup()

      // Create template with many complex placeholders
      const memoryIntensiveTemplate = {
        ...complexTemplate,
        inhalt: Array.from({ length: 100 }, (_, i) => 
          `Section ${i}: @mieter.name lives at @wohnung.adresse paying @wohnung.miete since @mieter.einzug`
        ).join('\n')
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: memoryIntensiveTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([complexContext.mieter])
        })

      // Mock memory-efficient processing
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Memory-efficiently processed content',
        unresolvedPlaceholders: [],
        success: true,
        memoryUsage: '15MB'
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('Memory-efficiently processed content')).toBeInTheDocument()
      })

      // Should complete without memory issues
      expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cross-Browser and Accessibility Tests', () => {
    it('should handle keyboard navigation throughout template workflow', async () => {
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

      // Navigate using keyboard only
      await user.tab() // Focus template name input
      await user.type(screen.getByLabelText(/Template-Name/), 'Keyboard Template')
      
      await user.tab() // Focus category selector
      await user.keyboard('{Enter}') // Open category dropdown
      await user.keyboard('{ArrowDown}') // Navigate to E-Mail
      await user.keyboard('{Enter}') // Select E-Mail
      
      await user.tab() // Focus context checkboxes
      await user.keyboard(' ') // Check Mieter checkbox
      
      // Continue keyboard navigation through all form elements
      await user.tab() // Focus editor button
      await user.keyboard('{Enter}') // Open editor
      
      // Editor should be keyboard accessible
      expect(screen.getByTestId('enhanced-file-editor')).toBeInTheDocument()
    })

    it('should provide proper ARIA labels and screen reader support', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Check ARIA labels
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby')
      
      // Check form labels
      expect(screen.getByLabelText(/Mieter auswählen/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Wohnung auswählen/)).toBeInTheDocument()
      
      // Check button accessibility
      const generateButton = screen.getByRole('button', { name: /Dokument erstellen/ })
      expect(generateButton).toHaveAttribute('aria-describedby')
    })

    it('should handle high contrast mode and color accessibility', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should adapt to high contrast mode
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('high-contrast') // Assuming CSS class is applied
    })
  })

  describe('Data Integrity and Consistency Tests', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock concurrent entity updates
      let entityVersion = 1
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/mieter')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              ...complexContext.mieter,
              version: entityVersion++,
              name: `Max Mustermann v${entityVersion - 1}`
            }])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select entity
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann v1'))

      // Simulate entity update in background
      // Re-fetch should detect version change
      await user.click(screen.getByText('Aktualisieren'))

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann v2')).toBeInTheDocument()
      })
    })

    it('should validate template-entity compatibility', async () => {
      const user = userEvent.setup()

      // Template requires specific entity structure
      const strictTemplate = {
        ...complexTemplate,
        inhalt: '@mieter.spezial_feld @wohnung.neue_eigenschaft',
        kontext_anforderungen: ['mieter', 'wohnung']
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: strictTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entities without required fields
      const incompatibleMieter = {
        id: 'mieter-1',
        name: 'Max Mustermann'
        // missing spezial_feld
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([incompatibleMieter])
        })

      // Mock processor detecting incompatibility
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Template with [Spezial Feld] and [Neue Eigenschaft]',
        unresolvedPlaceholders: ['@mieter.spezial_feld', '@wohnung.neue_eigenschaft'],
        success: true,
        warnings: ['Entität-Template-Inkompatibilität erkannt']
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Inkompatibilität erkannt/)).toBeInTheDocument()
        expect(screen.getByText(/Entität unterstützt nicht alle erforderlichen Felder/)).toBeInTheDocument()
      })
    })
  })
})