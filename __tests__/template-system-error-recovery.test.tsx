/**
 * Template System Error Recovery and Edge Case Tests
 * Tests for error handling, recovery mechanisms, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
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

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

describe('Template System Error Recovery and Edge Cases', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('Network and Connectivity Issues', () => {
    it('should handle complete network failure with offline mode', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'offline-template',
            titel: 'Offline Template',
            inhalt: 'Hello @mieter.name',
            kategorie: 'mail',
            kontext_anforderungen: ['mieter']
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock complete network failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'))

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.getByText(/Offline-Modus aktiviert/)).toBeInTheDocument()
        expect(screen.getByText(/Keine Internetverbindung/)).toBeInTheDocument()
      })

      // Should offer offline functionality
      expect(screen.getByText('Offline arbeiten')).toBeInTheDocument()
      expect(screen.getByText('Manuelle Dateneingabe')).toBeInTheDocument()

      // User can work offline
      await user.click(screen.getByText('Offline arbeiten'))

      expect(screen.getByText('Offline-Modus')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Mieter Name eingeben')).toBeInTheDocument()
    })

    it('should handle intermittent connectivity with retry mechanism', async () => {
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

      let attemptCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        attemptCount++
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Retry Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      // Should show retry mechanism
      await waitFor(() => {
        expect(screen.getByText(/Verbindungsfehler/)).toBeInTheDocument()
        expect(screen.getByText('Erneut versuchen (Versuch 1/3)')).toBeInTheDocument()
      })

      // Should automatically retry
      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen (Versuch 2/3)')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should eventually succeed
      await waitFor(() => {
        expect(attemptCount).toBe(3)
      }, { timeout: 5000 })
    })

    it('should handle slow network with timeout and progress indication', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'slow-template',
            titel: 'Slow Template'
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock slow response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve([])
          }), 5000)
        )
      )

      render(<TemplateUsageModal />)

      // Should show loading with progress
      expect(screen.getByText('Lade verfügbare Entitäten...')).toBeInTheDocument()

      // Should show timeout warning
      await waitFor(() => {
        expect(screen.getByText(/Langsame Verbindung erkannt/)).toBeInTheDocument()
        expect(screen.getByText('Vorgang abbrechen')).toBeInTheDocument()
      }, { timeout: 3000 })

      // User can cancel slow operation
      await user.click(screen.getByText('Vorgang abbrechen'))

      expect(screen.getByText('Vorgang abgebrochen')).toBeInTheDocument()
    })
  })

  describe('Data Corruption and Recovery', () => {
    it('should detect and recover from corrupted template data', async () => {
      const user = userEvent.setup()

      const corruptedTemplate = {
        id: 'corrupted-template',
        titel: 'Corrupted Template',
        inhalt: null, // Corrupted content
        kategorie: 'mail',
        kontext_anforderungen: ['mieter'],
        corrupted: true
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: corruptedTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should detect corruption
      await waitFor(() => {
        expect(screen.getByText(/Template-Daten sind beschädigt/)).toBeInTheDocument()
        expect(screen.getByText('Automatische Wiederherstellung')).toBeInTheDocument()
        expect(screen.getByText('Backup laden')).toBeInTheDocument()
      })

      // Mock recovery attempt
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...corruptedTemplate,
          inhalt: 'Wiederhergestellter Inhalt: Hello @mieter.name',
          recovered: true,
          recoverySource: 'backup'
        })
      })

      await user.click(screen.getByText('Automatische Wiederherstellung'))

      await waitFor(() => {
        expect(screen.getByText('Template erfolgreich wiederhergestellt')).toBeInTheDocument()
        expect(screen.getByText('Quelle: Backup vom')).toBeInTheDocument()
      })
    })

    it('should handle corrupted entity data gracefully', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'entity-template',
            titel: 'Entity Template',
            inhalt: 'Hello @mieter.name',
            kategorie: 'mail',
            kontext_anforderungen: ['mieter']
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock corrupted entity data
      const corruptedEntities = [
        {
          id: 'mieter-1',
          name: null, // Corrupted name
          email: 'invalid-email-format',
          corrupted_fields: ['name']
        },
        {
          id: 'mieter-2',
          // Missing required fields
          corrupted: true
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(corruptedEntities)
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show data quality warnings
      expect(screen.getByText(/Datenqualitätsprobleme erkannt/)).toBeInTheDocument()
      expect(screen.getByText('1 Entität mit beschädigten Daten')).toBeInTheDocument()
      expect(screen.getByText('1 Entität unvollständig')).toBeInTheDocument()

      // Should offer data repair options
      expect(screen.getByText('Daten reparieren')).toBeInTheDocument()
      expect(screen.getByText('Trotzdem verwenden')).toBeInTheDocument()

      await user.click(screen.getByText('Daten reparieren'))

      expect(screen.getByText('Datenreparatur')).toBeInTheDocument()
      expect(screen.getByText('Fehlende Felder ergänzen')).toBeInTheDocument()
    })

    it('should handle database schema changes and migrations', async () => {
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

      // Mock schema version mismatch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({
          error: 'Schema version mismatch',
          currentVersion: '2.1',
          expectedVersion: '2.0',
          migrationRequired: true
        })
      })

      render(<TemplateCreateModal />)

      await waitFor(() => {
        expect(screen.getByText(/Schema-Update erforderlich/)).toBeInTheDocument()
        expect(screen.getByText('Automatische Migration')).toBeInTheDocument()
        expect(screen.getByText('Seite neu laden')).toBeInTheDocument()
      })
    })
  })

  describe('Memory and Performance Issues', () => {
    it('should handle memory exhaustion with graceful degradation', async () => {
      const user = userEvent.setup()

      // Mock memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 950 * 1024 * 1024, // 950MB
          totalJSHeapSize: 1024 * 1024 * 1024, // 1GB
          jsHeapSizeLimit: 1024 * 1024 * 1024
        }
      })

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'memory-intensive-template',
            titel: 'Memory Intensive Template',
            inhalt: 'Large template content'.repeat(10000)
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should detect memory pressure
      await waitFor(() => {
        expect(screen.getByText(/Speicher-Warnung/)).toBeInTheDocument()
        expect(screen.getByText('Reduzierter Modus aktiviert')).toBeInTheDocument()
      })

      // Should offer memory optimization
      expect(screen.getByText('Speicher optimieren')).toBeInTheDocument()
      expect(screen.getByText('Vereinfachte Ansicht')).toBeInTheDocument()
    })

    it('should handle processing timeout with chunked processing', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'timeout-template',
            titel: 'Timeout Template',
            inhalt: '@mieter.name '.repeat(1000) // Very large template
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock processing timeout
      mockTemplateProcessor.processTemplate.mockImplementation(() => {
        throw new Error('Processing timeout after 30 seconds')
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'mieter-1', name: 'Test Mieter' }])
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Test Mieter'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Verarbeitung dauert länger als erwartet/)).toBeInTheDocument()
        expect(screen.getByText('Chunked Processing aktivieren')).toBeInTheDocument()
      })

      // Mock chunked processing success
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Chunked processed content',
        unresolvedPlaceholders: [],
        success: true,
        processingMethod: 'chunked'
      })

      await user.click(screen.getByText('Chunked Processing aktivieren'))

      await waitFor(() => {
        expect(screen.getByText('Chunked processed content')).toBeInTheDocument()
        expect(screen.getByText('Verarbeitung in Blöcken abgeschlossen')).toBeInTheDocument()
      })
    })

    it('should handle browser compatibility issues', async () => {
      // Mock older browser without modern features
      const originalFetch = global.fetch
      delete (global as any).fetch

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

      // Should detect missing features
      await waitFor(() => {
        expect(screen.getByText(/Browser-Kompatibilitätsproblem/)).toBeInTheDocument()
        expect(screen.getByText('Fallback-Modus aktiviert')).toBeInTheDocument()
      })

      // Restore fetch
      global.fetch = originalFetch
    })
  })

  describe('Concurrent Access and Race Conditions', () => {
    it('should handle concurrent template modifications', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess,
          editMode: true,
          template: {
            id: 'concurrent-template',
            titel: 'Concurrent Template',
            version: '1.0'
          }
        },
        isTemplateCreateModalDirty: true,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock concurrent modification conflict
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: 'Concurrent modification detected',
          currentVersion: '1.2',
          yourVersion: '1.0',
          conflictingUser: 'other-user@example.com',
          conflictTime: '2024-02-09T10:30:00Z'
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), ' - Modified')
      await user.click(screen.getByRole('button', { name: /Template aktualisieren/ }))

      await waitFor(() => {
        expect(screen.getByText(/Bearbeitungskonflikt erkannt/)).toBeInTheDocument()
        expect(screen.getByText('other-user@example.com')).toBeInTheDocument()
        expect(screen.getByText('vor 5 Minuten')).toBeInTheDocument()
      })

      // Should offer conflict resolution options
      expect(screen.getByText('Änderungen zusammenführen')).toBeInTheDocument()
      expect(screen.getByText('Meine Version überschreiben')).toBeInTheDocument()
      expect(screen.getByText('Andere Version übernehmen')).toBeInTheDocument()
      expect(screen.getByText('Als neue Version speichern')).toBeInTheDocument()
    })

    it('should handle race conditions in entity selection', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'race-template',
            titel: 'Race Template',
            kontext_anforderungen: ['mieter', 'wohnung']
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock race condition: entities change while user is selecting
      let entityVersion = 1
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/mieter')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 'mieter-1',
              name: `Mieter v${entityVersion++}`,
              version: entityVersion - 1
            }])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select mieter
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Mieter v1'))

      // Simulate entity update in background
      await user.click(screen.getByText('Aktualisieren'))

      await waitFor(() => {
        expect(screen.getByText(/Entitäten wurden aktualisiert/)).toBeInTheDocument()
        expect(screen.getByText('Auswahl aktualisieren')).toBeInTheDocument()
      })
    })

    it('should handle session expiration during operations', async () => {
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

      // Mock session expiration
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Session expired',
          code: 'SESSION_EXPIRED',
          redirectUrl: '/auth/login'
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Session Test')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Sitzung abgelaufen/)).toBeInTheDocument()
        expect(screen.getByText('Daten lokal speichern')).toBeInTheDocument()
        expect(screen.getByText('Neu anmelden')).toBeInTheDocument()
      })

      // Should offer to save work locally
      await user.click(screen.getByText('Daten lokal speichern'))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Daten gespeichert',
        description: 'Ihre Arbeit wurde lokal gespeichert und wird nach der Anmeldung wiederhergestellt.'
      })
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large template content', async () => {
      const user = userEvent.setup()

      const extremelyLargeContent = 'x'.repeat(1000000) // 1MB of content

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

      // Mock enhanced file editor with extremely large content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave(extremelyLargeContent)}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Extreme Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))

      // Should detect size limit
      await waitFor(() => {
        expect(screen.getByText(/Template-Inhalt ist zu groß/)).toBeInTheDocument()
        expect(screen.getByText(/Maximum: 100 KB/)).toBeInTheDocument()
        expect(screen.getByText('Inhalt komprimieren')).toBeInTheDocument()
      })
    })

    it('should handle empty or whitespace-only content', async () => {
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

      // Mock enhanced file editor with whitespace-only content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('   \n\n\t   ')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Empty Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Template-Inhalt ist leer/)).toBeInTheDocument()
        expect(screen.getByText('Möchten Sie ein leeres Template erstellen?')).toBeInTheDocument()
      })
    })

    it('should handle special characters and encoding issues', async () => {
      const user = userEvent.setup()

      const specialCharContent = '🎉 Émojis and spëcial chäractërs: @mieter.name 中文 العربية'

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'special-char-template',
            titel: 'Special Characters Template',
            inhalt: specialCharContent,
            kategorie: 'mail',
            kontext_anforderungen: ['mieter']
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity with special characters
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'mieter-1',
          name: 'José María González-Pérez'
        }])
      })

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: '🎉 Émojis and spëcial chäractërs: José María González-Pérez 中文 العربية',
        unresolvedPlaceholders: [],
        success: true
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('José María González-Pérez'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/José María González-Pérez/)).toBeInTheDocument()
        expect(screen.getByText(/🎉/)).toBeInTheDocument()
      })
    })

    it('should handle circular placeholder references', async () => {
      const user = userEvent.setup()

      const circularTemplate = {
        id: 'circular-template',
        titel: 'Circular Template',
        inhalt: '@mieter.name lives at @wohnung.mieter_name', // Circular reference
        kategorie: 'mail',
        kontext_anforderungen: ['mieter', 'wohnung']
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: circularTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock processor detecting circular reference
      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Processing failed due to circular reference',
        unresolvedPlaceholders: ['@wohnung.mieter_name'],
        success: false,
        errors: ['Circular placeholder reference detected: @wohnung.mieter_name → @mieter.name']
      })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'mieter-1', name: 'Test Mieter' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'wohnung-1', name: 'Test Wohnung' }])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Test Mieter'))

      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Zirkuläre Referenz erkannt/)).toBeInTheDocument()
        expect(screen.getByText('@wohnung.mieter_name → @mieter.name')).toBeInTheDocument()
      })
    })
  })
})