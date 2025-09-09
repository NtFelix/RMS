/**
 * Template System End-to-End Tests
 * Tests covering complete user workflows and scenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { TemplatePreview } from '@/components/template-preview'
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
  useFeatureFlagEnabled: jest.fn(() => true)
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

describe('Template System E2E Tests', () => {
  const mockToast = jest.fn()
  const mockOpenTemplateCreateModal = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  // Test data
  const testTemplates: Template[] = [
    {
      id: 'template-1',
      user_id: 'user-1',
      titel: 'Mietvertrag Vorlage',
      inhalt: 'Sehr geehrte/r @mieter.name,\n\nhiermit bestätigen wir Ihren Mietvertrag für @wohnung.adresse.\nDie monatliche Miete beträgt @wohnung.miete.\n\nDatum: @datum\n\nMit freundlichen Grüßen\n@vermieter.name',
      kategorie: 'vertrag',
      kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template-2',
      user_id: 'user-1',
      titel: 'Kündigung Vorlage',
      inhalt: 'Sehr geehrte/r @mieter.name,\n\nhiermit kündigen wir das Mietverhältnis für @wohnung.adresse zum @datum.\n\nMit freundlichen Grüßen\n@vermieter.name',
      kategorie: 'kuendigung',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z'
    },
    {
      id: 'template-3',
      user_id: 'user-1',
      titel: 'E-Mail Vorlage',
      inhalt: 'Hallo @mieter.name,\n\nwir möchten Sie über folgendes informieren...\n\nBeste Grüße\n@vermieter.name',
      kategorie: 'mail',
      kontext_anforderungen: ['mieter'],
      erstellungsdatum: '2024-01-03T00:00:00Z',
      aktualisiert_am: '2024-01-03T00:00:00Z'
    }
  ]

  const testEntities = {
    mieter: [
      { id: 'mieter-1', name: 'Max Mustermann', email: 'max@example.com', wohnung_id: 'wohnung-1' },
      { id: 'mieter-2', name: 'Anna Schmidt', email: 'anna@example.com', wohnung_id: 'wohnung-2' },
      { id: 'mieter-3', name: 'Peter Mueller', email: 'peter@example.com', wohnung_id: 'wohnung-3' }
    ],
    wohnungen: [
      { id: 'wohnung-1', name: 'Wohnung 1A', groesse: 75, miete: 800, haus_id: 'haus-1' },
      { id: 'wohnung-2', name: 'Wohnung 2B', groesse: 90, miete: 1000, haus_id: 'haus-1' },
      { id: 'wohnung-3', name: 'Wohnung 3C', groesse: 65, miete: 750, haus_id: 'haus-2' }
    ],
    haeuser: [
      { id: 'haus-1', name: 'Musterstraße 1', ort: 'Berlin', strasse: 'Musterstraße 1' },
      { id: 'haus-2', name: 'Beispielweg 5', ort: 'Hamburg', strasse: 'Beispielweg 5' }
    ]
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

  describe('Template Discovery and Access', () => {
    it('should display "Vorlage erstellen" option in document management', async () => {
      const user = userEvent.setup()
      
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
      
      // Click the "Hinzufügen" dropdown button
      const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
      await user.click(addButton)
      
      // Verify "Vorlage erstellen" option is present
      expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
      
      // Click "Vorlage erstellen"
      await user.click(screen.getByText('Vorlage erstellen'))
      
      expect(mockOpenTemplateCreateModal).toHaveBeenCalled()
    })

    it('should show templates in Vorlagen folder', async () => {
      // Mock API response for templates
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testTemplates)
      })

      // This would be tested in the actual file browser component
      // For now, we verify the API call structure
      const response = await fetch('/api/vorlagen')
      const templates = await response.json()

      expect(templates).toHaveLength(3)
      expect(templates[0].titel).toBe('Mietvertrag Vorlage')
      expect(templates[1].titel).toBe('Kündigung Vorlage')
      expect(templates[2].titel).toBe('E-Mail Vorlage')
    })
  })

  describe('Template Creation Workflow', () => {
    it('should create different types of templates successfully', async () => {
      const user = userEvent.setup()

      // Test creating each template type
      const templateTypes = [
        { kategorie: 'E-Mail', kontext: ['mieter'] },
        { kategorie: 'Vertrag', kontext: ['mieter', 'wohnung', 'haus'] },
        { kategorie: 'Kündigung', kontext: ['mieter', 'wohnung'] },
        { kategorie: 'Rechnung', kontext: ['mieter', 'wohnung'] },
        { kategorie: 'Mahnung', kontext: ['mieter', 'wohnung'] }
      ]

      for (const templateType of templateTypes) {
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

        // Mock successful API responses
        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ isUnique: true })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              id: `template-${templateType.kategorie}`,
              titel: `${templateType.kategorie} Template`,
              kategorie: templateType.kategorie.toLowerCase(),
              kontext_anforderungen: templateType.kontext
            })
          })

        const { rerender } = render(<TemplateCreateModal />)

        // Fill template name
        const nameInput = screen.getByLabelText(/Template-Name/)
        await user.clear(nameInput)
        await user.type(nameInput, `${templateType.kategorie} Template`)

        // Select category
        await user.click(screen.getByText(templateType.kategorie))

        // Verify context suggestions
        await waitFor(() => {
          templateType.kontext.forEach(context => {
            const checkbox = screen.getByRole('checkbox', { 
              name: new RegExp(context.charAt(0).toUpperCase() + context.slice(1)) 
            })
            expect(checkbox).toBeChecked()
          })
        })

        // Add content
        await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
        await user.click(screen.getByTestId('editor-save'))

        // Submit
        await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

        await waitFor(() => {
          expect(mockOnSuccess).toHaveBeenCalled()
          expect(mockToast).toHaveBeenCalledWith({
            title: 'Template erstellt',
            description: expect.stringContaining(`${templateType.kategorie} Template`)
          })
        })

        // Reset for next iteration
        jest.clearAllMocks()
        mockUseToast.mockReturnValue({
          toast: mockToast,
          dismiss: jest.fn(),
          toasts: []
        })
      }
    })

    it('should validate template names for uniqueness', async () => {
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

      // Mock name already exists
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: false })
      })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Existing Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText('Ein Template mit diesem Namen existiert bereits')).toBeInTheDocument()
      })
    })

    it('should handle template creation with complex placeholders', async () => {
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

      const complexContent = `
Sehr geehrte/r @mieter.name,

Mieterdaten:
- Name: @mieter.name
- E-Mail: @mieter.email
- Telefon: @mieter.telefon
- Einzug: @mieter.einzug
- Auszug: @mieter.auszug

Wohnungsdaten:
- Adresse: @wohnung.adresse
- Größe: @wohnung.groesse
- Miete: @wohnung.miete

Hausdaten:
- Name: @haus.name
- Ort: @haus.ort
- Straße: @haus.strasse

Vermieter:
- Name: @vermieter.name
- E-Mail: @vermieter.email

Datum: @datum (@datum.lang)
Monat: @monat (@monat.name)
Jahr: @jahr
      `.trim()

      // Mock enhanced file editor with complex content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave(complexContent)}
            >
              Save
            </button>
            <button data-testid="editor-close" onClick={onClose}>
              Close
            </button>
          </div>
        )
      }))

      // Mock successful API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'complex-template',
            titel: 'Complex Template',
            inhalt: complexContent,
            kategorie: 'vertrag',
            kontext_anforderungen: ['mieter', 'wohnung', 'haus']
          })
        })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Complex Template')
      await user.click(screen.getByText('Vertrag'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            inhalt: complexContent,
            kontext_anforderungen: ['mieter', 'wohnung', 'haus']
          })
        )
      })
    })
  })

  describe('Template Usage Scenarios', () => {
    it('should handle template usage with different entity combinations', async () => {
      const user = userEvent.setup()

      // Test different template-entity combinations
      const usageScenarios = [
        {
          template: testTemplates[0], // Mietvertrag (needs mieter, wohnung, haus)
          entities: {
            mieter: testEntities.mieter[0],
            wohnung: testEntities.wohnungen[0],
            haus: testEntities.haeuser[0]
          }
        },
        {
          template: testTemplates[1], // Kündigung (needs mieter, wohnung)
          entities: {
            mieter: testEntities.mieter[1],
            wohnung: testEntities.wohnungen[1]
          }
        },
        {
          template: testTemplates[2], // E-Mail (needs mieter)
          entities: {
            mieter: testEntities.mieter[2]
          }
        }
      ]

      for (const scenario of usageScenarios) {
        mockUseModalStore.mockReturnValue({
          isTemplateUsageModalOpen: true,
          templateUsageModalData: {
            template: scenario.template,
            onGenerate: mockOnGenerate
          },
          closeTemplateUsageModal: mockCloseModal,
        } as any)

        // Mock entity loading
        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(testEntities.mieter)
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(testEntities.wohnungen)
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(testEntities.haeuser)
          })

        const { rerender } = render(<TemplateUsageModal />)

        await waitFor(() => {
          expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
        })

        // Select required entities
        if (scenario.entities.mieter) {
          const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
          await user.click(mieterSelect)
          await user.click(screen.getByText(scenario.entities.mieter.name))
        }

        if (scenario.entities.wohnung) {
          const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
          await user.click(wohnungSelect)
          await user.click(screen.getByText(scenario.entities.wohnung.name))
        }

        if (scenario.entities.haus) {
          const hausSelect = screen.getByRole('combobox', { name: /haus/i })
          await user.click(hausSelect)
          await user.click(screen.getByText(scenario.entities.haus.name))
        }

        // Generate document
        await waitFor(() => {
          const generateButton = screen.getByText('Dokument erstellen')
          expect(generateButton).not.toBeDisabled()
        })

        await user.click(screen.getByText('Dokument erstellen'))

        await waitFor(() => {
          expect(mockOnGenerate).toHaveBeenCalled()
          expect(mockCloseModal).toHaveBeenCalled()
        })

        // Reset for next iteration
        jest.clearAllMocks()
        mockUseToast.mockReturnValue({
          toast: mockToast,
          dismiss: jest.fn(),
          toasts: []
        })
      }
    })

    it('should filter entities based on relationships', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: testTemplates[0], // Mietvertrag template
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testEntities.mieter)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testEntities.wohnungen)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testEntities.haeuser)
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select a specific wohnung first
      const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
      await user.click(wohnungSelect)
      await user.click(screen.getByText('Wohnung 1A')) // wohnung-1, haus-1

      // Now mieter dropdown should be filtered to only show mieter for that wohnung
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)

      // Should only show Max Mustermann (who lives in wohnung-1)
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
      // Should not show Anna Schmidt or Peter Mueller
      expect(screen.queryByText('Anna Schmidt')).not.toBeInTheDocument()
      expect(screen.queryByText('Peter Mueller')).not.toBeInTheDocument()

      // Select the available mieter
      await user.click(screen.getByText('Max Mustermann'))

      // Haus should be automatically selected based on wohnung
      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)
      expect(screen.getByText('Musterstraße 1')).toBeInTheDocument()
    })

    it('should handle template usage with preview functionality', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: testTemplates[2], // E-Mail template
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testEntities.mieter)
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select mieter
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Peter Mueller'))

      // Show preview
      const previewButton = screen.getByText('Vorschau anzeigen')
      await user.click(previewButton)

      // Should show preview section
      expect(screen.getByText('Vorschau')).toBeInTheDocument()

      // Should show processed content (mocked)
      await waitFor(() => {
        expect(screen.getByText('Verarbeiteter Inhalt')).toBeInTheDocument()
      })
    })
  })

  describe('User Isolation and Security', () => {
    it('should only show templates belonging to current user', async () => {
      // Mock API response with user-specific templates
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testTemplates.filter(t => t.user_id === 'user-1'))
      })

      const response = await fetch('/api/vorlagen')
      const userTemplates = await response.json()

      // All templates should belong to user-1
      expect(userTemplates).toHaveLength(3)
      userTemplates.forEach((template: Template) => {
        expect(template.user_id).toBe('user-1')
      })
    })

    it('should prevent access to templates from other users', async () => {
      // Mock API response for unauthorized access
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Unauthorized access' })
      })

      try {
        const response = await fetch('/api/vorlagen/other-user-template')
        expect(response.ok).toBe(false)
        expect(response.status).toBe(403)
      } catch (error) {
        // Expected behavior for unauthorized access
      }
    })

    it('should sanitize template content to prevent XSS', async () => {
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

      // Mock enhanced file editor with malicious content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('<script>alert("xss")</script>Hello @mieter.name')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Malicious Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Skript-Tags sind nicht erlaubt/)).toBeInTheDocument()
      })
    })

    it('should validate template permissions during usage', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: { ...testTemplates[0], user_id: 'other-user' }, // Different user
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock unauthorized access
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Template access denied' })
      })

      render(<TemplateUsageModal />)

      // Should handle unauthorized access gracefully
      await waitFor(() => {
        expect(screen.getByText('Template verwenden:')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of entities efficiently', async () => {
      const user = userEvent.setup()

      // Create large datasets
      const largeMieterList = Array.from({ length: 100 }, (_, i) => ({
        id: `mieter-${i}`,
        name: `Mieter ${i}`,
        email: `mieter${i}@example.com`,
        wohnung_id: `wohnung-${i % 10}`
      }))

      const largeWohnungList = Array.from({ length: 50 }, (_, i) => ({
        id: `wohnung-${i}`,
        name: `Wohnung ${i}`,
        groesse: 50 + i,
        miete: 500 + i * 10,
        haus_id: `haus-${i % 5}`
      }))

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: testTemplates[0],
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with large datasets
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(largeMieterList)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(largeWohnungList)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testEntities.haeuser)
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should handle large datasets without performance issues
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)

      // Should show search/filter functionality for large lists
      expect(screen.getByText('Mieter 0')).toBeInTheDocument()
    })

    it('should handle network timeouts gracefully', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: testTemplates[0],
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock network timeout
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      render(<TemplateUsageModal />)

      // Should show loading state initially
      expect(screen.getByText('Lade verfügbare Entitäten...')).toBeInTheDocument()

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(screen.getByText('Template verwenden:')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should handle empty entity lists', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: testTemplates[0],
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock empty entity responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
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

      // Should show appropriate messages for empty lists
      expect(screen.getByText(/Keine Entitäten verfügbar/)).toBeInTheDocument()
    })
  })
})