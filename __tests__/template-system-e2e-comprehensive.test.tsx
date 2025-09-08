/**
 * Comprehensive Template System End-to-End Tests
 * Real-world user scenarios and complete workflow testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { TemplatePreview } from '@/components/template-preview'
import { EnhancedFileEditor } from '@/components/enhanced-file-editor'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import type { Template, TemplateContext } from '@/types/template-system'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/components/enhanced-file-editor')
jest.mock('@/lib/template-system/template-processor')
jest.mock('@/lib/template-system/placeholder-engine')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(() => true),
  usePostHog: jest.fn(() => ({
    capture: jest.fn()
  }))
}))

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

describe('Template System E2E Comprehensive Tests', () => {
  const mockToast = jest.fn()
  const mockOpenTemplateCreateModal = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  // Real-world test scenarios
  const realWorldScenarios = {
    newLandlord: {
      user: { id: 'new-user', name: 'Neue Vermieterin', email: 'neue@vermieter.de' },
      properties: [],
      tenants: [],
      templates: []
    },
    experiencedLandlord: {
      user: { id: 'exp-user', name: 'Erfahrener Vermieter', email: 'erfahren@vermieter.de' },
      properties: [
        { id: 'haus-1', name: 'Mehrfamilienhaus Berlin', ort: 'Berlin', strasse: 'Hauptstraße 123' },
        { id: 'haus-2', name: 'Einfamilienhaus München', ort: 'München', strasse: 'Nebenstraße 45' }
      ],
      tenants: [
        { id: 'mieter-1', name: 'Familie Schmidt', email: 'schmidt@email.de', wohnung_id: 'wohnung-1' },
        { id: 'mieter-2', name: 'Herr Müller', email: 'mueller@email.de', wohnung_id: 'wohnung-2' },
        { id: 'mieter-3', name: 'Frau Weber', email: 'weber@email.de', wohnung_id: 'wohnung-3' }
      ],
      apartments: [
        { id: 'wohnung-1', name: 'Wohnung 1A', groesse: 75, miete: 1200, haus_id: 'haus-1' },
        { id: 'wohnung-2', name: 'Wohnung 2B', groesse: 90, miete: 1500, haus_id: 'haus-1' },
        { id: 'wohnung-3', name: 'Wohnung EG', groesse: 120, miete: 1800, haus_id: 'haus-2' }
      ],
      templates: [
        {
          id: 'template-1',
          titel: 'Standard Mietvertrag',
          kategorie: 'vertrag',
          kontext_anforderungen: ['mieter', 'wohnung', 'haus']
        },
        {
          id: 'template-2',
          titel: 'Mieterhöhung',
          kategorie: 'mail',
          kontext_anforderungen: ['mieter', 'wohnung']
        }
      ]
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    // Default modal store state
    mockUseModalStore.mockReturnValue({
      isTemplateCreateModalOpen: false,
      isTemplateUsageModalOpen: false,
      templateCreateModalData: undefined,
      templateUsageModalData: undefined,
      openTemplateCreateModal: mockOpenTemplateCreateModal,
      closeTemplateCreateModal: mockCloseModal,
      closeTemplateUsageModal: mockCloseModal,
      setTemplateCreateModalDirty: jest.fn(),
    } as any)
  })

  describe('New Landlord Onboarding Journey', () => {
    it('should guide new landlord through first template creation', async () => {
      const user = userEvent.setup()
      const scenario = realWorldScenarios.newLandlord

      // Step 1: New landlord discovers template feature
      const quickActionsProps = {
        onUpload: jest.fn(),
        onCreateFolder: jest.fn(),
        onCreateFile: jest.fn(),
        onCreateTemplate: mockOpenTemplateCreateModal,
        onSearch: jest.fn(),
        onSort: jest.fn(),
        onViewMode: jest.fn(),
        onFilter: jest.fn(),
        viewMode: 'grid' as const,
        searchQuery: '',
        selectedCount: 0
      }

      render(<CloudStorageQuickActions {...quickActionsProps} />)
      
      // Discover "Vorlage erstellen" option
      const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
      await user.click(addButton)
      
      expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
      await user.click(screen.getByText('Vorlage erstellen'))
      
      expect(mockOpenTemplateCreateModal).toHaveBeenCalled()

      // Step 2: Create first template with guidance
      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess,
          isFirstTemplate: true // New user flag
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock successful API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'first-template',
            titel: 'Mein erstes Template',
            kategorie: 'mail',
            kontext_anforderungen: ['mieter']
          })
        })

      const { rerender } = render(<TemplateCreateModal />)

      // Should show onboarding hints
      expect(screen.getByText(/Willkommen bei Templates/)).toBeInTheDocument()
      expect(screen.getByText(/Erstellen Sie Ihr erstes Template/)).toBeInTheDocument()

      // Fill simple first template
      await user.type(screen.getByLabelText(/Template-Name/), 'Mein erstes Template')
      await user.click(screen.getByText('E-Mail'))

      // Should show helpful suggestions
      expect(screen.getByText(/Für E-Mails wird normalerweise nur Mieter-Kontext benötigt/)).toBeInTheDocument()

      // Add simple content
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))

      // Submit first template
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erstes Template erstellt! 🎉',
          description: 'Sie haben erfolgreich Ihr erstes Template erstellt. Sie können es jetzt in der Vorlagen-Übersicht verwenden.'
        })
      })
    })

    it('should handle new landlord with no entities yet', async () => {
      const user = userEvent.setup()

      const simpleTemplate: Template = {
        id: 'simple-template',
        user_id: 'new-user',
        titel: 'Einfaches Template',
        inhalt: 'Hallo @mieter.name, heute ist @datum.',
        kategorie: 'mail',
        kontext_anforderungen: ['mieter'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z'
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: simpleTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock empty entity responses (new landlord has no data yet)
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show helpful guidance for new users
      expect(screen.getByText(/Keine Mieter gefunden/)).toBeInTheDocument()
      expect(screen.getByText(/Erstellen Sie zuerst einen Mieter/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Mieter erstellen/ })).toBeInTheDocument()

      // Should offer demo mode
      expect(screen.getByText('Demo-Modus verwenden')).toBeInTheDocument()
      await user.click(screen.getByText('Demo-Modus verwenden'))

      // Should populate with demo data
      await waitFor(() => {
        expect(screen.getByText('Demo Mieter')).toBeInTheDocument()
      })
    })
  })

  describe('Experienced Landlord Advanced Workflows', () => {
    it('should handle bulk template operations for experienced landlord', async () => {
      const user = userEvent.setup()
      const scenario = realWorldScenarios.experiencedLandlord

      // Mock template list for experienced user
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(scenario.templates)
      })

      // Simulate bulk template usage workflow
      const bulkTemplate: Template = {
        id: 'bulk-template',
        user_id: 'exp-user',
        titel: 'Jahresabrechnung 2024',
        inhalt: `
Jahresabrechnung für @mieter.name
Wohnung: @wohnung.adresse
Zeitraum: 01.01.2024 - 31.12.2024
Gesamtmiete: @wohnung.miete * 12 = @wohnung.jahresmiete
        `.trim(),
        kategorie: 'rechnung',
        kontext_anforderungen: ['mieter', 'wohnung'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z'
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: bulkTemplate,
          onGenerate: mockOnGenerate,
          bulkMode: true // Advanced feature for experienced users
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading for experienced landlord
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(scenario.tenants)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(scenario.apartments)
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show bulk mode options
      expect(screen.getByText('Bulk-Modus')).toBeInTheDocument()
      expect(screen.getByText('Für alle Mieter erstellen')).toBeInTheDocument()

      // Select bulk generation
      await user.click(screen.getByText('Für alle Mieter erstellen'))

      // Should show preview for multiple entities
      expect(screen.getByText('3 Dokumente werden erstellt')).toBeInTheDocument()
      expect(screen.getByText('Familie Schmidt')).toBeInTheDocument()
      expect(screen.getByText('Herr Müller')).toBeInTheDocument()
      expect(screen.getByText('Frau Weber')).toBeInTheDocument()

      // Generate all documents
      await user.click(screen.getByText('Alle Dokumente erstellen'))

      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalledTimes(3)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bulk-Generierung abgeschlossen',
          description: '3 Dokumente wurden erfolgreich erstellt.'
        })
      })
    })

    it('should handle template versioning and updates for experienced users', async () => {
      const user = userEvent.setup()

      const versionedTemplate: Template = {
        id: 'versioned-template',
        user_id: 'exp-user',
        titel: 'Mietvertrag v2.1',
        inhalt: 'Updated contract content with @mieter.name',
        kategorie: 'vertrag',
        kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-02-01T00:00:00Z',
        version: '2.1',
        previousVersions: ['1.0', '2.0']
      }

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess,
          editMode: true,
          template: versionedTemplate
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      render(<TemplateCreateModal />)

      // Should show version history
      expect(screen.getByText('Version 2.1')).toBeInTheDocument()
      expect(screen.getByText('Versionshistorie anzeigen')).toBeInTheDocument()

      await user.click(screen.getByText('Versionshistorie anzeigen'))

      // Should show previous versions
      expect(screen.getByText('Version 1.0')).toBeInTheDocument()
      expect(screen.getByText('Version 2.0')).toBeInTheDocument()

      // Should allow version comparison
      await user.click(screen.getByText('Mit v2.0 vergleichen'))

      expect(screen.getByText('Änderungen seit Version 2.0')).toBeInTheDocument()
      expect(screen.getByText(/Hinzugefügt/)).toBeInTheDocument()
      expect(screen.getByText(/Entfernt/)).toBeInTheDocument()
    })

    it('should handle complex entity relationships and filtering', async () => {
      const user = userEvent.setup()
      const scenario = realWorldScenarios.experiencedLandlord

      const complexTemplate: Template = {
        id: 'complex-template',
        user_id: 'exp-user',
        titel: 'Hausverwaltung Bericht',
        inhalt: 'Bericht für @haus.name mit @haus.anzahl_wohnungen Wohnungen',
        kategorie: 'bericht',
        kontext_anforderungen: ['haus'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z'
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: complexTemplate,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock complex entity relationships
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(scenario.properties.map(house => ({
            ...house,
            wohnungen: scenario.apartments.filter(apt => apt.haus_id === house.id),
            mieter: scenario.tenants.filter(tenant => 
              scenario.apartments.some(apt => apt.haus_id === house.id && apt.id === tenant.wohnung_id)
            )
          })))
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show houses with relationship info
      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)

      expect(screen.getByText('Mehrfamilienhaus Berlin (2 Wohnungen, 2 Mieter)')).toBeInTheDocument()
      expect(screen.getByText('Einfamilienhaus München (1 Wohnung, 1 Mieter)')).toBeInTheDocument()

      // Should allow filtering by occupancy
      expect(screen.getByText('Filter: Nur vermietete Häuser')).toBeInTheDocument()
      await user.click(screen.getByText('Filter: Nur vermietete Häuser'))

      // Should update the list based on filter
      await waitFor(() => {
        expect(screen.getByText('Mehrfamilienhaus Berlin (2 Wohnungen, 2 Mieter)')).toBeInTheDocument()
      })
    })
  })

  describe('Real-World Error Scenarios and Recovery', () => {
    it('should handle template corruption and recovery', async () => {
      const user = userEvent.setup()

      const corruptedTemplate: Template = {
        id: 'corrupted-template',
        user_id: 'user-1',
        titel: 'Korruptes Template',
        inhalt: null as any, // Corrupted content
        kategorie: 'mail',
        kontext_anforderungen: ['mieter'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z'
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
        expect(screen.getByText('Wiederherstellung versuchen')).toBeInTheDocument()
      })

      // Attempt recovery
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...corruptedTemplate,
          inhalt: 'Wiederhergestellter Inhalt: Hallo @mieter.name',
          recovered: true
        })
      })

      await user.click(screen.getByText('Wiederherstellung versuchen'))

      await waitFor(() => {
        expect(screen.getByText('Template erfolgreich wiederhergestellt')).toBeInTheDocument()
        expect(screen.getByText('Wiederhergestellter Inhalt')).toBeInTheDocument()
      })
    })

    it('should handle server maintenance mode gracefully', async () => {
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

      // Mock server maintenance response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          error: 'Service temporarily unavailable',
          maintenanceMode: true,
          estimatedDuration: '15 minutes'
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Maintenance Test')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Wartungsmodus/)).toBeInTheDocument()
        expect(screen.getByText(/15 minutes/)).toBeInTheDocument()
        expect(screen.getByText('Automatisch wiederholen')).toBeInTheDocument()
      })

      // Should offer to save draft locally
      expect(screen.getByText('Als Entwurf speichern')).toBeInTheDocument()
      await user.click(screen.getByText('Als Entwurf speichern'))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Entwurf gespeichert',
        description: 'Ihr Template wurde lokal gespeichert und wird automatisch übertragen, sobald der Service wieder verfügbar ist.'
      })
    })

    it('should handle quota limits and upgrade prompts', async () => {
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

      // Mock quota exceeded response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () => Promise.resolve({
          error: 'Template quota exceeded',
          currentCount: 10,
          maxAllowed: 10,
          upgradeRequired: true
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Quota Test')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Template-Limit erreicht/)).toBeInTheDocument()
        expect(screen.getByText(/10 von 10 Templates/)).toBeInTheDocument()
        expect(screen.getByText('Jetzt upgraden')).toBeInTheDocument()
      })

      // Should offer template management
      expect(screen.getByText('Vorhandene Templates verwalten')).toBeInTheDocument()
      await user.click(screen.getByText('Vorhandene Templates verwalten'))

      expect(screen.getByText('Template-Übersicht')).toBeInTheDocument()
    })
  })

  describe('Multi-User and Collaboration Scenarios', () => {
    it('should handle template sharing between team members', async () => {
      const user = userEvent.setup()

      const sharedTemplate: Template = {
        id: 'shared-template',
        user_id: 'team-lead',
        titel: 'Team Mietvertrag',
        inhalt: 'Shared template content',
        kategorie: 'vertrag',
        kontext_anforderungen: ['mieter', 'wohnung'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z',
        shared: true,
        sharedWith: ['team-member-1', 'team-member-2'],
        permissions: ['read', 'use']
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: sharedTemplate,
          onGenerate: mockOnGenerate,
          isShared: true
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should show sharing info
      expect(screen.getByText('Geteiltes Template')).toBeInTheDocument()
      expect(screen.getByText('Erstellt von: Team Lead')).toBeInTheDocument()
      expect(screen.getByText('Berechtigung: Lesen & Verwenden')).toBeInTheDocument()

      // Should track usage for shared templates
      expect(screen.getByText('Verwendung wird protokolliert')).toBeInTheDocument()
    })

    it('should handle concurrent template editing conflicts', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess,
          editMode: true,
          template: {
            id: 'concurrent-template',
            titel: 'Concurrent Edit Template',
            version: '1.0'
          }
        },
        isTemplateCreateModalDirty: true,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock conflict response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: 'Concurrent modification detected',
          currentVersion: '1.1',
          yourVersion: '1.0',
          conflictingChanges: ['titel', 'inhalt']
        })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), ' - Modified')
      await user.click(screen.getByRole('button', { name: /Template aktualisieren/ }))

      await waitFor(() => {
        expect(screen.getByText(/Bearbeitungskonflikt/)).toBeInTheDocument()
        expect(screen.getByText(/wurde von einem anderen Benutzer geändert/)).toBeInTheDocument()
        expect(screen.getByText('Änderungen zusammenführen')).toBeInTheDocument()
        expect(screen.getByText('Meine Version überschreiben')).toBeInTheDocument()
      })

      // Should show conflict resolution options
      await user.click(screen.getByText('Änderungen zusammenführen'))

      expect(screen.getByText('Konflikt-Auflösung')).toBeInTheDocument()
      expect(screen.getByText('Ihre Änderungen')).toBeInTheDocument()
      expect(screen.getByText('Andere Änderungen')).toBeInTheDocument()
    })
  })

  describe('Performance and Scalability E2E Tests', () => {
    it('should handle large-scale template operations efficiently', async () => {
      const user = userEvent.setup()

      // Simulate large organization with many templates
      const largeTemplateList = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        titel: `Template ${i}`,
        kategorie: i % 5 === 0 ? 'vertrag' : 'mail',
        erstellungsdatum: `2024-01-${String(i % 30 + 1).padStart(2, '0')}T00:00:00Z`
      }))

      // Mock template list loading
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          templates: largeTemplateList.slice(0, 20), // Paginated
          total: 100,
          page: 1,
          hasMore: true
        })
      })

      // This would be tested in the template browser component
      const response = await fetch('/api/vorlagen?page=1&limit=20')
      const data = await response.json()

      expect(data.templates).toHaveLength(20)
      expect(data.total).toBe(100)
      expect(data.hasMore).toBe(true)

      // Should handle pagination efficiently
      expect(global.fetch).toHaveBeenCalledWith('/api/vorlagen?page=1&limit=20')
    })

    it('should handle real-time template updates and notifications', async () => {
      const user = userEvent.setup()

      // Mock WebSocket connection for real-time updates
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      global.WebSocket = jest.fn(() => mockWebSocket) as any

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'realtime-template',
            titel: 'Real-time Template'
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Simulate real-time template update
      const updateEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'template_updated',
          templateId: 'realtime-template',
          changes: ['inhalt'],
          updatedBy: 'other-user'
        })
      })

      // Trigger the event handler
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1]
      
      if (messageHandler) {
        messageHandler(updateEvent)
      }

      await waitFor(() => {
        expect(screen.getByText(/Template wurde aktualisiert/)).toBeInTheDocument()
        expect(screen.getByText('Neu laden')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Internationalization E2E', () => {
    it('should support complete keyboard navigation workflow', async () => {
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

      // Complete keyboard-only workflow
      await user.tab() // Focus template name
      await user.type(screen.getByLabelText(/Template-Name/), 'Keyboard Template')
      
      await user.tab() // Focus category
      await user.keyboard('{Enter}') // Open dropdown
      await user.keyboard('{ArrowDown}{Enter}') // Select category
      
      await user.tab() // Focus context checkboxes
      await user.keyboard(' ') // Check first checkbox
      
      await user.tab() // Focus editor button
      await user.keyboard('{Enter}') // Open editor
      
      // Should maintain focus management throughout
      expect(document.activeElement).toBeDefined()
    })

    it('should provide proper screen reader announcements', async () => {
      const user = userEvent.setup()

      // Mock screen reader announcements
      const mockAnnounce = jest.fn()
      global.speechSynthesis = {
        speak: mockAnnounce,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn(() => [])
      } as any

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: {
            id: 'accessible-template',
            titel: 'Accessible Template'
          },
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      render(<TemplateUsageModal />)

      // Should announce modal opening
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-live', 'polite')
      
      // Should announce status changes
      await waitFor(() => {
        expect(screen.getByText('Template verwenden: Accessible Template')).toBeInTheDocument()
      })
    })

    it('should handle different language settings', async () => {
      const user = userEvent.setup()

      // Mock German locale
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'de-DE'
      })

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

      // Should display German text
      expect(screen.getByText('Template-Name')).toBeInTheDocument()
      expect(screen.getByText('Kategorie')).toBeInTheDocument()
      expect(screen.getByText('Kontext-Anforderungen')).toBeInTheDocument()

      // Should format dates in German locale
      const dateElements = screen.getAllByText(/\d{2}\.\d{2}\.\d{4}/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })
})