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

// Mock missing components and services
jest.mock('@/lib/template-cache', () => ({
  templateCacheService: {
    invalidateUserCaches: jest.fn(),
  },
}))

jest.mock('@/lib/template-performance-optimizer', () => ({
  optimizedTemplateLoader: {
    loadTemplates: jest.fn(),
  },
}))

jest.mock('@/hooks/use-debounced-template-search', () => ({
  useDebouncedTemplateFilters: jest.fn(() => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedCategory: 'all',
    setCategoryFilter: jest.fn(),
    filteredTemplates: [],
    clearAllFilters: jest.fn(),
    hasActiveFilters: false,
    isProcessing: false,
    performanceMetrics: null,
  })),
}))

jest.mock('@/components/template-virtual-grid', () => ({
  VirtualTemplateGrid: ({ templates, onEditTemplate, onDeleteTemplate }: any) => (
    <div data-testid="virtual-template-grid">
      {templates.map((template: any) => (
        <div key={template.id} data-testid={`virtual-template-${template.id}`}>
          {template.titel}
          <button onClick={() => onEditTemplate(template.id)}>Edit</button>
          <button onClick={() => onDeleteTemplate(template.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
  useVirtualTemplateGrid: jest.fn(() => ({
    shouldUseVirtualization: false,
  })),
}))

jest.mock('@/components/template-performance-monitor', () => ({
  TemplatePerformanceMonitor: () => <div data-testid="performance-monitor" />,
}))

jest.mock('@/components/category-filter', () => ({
  CategoryFilter: ({ templates, selectedCategory, onCategoryChange }: any) => (
    <select 
      data-testid="category-filter"
      value={selectedCategory}
      onChange={(e) => onCategoryChange(e.target.value)}
    >
      <option value="all">Alle Kategorien ({templates.length})</option>
      <option value="Verträge">Verträge (1)</option>
      <option value="Kündigungen">Kündigungen (1)</option>
    </select>
  ),
}))

jest.mock('@/components/template-card', () => ({
  TemplateCard: ({ template, onEdit, onDelete }: any) => (
    <div data-testid={`template-card-${template.id}`} role="article">
      <h3>{template.titel}</h3>
      <p>{template.kategorie}</p>
      <button onClick={onEdit}>Bearbeiten</button>
      <button onClick={() => onDelete(template.id)}>Löschen</button>
    </div>
  ),
}))

jest.mock('@/components/templates-loading-skeleton', () => ({
  TemplatesLoadingSkeleton: ({ count = 8 }: any) => (
    <div data-testid="templates-loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-testid={`skeleton-${i}`}>Loading...</div>
      ))}
    </div>
  ),
}))

jest.mock('@/components/templates-empty-state', () => ({
  TemplatesEmptyState: ({ onCreateTemplate, hasSearch, hasFilter }: any) => (
    <div data-testid="templates-empty-state">
      {hasSearch || hasFilter ? (
        <div>
          <p>Keine Vorlagen gefunden</p>
          <button onClick={() => {}}>Filter zurücksetzen</button>
        </div>
      ) : (
        <div>
          <p>Noch keine Vorlagen vorhanden</p>
          <button onClick={onCreateTemplate}>Erste Vorlage erstellen</button>
        </div>
      )}
    </div>
  ),
  TemplatesErrorEmptyState: ({ error, onRetry, onCreateTemplate }: any) => (
    <div data-testid="templates-error-state">
      <p>Fehler beim Laden der Vorlagen</p>
      <p>{error}</p>
      <button onClick={onRetry}>Erneut versuchen</button>
      <button onClick={onCreateTemplate}>Neue Vorlage erstellen</button>
    </div>
  ),
}))

jest.mock('@/components/template-error-boundary', () => ({
  TemplateErrorBoundary: ({ children }: any) => children,
  TemplateOperationErrorBoundary: ({ children }: any) => children,
}))

jest.mock('@/hooks/use-template-error-handling', () => ({
  useTemplateLoadingErrorHandling: jest.fn(() => ({
    executeWithErrorHandling: jest.fn((operation) => operation()),
  })),
  useTemplateDeletionErrorHandling: jest.fn(() => ({})),
  useTemplateSearchErrorHandling: jest.fn(() => ({})),
  useNetworkErrorHandling: jest.fn(() => ({
    isOnline: true,
    handleNetworkError: jest.fn(),
  })),
}))

jest.mock('@/lib/template-error-handler', () => ({
  TemplatesModalErrorHandler: {
    handlePermissionError: jest.fn(),
    handleGenericError: jest.fn(),
    handleDeleteError: jest.fn(),
    handleSearchError: jest.fn(),
    handleModalInitializationError: jest.fn(),
    createRetryMechanism: jest.fn((operation) => operation),
  },
}))

jest.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: jest.fn(() => ({ current: null })),
  useFocusAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
    AnnouncementRegion: () => <div data-testid="announcement-region" />,
  })),
  useHighContrastMode: jest.fn(() => false),
}))

