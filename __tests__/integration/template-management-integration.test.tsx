import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateClientService } from '@/lib/template-client-service'
import type { Template } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock confirm dialog
const mockConfirm = jest.fn()
global.confirm = mockConfirm

// Comprehensive mock template data for integration testing
const mockTemplates: Template[] = [
  {
    id: 'template-1',
    titel: 'Mietvertrag Standard',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Standard Mietvertrag für Wohnungen' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse', 'miete'],
    aktualisiert_am: '2024-01-20T15:30:00Z',
  },
  {
    id: 'template-2',
    titel: 'Mietvertrag Premium',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Premium Mietvertrag mit erweiterten Klauseln' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-16T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse', 'miete', 'extras'],
    aktualisiert_am: null,
  },
  {
    id: 'template-3',
    titel: 'Kündigung Mieter',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Kündigungsschreiben für Mieter' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-17T10:00:00Z',
    kategorie: 'Kündigungen',
    kontext_anforderungen: ['mieter_name', 'kuendigungsgrund'],
    aktualisiert_am: null,
  },
  {
    id: 'template-4',
    titel: 'Kündigung Vermieter',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Kündigungsschreiben vom Vermieter' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-18T10:00:00Z',
    kategorie: 'Kündigungen',
    kontext_anforderungen: ['mieter_name', 'kuendigungsgrund', 'kuendigungsfrist'],
    aktualisiert_am: '2024-01-25T11:00:00Z',
  },
  {
    id: 'template-5',
    titel: 'Betriebskosten Abrechnung',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Jährliche Betriebskostenabrechnung' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-19T10:00:00Z',
    kategorie: 'Betriebskosten',
    kontext_anforderungen: ['mieter_name', 'zeitraum', 'kosten_details'],
    aktualisiert_am: null,
  },
  {
    id: 'template-6',
    titel: 'Mängelanzeige',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Anzeige von Mängeln in der Wohnung' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-20T10:00:00Z',
    kategorie: 'Mängel',
    kontext_anforderungen: ['mieter_name', 'mangel_beschreibung'],
    aktualisiert_am: null,
  },
]

