import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalStore } from '@/hooks/use-modal-store'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { templateProcessor } from '@/lib/template-system/template-processor'
import type { Template } from '@/types/template-system'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the template processor
jest.mock('@/lib/template-system/template-processor')
const mockTemplateProcessor = templateProcessor as jest.Mocked<typeof templateProcessor>

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock fetch
global.fetch = jest.fn()

const mockTemplate: Template = {
  id: 'test-template-1',
  user_id: 'user-1',
  titel: 'Test Template',
  inhalt: 'Hallo @mieter.name, Ihre Wohnung @wohnung.name ist bereit.',
  kategorie: 'mail',
  kontext_anforderungen: ['mieter', 'wohnung'],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-01T00:00:00Z'
}

const mockEntities = {
  mieter: [
    { id: 'mieter-1', name: 'Max Mustermann', email: 'max@example.com', wohnung_id: 'wohnung-1' },
    { id: 'mieter-2', name: 'Anna Schmidt', email: 'anna@example.com', wohnung_id: 'wohnung-2' }
  ],
  wohnungen: [
    { id: 'wohnung-1', name: 'Wohnung 1A', groesse: 75, miete: 800, haus_id: 'haus-1' },
    { id: 'wohnung-2', name: 'Wohnung 2B', groesse: 90, miete: 1000, haus_id: 'haus-1' }
  ],
  haeuser: [
    { id: 'haus-1', name: 'Musterstraße 1', ort: 'Berlin', strasse: 'Musterstraße 1' }
  ]
}

describe('TemplateUsageModal', () => {
  const mockCloseModal = jest.fn()
  const mockOnGenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock fetch responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntities.mieter)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntities.wohnungen)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntities.haeuser)
      })

    // Mock template processor
    mockTemplateProcessor.processTemplate.mockReturnValue({
      processedContent: 'Hallo Max Mustermann, Ihre Wohnung Wohnung 1A ist bereit.',
      unresolvedPlaceholders: [],
      success: true
    })

    mockTemplateProcessor.getUsedPlaceholders.mockReturnValue([
      { key: '@mieter.name', label: 'Mieter Name', description: 'Name des Mieters', category: 'mieter' },
      { key: '@wohnung.name', label: 'Wohnung Name', description: 'Name der Wohnung', category: 'wohnung' }
    ])

    // Mock modal store
    mockUseModalStore.mockReturnValue({
      isTemplateUsageModalOpen: true,
      templateUsageModalData: {
        template: mockTemplate,
        onGenerate: mockOnGenerate
      },
      closeTemplateUsageModal: mockCloseModal,
      // Add other required properties with default values
      isTenantModalOpen: false,
      isHouseModalOpen: false,
      // ... other modal states
    } as any)
  })

  it('renders template usage modal with template information', async () => {
    render(<TemplateUsageModal />)

    expect(screen.getByText('Template verwenden: Test Template')).toBeInTheDocument()
    expect(screen.getByText('mail')).toBeInTheDocument()
    expect(screen.getByText('mieter')).toBeInTheDocument()
    expect(screen.getByText('wohnung')).toBeInTheDocument()
  })

  it('loads available entities on modal open', async () => {
    render(<TemplateUsageModal />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/mieter')
      expect(global.fetch).toHaveBeenCalledWith('/api/wohnungen')
      expect(global.fetch).toHaveBeenCalledWith('/api/haeuser')
    })
  })

  it('shows loading state while entities are being loaded', () => {
    render(<TemplateUsageModal />)

    expect(screen.getByText('Lade verfügbare Entitäten...')).toBeInTheDocument()
  })

  it('displays context selection dropdowns for required contexts', async () => {
    render(<TemplateUsageModal />)

    await waitFor(() => {
      expect(screen.getByText('Mieter *')).toBeInTheDocument()
      expect(screen.getByText('Wohnung *')).toBeInTheDocument()
    })
  })

  it('validates required context selection', async () => {
    render(<TemplateUsageModal />)

    const generateButton = await screen.findByText('Dokument erstellen')
    
    // Button should be disabled when required contexts are not selected
    expect(generateButton).toBeDisabled()
  })

  it('enables generate button when all required contexts are selected', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Select mieter
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)
    await user.click(screen.getByText('Max Mustermann'))

    // Select wohnung
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    // Generate button should now be enabled
    const generateButton = screen.getByText('Dokument erstellen')
    await waitFor(() => {
      expect(generateButton).not.toBeDisabled()
    })
  })

  it('shows preview when preview button is clicked', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Click preview toggle
    const previewButton = screen.getByText('Vorschau anzeigen')
    await user.click(previewButton)

    expect(screen.getByText('Vorschau')).toBeInTheDocument()
  })

  it('processes template and shows preview content', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load and select contexts
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Select contexts (this would trigger template processing)
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)
    await user.click(screen.getByText('Max Mustermann'))

    // Show preview
    const previewButton = screen.getByText('Vorschau anzeigen')
    await user.click(previewButton)

    // Check if template processor was called
    await waitFor(() => {
      expect(mockTemplateProcessor.processTemplate).toHaveBeenCalled()
    })
  })

  it('shows validation errors for missing required contexts', async () => {
    render(<TemplateUsageModal />)

    await waitFor(() => {
      expect(screen.getByText(/Bitte wählen Sie folgende erforderliche Kontexte aus/)).toBeInTheDocument()
    })
  })

  it('calls onGenerate when document is created successfully', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Select required contexts
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)
    await user.click(screen.getByText('Max Mustermann'))

    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    // Wait for validation to pass
    await waitFor(() => {
      const generateButton = screen.getByText('Dokument erstellen')
      expect(generateButton).not.toBeDisabled()
    })

    // Click generate
    const generateButton = screen.getByText('Dokument erstellen')
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith('Hallo Max Mustermann, Ihre Wohnung Wohnung 1A ist bereit.')
      expect(mockCloseModal).toHaveBeenCalled()
    })
  })

  it('handles template processing errors gracefully', async () => {
    // Mock template processor to return error
    mockTemplateProcessor.processTemplate.mockReturnValue({
      processedContent: mockTemplate.inhalt,
      unresolvedPlaceholders: [],
      success: false,
      errors: ['Template processing failed']
    })

    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load and select contexts
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Select contexts
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)
    await user.click(screen.getByText('Max Mustermann'))

    // Show preview to trigger processing
    const previewButton = screen.getByText('Vorschau anzeigen')
    await user.click(previewButton)

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Verarbeitungsfehler')).toBeInTheDocument()
    })
  })

  it('shows unresolved placeholders warning', async () => {
    // Mock template processor to return unresolved placeholders
    mockTemplateProcessor.processTemplate.mockReturnValue({
      processedContent: 'Hallo [Mieter Name], Ihre Wohnung Wohnung 1A ist bereit.',
      unresolvedPlaceholders: ['@mieter.name'],
      success: true
    })

    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load and show preview
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    const previewButton = screen.getByText('Vorschau anzeigen')
    await user.click(previewButton)

    await waitFor(() => {
      expect(screen.getByText('Unaufgelöste Platzhalter:')).toBeInTheDocument()
      expect(screen.getByText('@mieter.name')).toBeInTheDocument()
    })
  })

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    const cancelButton = screen.getByText('Abbrechen')
    await user.click(cancelButton)

    expect(mockCloseModal).toHaveBeenCalled()
  })

  it('handles entity loading errors gracefully', async () => {
    // Mock fetch to fail
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<TemplateUsageModal />)

    await waitFor(() => {
      // Should handle the error gracefully and not crash
      expect(screen.getByText('Template verwenden: Test Template')).toBeInTheDocument()
    })
  })

  it('filters entities based on relationships', async () => {
    const user = userEvent.setup()
    render(<TemplateUsageModal />)

    // Wait for entities to load
    await waitFor(() => {
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
    })

    // Select a wohnung first
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    // Now mieter dropdown should be filtered to only show mieter for that wohnung
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)

    // Should only show Max Mustermann (who lives in wohnung-1)
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    // Anna Schmidt should not be visible as she lives in wohnung-2
    expect(screen.queryByText('Anna Schmidt')).not.toBeInTheDocument()
  })
})

