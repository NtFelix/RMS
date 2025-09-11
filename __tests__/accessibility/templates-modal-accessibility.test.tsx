import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateClientService } from '@/lib/template-client-service'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockTemplateClientService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

// Mock template data
const mockTemplates = [
  {
    id: '1',
    titel: 'Mietvertrag Vorlage',
    kategorie: 'Verträge',
    inhalt: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mietvertrag Inhalt' }] }] },
    erstellungsdatum: '2024-01-01',
    aktualisiert_am: '2024-01-02',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse']
  },
  {
    id: '2',
    titel: 'Kündigung Vorlage',
    kategorie: 'Kündigungen',
    inhalt: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kündigung Inhalt' }] }] },
    erstellungsdatum: '2024-01-03',
    aktualisiert_am: null,
    kontext_anforderungen: ['kuendigungsgrund']
  }
]

describe('TemplatesManagementModal Accessibility', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com'
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: jest.fn(),
      openTemplateEditorModal: jest.fn()
    })

    // Mock TemplateClientService
    const mockServiceInstance = {
      getUserTemplates: jest.fn().mockResolvedValue(mockTemplates),
      deleteTemplate: jest.fn().mockResolvedValue(undefined),
      createTemplate: jest.fn().mockResolvedValue({ id: '3' }),
      updateTemplate: jest.fn().mockResolvedValue(undefined)
    }
    mockTemplateClientService.mockImplementation(() => mockServiceInstance)
  })

  describe('ARIA Labels and Descriptions', () => {
    test('should have proper ARIA labels on modal elements', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'templates-modal-title')
      expect(modal).toHaveAttribute('aria-describedby', 'templates-modal-description')

      expect(screen.getByText('Vorlagen verwalten')).toHaveAttribute('id', 'templates-modal-title')
      expect(screen.getByText(/Modal zum Verwalten Ihrer Dokumentvorlagen/)).toHaveAttribute('id', 'templates-modal-description')
    })

    test('should have proper ARIA labels on search input', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveAttribute('aria-describedby', 'search-help-text search-results-count')
      expect(screen.getByText(/Geben Sie Suchbegriffe ein/)).toHaveAttribute('id', 'search-help-text')
    })

    test('should have proper ARIA labels on category filter', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const categoryFilter = screen.getByRole('combobox')
      expect(categoryFilter).toHaveAttribute('aria-label', 'Kategorie auswählen')
      expect(categoryFilter).toHaveAttribute('aria-describedby', 'category-filter-help')
    })

    test('should have proper ARIA labels on template cards', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument()
      })

      const templateCard = screen.getByRole('article')
      expect(templateCard).toHaveAttribute('aria-labelledby', 'template-title-1')
      expect(templateCard).toHaveAttribute('aria-describedby', 'template-description-1')
    })
  })

  describe('Keyboard Navigation', () => {
    test('should support Tab navigation through modal elements', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      // Search input should be focused initially
      expect(screen.getByRole('searchbox')).toHaveFocus()

      // Tab to category filter
      await user.tab()
      expect(screen.getByRole('combobox')).toHaveFocus()

      // Tab to create button
      await user.tab()
      expect(screen.getByRole('button', { name: /Neue Vorlage erstellen/ })).toHaveFocus()

      // Tab to first template card button
      await user.tab()
      expect(screen.getByRole('button', { name: /Vorlage "Mietvertrag Vorlage" bearbeiten/ })).toHaveFocus()
    })

    test('should support Escape key to close modal', async () => {
      const mockClose = jest.fn()
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: true,
        closeTemplatesManagementModal: mockClose,
        openTemplateEditorModal: jest.fn()
      })

      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      expect(mockClose).toHaveBeenCalled()
    })

    test('should support Enter key on interactive elements', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Neue Vorlage erstellen/ })).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Neue Vorlage erstellen/ })
      createButton.focus()
      
      await user.keyboard('{Enter}')
      
      // Should open template editor modal
      expect(mockUseModalStore().openTemplateEditorModal).toHaveBeenCalled()
    })

    test('should trap focus within modal', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Get all focusable elements
      const searchInput = screen.getByRole('searchbox')
      const closeButton = screen.getByRole('button', { name: /Modal schließen/ })

      // Focus should start on search input
      expect(searchInput).toHaveFocus()

      // Shift+Tab from first element should go to last element
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(closeButton).toHaveFocus()

      // Tab from last element should go to first element
      await user.tab()
      expect(searchInput).toHaveFocus()
    })
  })

  describe('Screen Reader Announcements', () => {
    test('should announce modal opening', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/Vorlagen-Modal geöffnet/)).toBeInTheDocument()
      })

      const announcement = screen.getByText(/Vorlagen-Modal geöffnet/)
      expect(announcement).toHaveAttribute('aria-live', 'polite')
    })

    test('should announce search results', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Mietvertrag')

      await waitFor(() => {
        expect(screen.getByText(/1 Suchergebnisse für "Mietvertrag"/)).toBeInTheDocument()
      })

      const searchResults = screen.getByText(/1 Suchergebnisse für "Mietvertrag"/)
      expect(searchResults).toHaveAttribute('aria-live', 'polite')
    })

    test('should announce loading states', async () => {
      // Mock loading state
      const mockServiceInstance = {
        getUserTemplates: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        deleteTemplate: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn()
      }
      mockTemplateClientService.mockImplementation(() => mockServiceInstance)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/Vorlagen werden geladen/)).toBeInTheDocument()
      })

      const loadingAnnouncement = screen.getByText(/Vorlagen werden geladen/)
      expect(loadingAnnouncement).toHaveAttribute('aria-live', 'polite')
    })

    test('should announce template deletion', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument()
      })

      // Open dropdown menu
      const moreButton = screen.getByRole('button', { name: /Aktionen für Vorlage Mietvertrag Vorlage/ })
      await user.click(moreButton)

      // Click delete
      const deleteButton = screen.getByRole('menuitem', { name: /Löschen/ })
      
      // Mock window.confirm
      window.confirm = jest.fn().mockReturnValue(true)
      
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/Vorlage "Mietvertrag Vorlage" wurde gelöscht/)).toBeInTheDocument()
      })
    })
  })

  describe('High Contrast Mode Support', () => {
    test('should apply high contrast styles when detected', () => {
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

      render(<TemplatesManagementModal />)

      // Check if high contrast class is applied
      expect(document.documentElement).toHaveClass('high-contrast')
    })

    test('should have sufficient color contrast in high contrast mode', async () => {
      // Mock high contrast mode
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

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('high-contrast-modal')
    })
  })

  describe('Accessibility Compliance', () => {
    test('should not have accessibility violations', async () => {
      const { container } = render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have proper heading hierarchy', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Main modal title should be h1 equivalent (DialogTitle)
      expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument()

      // Category headings should be h3
      await waitFor(() => {
        const categoryHeadings = screen.getAllByRole('heading', { level: 3 })
        expect(categoryHeadings.length).toBeGreaterThan(0)
      })
    })

    test('should have proper landmark roles', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Modal should have dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Search section should have search role
      expect(screen.getByRole('search')).toBeInTheDocument()

      // Main content should have main role
      expect(screen.getByRole('main')).toBeInTheDocument()

      // Template sections should have region roles
      await waitFor(() => {
        expect(screen.getByRole('region', { name: /Vorlagen-Liste/ })).toBeInTheDocument()
      })
    })

    test('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<TemplatesManagementModal />)

      // Check that animations are disabled or reduced
      const animatedElements = document.querySelectorAll('.animate-in, .transition-all')
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        // In reduced motion mode, animations should be very short or disabled
        expect(
          styles.animationDuration === '0.01ms' || 
          styles.transitionDuration === '0.01ms' ||
          styles.animationDuration === '0s' ||
          styles.transitionDuration === '0s'
        ).toBeTruthy()
      })
    })
  })

  describe('Touch and Mobile Accessibility', () => {
    test('should have minimum touch target sizes', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // All interactive elements should meet minimum 44px touch target
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height)
        const minWidth = parseInt(styles.minWidth) || parseInt(styles.width)
        
        expect(minHeight).toBeGreaterThanOrEqual(44)
        expect(minWidth).toBeGreaterThanOrEqual(44)
      })
    })

    test('should support touch interactions', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Neue Vorlage erstellen/ })).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Neue Vorlage erstellen/ })
      
      // Simulate touch interaction
      fireEvent.touchStart(createButton)
      fireEvent.touchEnd(createButton)
      
      expect(mockUseModalStore().openTemplateEditorModal).toHaveBeenCalled()
    })
  })

  describe('Error State Accessibility', () => {
    test('should announce errors with assertive priority', async () => {
      // Mock error state
      const mockServiceInstance = {
        getUserTemplates: jest.fn().mockRejectedValue(new Error('Network error')),
        deleteTemplate: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn()
      }
      mockTemplateClientService.mockImplementation(() => mockServiceInstance)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Vorlagen/)).toBeInTheDocument()
      })

      const errorAnnouncement = screen.getByText(/Fehler beim Laden der Vorlagen/)
      expect(errorAnnouncement).toHaveAttribute('aria-live', 'assertive')
    })

    test('should provide error recovery options', async () => {
      // Mock error state
      const mockServiceInstance = {
        getUserTemplates: jest.fn().mockRejectedValue(new Error('Network error')),
        deleteTemplate: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn()
      }
      mockTemplateClientService.mockImplementation(() => mockServiceInstance)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /Erneut versuchen/ })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).not.toBeDisabled()
    })
  })
})