describe('Template Management Integration Tests', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockTemplateService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

  const mockCloseModal = jest.fn()
  const mockOpenTemplateEditor = jest.fn()
  const mockGetAllTemplates = jest.fn()
  const mockDeleteTemplate = jest.fn()
  const mockCreateTemplate = jest.fn()
  const mockUpdateTemplate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockReturnValue(true)

    // Mock modal store
    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: mockCloseModal,
      openTemplateEditorModal: mockOpenTemplateEditor,
    } as any)

    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
    } as any)

    // Mock template service
    mockTemplateService.mockImplementation(() => ({
      getAllTemplates: mockGetAllTemplates,
      deleteTemplate: mockDeleteTemplate,
      createTemplate: mockCreateTemplate,
      updateTemplate: mockUpdateTemplate,
    } as any))

    mockGetAllTemplates.mockResolvedValue(mockTemplates)
    mockDeleteTemplate.mockResolvedValue(undefined)
    mockCreateTemplate.mockResolvedValue({ id: 'new-template' })
    mockUpdateTemplate.mockResolvedValue(undefined)
  })

  describe('Complete Template Loading Flow', () => {
    it('should load templates and display them grouped by category', async () => {
      render(<TemplatesManagementModal />)

      // Wait for templates to load
      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        // Should show all category headers
        expect(screen.getByText('Verträge')).toBeInTheDocument()
        expect(screen.getByText('Kündigungen')).toBeInTheDocument()
        expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
        expect(screen.getByText('Mängel')).toBeInTheDocument()

        // Should show template counts
        expect(screen.getByText('2 Vorlagen')).toBeInTheDocument() // Verträge
        expect(screen.getAllByText('1 Vorlage')).toHaveLength(3) // Other categories

        // Should show all templates
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Mieter')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vermieter')).toBeInTheDocument()
        expect(screen.getByText('Betriebskosten Abrechnung')).toBeInTheDocument()
        expect(screen.getByText('Mängelanzeige')).toBeInTheDocument()
      })
    })

    it('should handle loading errors and provide recovery options', async () => {
      const error = new Error('Network error')
      mockGetAllTemplates.mockRejectedValueOnce(error)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })

      // Test retry functionality
      mockGetAllTemplates.mockResolvedValueOnce(mockTemplates)
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      
      const user = userEvent.setup()
      await user.click(retryButton)

      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2)
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter Integration', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should perform real-time search across all template fields', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      
      // Search by title
      await user.type(searchInput, 'Mietvertrag')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Mieter')).not.toBeInTheDocument()
        expect(screen.queryByText('Betriebskosten Abrechnung')).not.toBeInTheDocument()
      })

      // Clear and search by category
      await user.clear(searchInput)
      await user.type(searchInput, 'Kündigung')

      await waitFor(() => {
        expect(screen.getByText('Kündigung Mieter')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vermieter')).toBeInTheDocument()
        expect(screen.queryByText('Mietvertrag Standard')).not.toBeInTheDocument()
      })

      // Search by content
      await user.clear(searchInput)
      await user.type(searchInput, 'Betriebskosten')

      await waitFor(() => {
        expect(screen.getByText('Betriebskosten Abrechnung')).toBeInTheDocument()
        expect(screen.queryByText('Mietvertrag Standard')).not.toBeInTheDocument()
      })
    })

    it('should filter by category and maintain search functionality', async () => {
      const user = userEvent.setup()

      // First filter by category
      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      
      const vertraegeOption = screen.getByText('Verträge (2)')
      await user.click(vertraegeOption)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Mieter')).not.toBeInTheDocument()
      })

      // Then search within the filtered category
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Premium')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.queryByText('Mietvertrag Standard')).not.toBeInTheDocument()
      })

      // Clear search should show all templates in the category again
      const clearButton = screen.getByRole('button', { name: /suche.*löschen/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
      })
    })

    it('should handle complex search scenarios', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')

      // Search with partial matches
      await user.type(searchInput, 'Miet')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Mieter')).not.toBeInTheDocument()
      })

      // Search with case insensitive
      await user.clear(searchInput)
      await user.type(searchInput, 'KÜNDIGUNG')

      await waitFor(() => {
        expect(screen.getByText('Kündigung Mieter')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vermieter')).toBeInTheDocument()
      })

      // Search with no results
      await user.clear(searchInput)
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /filter zurücksetzen/i })).toBeInTheDocument()
      })
    })
  })

  describe('Template CRUD Operations Integration', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should create new template and refresh the list', async () => {
      const user = userEvent.setup()

      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isNewTemplate: true,
          onSave: expect.any(Function),
          onCancel: expect.any(Function),
        })
      )

      // Simulate successful template creation
      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      await onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })

      expect(mockCreateTemplate).toHaveBeenCalledWith({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })

      // Should refresh the templates list
      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2)
      })
    })

    it('should edit existing template and refresh the list', async () => {
      const user = userEvent.setup()

      // Find and click edit button for first template
      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const editButton = within(firstCard).getByRole('button', { name: /bearbeiten/i })
      await user.click(editButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          isNewTemplate: false,
          initialTitle: 'Mietvertrag Standard',
          initialCategory: 'Verträge',
          onSave: expect.any(Function),
        })
      )

      // Simulate successful template update
      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      await onSaveCallback({
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Verträge',
        kontext_anforderungen: [],
      })

      expect(mockUpdateTemplate).toHaveBeenCalledWith('template-1', {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Verträge',
        kontext_anforderungen: [],
      })

      // Should refresh the templates list
      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2)
      })
    })

    it('should delete template with confirmation and update the list', async () => {
      const user = userEvent.setup()

      // Find the first template card and open its dropdown menu
      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const moreButton = within(firstCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteMenuItem)

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Mietvertrag Standard')
      )

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalledWith('template-1')
      })

      // Template should be removed from local state immediately
      await waitFor(() => {
        expect(screen.queryByText('Mietvertrag Standard')).not.toBeInTheDocument()
      })
    })

    it('should handle CRUD operation errors gracefully', async () => {
      const user = userEvent.setup()

      // Test create error
      mockCreateTemplate.mockRejectedValueOnce(new Error('Create failed'))

      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      
      await expect(onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })).rejects.toThrow('Create failed')

      // Test delete error
      mockDeleteTemplate.mockRejectedValueOnce(new Error('Delete failed'))

      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const moreButton = within(firstCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteMenuItem)

      // Template should still be visible since deletion failed
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })
  })

  describe('User Workflow Integration', () => {
    it('should support complete user workflow: search -> filter -> edit -> create', async () => {
      const user = userEvent.setup()
      
      render(<TemplatesManagementModal />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      // Step 1: Search for specific templates
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Mietvertrag')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Premium')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Mieter')).not.toBeInTheDocument()
      })

      // Step 2: Apply category filter
      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      const vertraegeOption = screen.getByText('Verträge (2)')
      await user.click(vertraegeOption)

      // Step 3: Edit a template
      const editButton = screen.getAllByRole('button', { name: /bearbeiten/i })[0]
      await user.click(editButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isNewTemplate: false,
          templateId: expect.any(String),
        })
      )

      // Step 4: Create new template
      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isNewTemplate: true,
          initialCategory: 'Verträge', // Should use current filter as initial category
        })
      )
    })

    it('should maintain state consistency across operations', async () => {
      const user = userEvent.setup()
      
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      // Apply search and filter
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Miet')

      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      const vertraegeOption = screen.getByText('Verträge (2)')
      await user.click(vertraegeOption)

      // Perform delete operation
      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const moreButton = within(firstCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteMenuItem)

      // Search and filter should still be active
      expect(searchInput).toHaveValue('Miet')
      expect(screen.getByDisplayValue('Verträge')).toBeInTheDocument()

      // Results should be updated accordingly
      await waitFor(() => {
        // One template should be removed, but filter/search should persist
        const remainingCards = screen.getAllByRole('article')
        expect(remainingCards).toHaveLength(1)
      })
    })
  })

  describe('Performance and Accessibility Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeTemplateSet = Array.from({ length: 200 }, (_, i) => ({
        id: `template-${i}`,
        titel: `Template ${i}`,
        inhalt: { type: 'doc', content: [] },
        user_id: 'test-user',
        erstellungsdatum: '2024-01-15T10:00:00Z',
        kategorie: `Category ${i % 10}`,
        kontext_anforderungen: [],
        aktualisiert_am: null,
      }))

      mockGetAllTemplates.mockResolvedValue(largeTemplateSet)

      const startTime = performance.now()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Template 0')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(2000)

      // Search should still be performant
      const user = userEvent.setup()
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      
      const searchStartTime = performance.now()
      await user.type(searchInput, 'Template 1')
      
      await waitFor(() => {
        expect(screen.getByText('Template 1')).toBeInTheDocument()
      })
      
      const searchEndTime = performance.now()
      const searchTime = searchEndTime - searchStartTime

      // Search should be responsive
      expect(searchTime).toBeLessThan(1000)
    })

    it('should maintain accessibility throughout user interactions', async () => {
      const user = userEvent.setup()
      
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      // Check initial accessibility
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')

      // Search should maintain accessibility
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      expect(searchInput).toHaveAttribute('aria-label')
      
      await user.type(searchInput, 'test')

      // Results should be announced
      await waitFor(() => {
        const liveRegion = screen.getByRole('region', { name: /suchergebnisse/i })
        expect(liveRegion).toBeInTheDocument()
      })

      // Category filter should be accessible
      const categoryFilter = screen.getByRole('combobox')
      expect(categoryFilter).toHaveAttribute('aria-expanded')

      await user.click(categoryFilter)
      expect(categoryFilter).toHaveAttribute('aria-expanded', 'true')

      // Template cards should have proper accessibility
      const templateCards = screen.getAllByRole('article')
      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby')
        expect(card).toHaveAttribute('aria-describedby')
      })
    })
  })
})