describe('TemplateUsageModal Context Validation', () => {
  const mockCloseModal = jest.fn()
  const mockOnGenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock fetch responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })

    mockTemplateProcessor.processTemplate.mockReturnValue({
      processedContent: 'Test content',
      unresolvedPlaceholders: [],
      success: true
    })

    mockTemplateProcessor.getUsedPlaceholders.mockReturnValue([])
  })

  it('validates context requirements for mail template', () => {
    const mailTemplate: Template = {
      ...mockTemplate,
      kategorie: 'mail',
      kontext_anforderungen: ['mieter', 'mail']
    }

    mockUseModalStore.mockReturnValue({
      isTemplateUsageModalOpen: true,
      templateUsageModalData: {
        template: mailTemplate,
        onGenerate: mockOnGenerate
      },
      closeTemplateUsageModal: mockCloseModal,
    } as any)

    render(<TemplateUsageModal />)

    expect(screen.getByText('mieter')).toBeInTheDocument()
    expect(screen.getAllByText('mail')).toHaveLength(2) // One in category badge, one in requirements
  })

  it('validates context requirements for vertrag template', () => {
    const vertragTemplate: Template = {
      ...mockTemplate,
      kategorie: 'vertrag',
      kontext_anforderungen: ['mieter', 'wohnung', 'haus']
    }

    mockUseModalStore.mockReturnValue({
      isTemplateUsageModalOpen: true,
      templateUsageModalData: {
        template: vertragTemplate,
        onGenerate: mockOnGenerate
      },
      closeTemplateUsageModal: mockCloseModal,
    } as any)

    render(<TemplateUsageModal />)

    expect(screen.getByText('mieter')).toBeInTheDocument()
    expect(screen.getByText('wohnung')).toBeInTheDocument()
    expect(screen.getByText('haus')).toBeInTheDocument()
  })

  it('validates context requirements for kuendigung template', () => {
    const kuendigungTemplate: Template = {
      ...mockTemplate,
      kategorie: 'kuendigung',
      kontext_anforderungen: ['mieter', 'wohnung']
    }

    mockUseModalStore.mockReturnValue({
      isTemplateUsageModalOpen: true,
      templateUsageModalData: {
        template: kuendigungTemplate,
        onGenerate: mockOnGenerate
      },
      closeTemplateUsageModal: mockCloseModal,
    } as any)

    render(<TemplateUsageModal />)

    expect(screen.getByText('mieter')).toBeInTheDocument()
    expect(screen.getByText('wohnung')).toBeInTheDocument()
  })
})