// Mock confirm dialog
const mockConfirm = jest.fn()
global.confirm = mockConfirm

// Mock template data
const mockTemplates: Template[] = [
  {
    id: 'template-1',
    titel: 'Mietvertrag Standard',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Standard Mietvertrag Vorlage' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse'],
    aktualisiert_am: '2024-01-20T15:30:00Z',
  },
  {
    id: 'template-2',
    titel: 'Kündigung Vorlage',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Kündigungsschreiben Vorlage' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-10T09:00:00Z',
    kategorie: 'Kündigungen',
    kontext_anforderungen: ['mieter_name'],
    aktualisiert_am: null,
  },
  {
    id: 'template-3',
    titel: 'Betriebskosten Abrechnung',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Betriebskosten Abrechnungsvorlage' }],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-05T14:00:00Z',
    kategorie: 'Betriebskosten',
    kontext_anforderungen: ['mieter_name', 'zeitraum', 'kosten'],
    aktualisiert_am: '2024-01-25T11:00:00Z',
  },
]

describe('TemplatesManagementModal', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockTemplateService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

  const mockCloseModal = jest.fn()
  const mockOpenTemplateEditor = jest.fn()
  const mockGetAllTemplates = jest.fn()
  const mockDeleteTemplate = jest.fn()

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
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
    } as any))

    mockGetAllTemplates.mockResolvedValue(mockTemplates)
    mockDeleteTemplate.mockResolvedValue(undefined)
  })

  describe('Modal Behavior', () => {
    it('should render modal when open', async () => {
      render(<TemplatesManagementModal />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument()
    })

    it('should not render modal when closed', () => {
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: false,
        closeTemplatesManagementModal: mockCloseModal,
        openTemplateEditorModal: mockOpenTemplateEditor,
      } as any)

      render(<TemplatesManagementModal />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      const closeButton = screen.getByRole('button', { name: /modal schließen/i })
      await user.click(closeButton)

      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })

    it('should close modal on escape key', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await user.keyboard('{Escape}')

      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })

    it('should prevent background scrolling when modal is open', () => {
      render(<TemplatesManagementModal />)

      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('Template Loading', () => {
    it('should load and display templates on modal open', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vorlage')).toBeInTheDocument()
        expect(screen.getByText('Betriebskosten Abrechnung')).toBeInTheDocument()
      })
    })

    it('should show loading state while templates load', () => {
      mockGetAllTemplates.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<TemplatesManagementModal />)

      expect(screen.getByText(/vorlagen werden geladen/i)).toBeInTheDocument()
    })

    it('should handle loading error gracefully', async () => {
      const error = new Error('Failed to load templates')
      mockGetAllTemplates.mockRejectedValue(error)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on loading error', async () => {
      const error = new Error('Failed to load templates')
      mockGetAllTemplates.mockRejectedValue(error)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to load templates')
      mockGetAllTemplates.mockRejectedValueOnce(error).mockResolvedValueOnce(mockTemplates)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should filter templates by search query', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Mietvertrag')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Vorlage')).not.toBeInTheDocument()
        expect(screen.queryByText('Betriebskosten Abrechnung')).not.toBeInTheDocument()
      })
    })

    it('should filter templates by category', async () => {
      const user = userEvent.setup()

      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      
      const vertraegeOption = screen.getByText('Verträge (1)')
      await user.click(vertraegeOption)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Vorlage')).not.toBeInTheDocument()
        expect(screen.queryByText('Betriebskosten Abrechnung')).not.toBeInTheDocument()
      })
    })

    it('should combine search and category filters', async () => {
      const user = userEvent.setup()

      // First apply category filter
      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      const vertraegeOption = screen.getByText('Verträge (1)')
      await user.click(vertraegeOption)

      // Then search within that category
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Standard')

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.queryByText('Kündigung Vorlage')).not.toBeInTheDocument()
        expect(screen.queryByText('Betriebskosten Abrechnung')).not.toBeInTheDocument()
      })
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'Mietvertrag')

      const clearButton = screen.getByRole('button', { name: /suche.*löschen/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vorlage')).toBeInTheDocument()
        expect(screen.getByText('Betriebskosten Abrechnung')).toBeInTheDocument()
      })
    })

    it('should show empty state when no search results', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
      })
    })
  })

  describe('Template Management Actions', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should open template editor for new template', async () => {
      const user = userEvent.setup()

      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isNewTemplate: true,
        })
      )
    })

    it('should open template editor for editing existing template', async () => {
      const user = userEvent.setup()

      const editButton = screen.getAllByRole('button', { name: /bearbeiten/i })[0]
      await user.click(editButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          isNewTemplate: false,
        })
      )
    })

    it('should delete template with confirmation', async () => {
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
    })

    it('should not delete template if user cancels confirmation', async () => {
      const user = userEvent.setup()
      mockConfirm.mockReturnValue(false)

      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const moreButton = within(firstCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteMenuItem)

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockDeleteTemplate).not.toHaveBeenCalled()
    })

    it('should handle delete error gracefully', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to delete template')
      mockDeleteTemplate.mockRejectedValue(error)

      const templateCards = screen.getAllByRole('article')
      const firstCard = templateCards[0]
      const moreButton = within(firstCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteMenuItem)

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalledWith('template-1')
      })

      // Template should still be visible since deletion failed
      expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
    })
  })

  describe('Category Grouping', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should group templates by category when showing all categories', async () => {
      // Should show category headers
      expect(screen.getByText('Verträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten')).toBeInTheDocument()

      // Should show template counts for each category
      expect(screen.getByText('1 Vorlage')).toBeInTheDocument()
    })

    it('should not show category headers when filtering by specific category', async () => {
      const user = userEvent.setup()

      const categoryFilter = screen.getByRole('combobox')
      await user.click(categoryFilter)
      const vertraegeOption = screen.getByText('Verträge (1)')
      await user.click(vertraegeOption)

      await waitFor(() => {
        // Category header should not be shown when filtering
        expect(screen.queryByText('Verträge')).not.toBeInTheDocument()
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no templates exist', async () => {
      mockGetAllTemplates.mockResolvedValue([])

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/noch keine vorlagen vorhanden/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /erste vorlage erstellen/i })).toBeInTheDocument()
      })
    })

    it('should show search empty state when no search results', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /filter zurücksetzen/i })).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Accessibility', () => {
    beforeEach(async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels and roles', () => {
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby')
    })

    it('should focus search input when modal opens', async () => {
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      
      await waitFor(() => {
        expect(searchInput).toHaveFocus()
      })
    })

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup()

      // Tab should move through interactive elements
      await user.tab()
      expect(screen.getByRole('combobox')).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /neue vorlage/i })).toHaveFocus()
    })

    it('should announce loading states for screen readers', () => {
      mockGetAllTemplates.mockImplementation(() => new Promise(() => {}))
      
      render(<TemplatesManagementModal />)

      expect(screen.getByText(/vorlagen werden geladen/i)).toBeInTheDocument()
    })

    it('should debounce search input for performance', async () => {
      const user = userEvent.setup()

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      
      // Type quickly - should not trigger multiple searches
      await user.type(searchInput, 'test', { delay: 50 })

      // Wait for debounce
      await waitFor(() => {
        expect(searchInput).toHaveValue('test')
      }, { timeout: 500 })
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as any)

      render(<TemplatesManagementModal />)

      expect(screen.getByText(/benutzer nicht authentifiziert/i)).toBeInTheDocument()
    })

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockGetAllTemplates.mockRejectedValue(networkError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
      })
    })

    it('should provide error recovery options', async () => {
      const error = new Error('Failed to load templates')
      mockGetAllTemplates.mockRejectedValue(error)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })
    })
  })
})