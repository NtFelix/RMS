import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { TemplateClientService } from '@/lib/template-client-service'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/hooks/use-mobile')
jest.mock('@/lib/template-client-service')
jest.mock('@/components/template-virtual-grid', () => ({
  VirtualTemplateGrid: ({ templates, onEditTemplate, onDeleteTemplate }: any) => (
    <div data-testid="virtual-template-grid">
      {templates.map((template: any) => (
        <div key={template.id} role="article">
          <h3>{template.titel}</h3>
          <button onClick={() => onEditTemplate(template.id)}>Bearbeiten</button>
          <button onClick={() => onDeleteTemplate(template.id)}>Löschen</button>
        </div>
      ))}
    </div>
  ),
  useVirtualTemplateGrid: () => ({ shouldUseVirtualization: false })
}))
jest.mock('@/hooks/use-mobile-accessibility', () => ({
  useMobileAccessibility: () => ({
    announceToScreenReader: jest.fn()
  })
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>
const mockTemplateClientService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

// Mock templates data
const mockTemplates = [
  {
    id: '1',
    titel: 'Mietvertrag Vorlage',
    kategorie: 'Verträge',
    inhalt: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mietvertrag Inhalt' }] }] },
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-02T00:00:00Z',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse']
  },
  {
    id: '2',
    titel: 'Kündigung Vorlage',
    kategorie: 'Kündigungen',
    inhalt: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kündigung Inhalt' }] }] },
    erstellungsdatum: '2024-01-03T00:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['kuendigungsgrund']
  }
]

describe('TemplatesManagementModal - Mobile Responsive', () => {
  const mockCloseModal = jest.fn()
  const mockUser = { id: 'user-1', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: mockCloseModal,
      openTemplateEditorModal: jest.fn(),
    } as any)

    mockUseAuth.mockReturnValue({
      user: mockUser,
    } as any)

    mockTemplateClientService.prototype.getAllTemplates = jest.fn().mockResolvedValue(mockTemplates)
    mockTemplateClientService.prototype.deleteTemplate = jest.fn().mockResolvedValue(undefined)
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    test('should render full-screen modal on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('max-w-full', 'max-h-full', 'w-full', 'h-full', 'inset-0', 'rounded-none', 'border-0')
      })
    })

    test('should show compact header on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const title = screen.getByText('Vorlagen')
        expect(title).toBeInTheDocument()
        expect(title).toHaveClass('text-lg')
        
        // Badge should be hidden on mobile
        expect(screen.queryByText(/von/)).not.toBeInTheDocument()
      })
    })

    test('should stack search and filters vertically on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const searchSection = screen.getByLabelText('Suche und Filter')
        const searchContainer = searchSection.querySelector('[role="search"]')
        expect(searchContainer).toHaveClass('flex-col')
      })
    })

    test('should show mobile-optimized search placeholder', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Suchen...')
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveClass('h-11', 'text-base')
      })
    })

    test('should show icon-only create button on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const createButton = screen.getByLabelText('Neue Vorlage erstellen')
        expect(createButton).toBeInTheDocument()
        expect(createButton).toHaveClass('h-11')
        
        // Text should be screen reader only
        const hiddenText = createButton.querySelector('.sr-only')
        expect(hiddenText).toHaveTextContent('Neue Vorlage erstellen')
      })
    })

    test('should use single column grid on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCards = screen.getAllByRole('article')
        expect(templateCards).toHaveLength(2)
        
        // Grid should be single column
        const gridContainer = templateCards[0].parentElement
        expect(gridContainer).toHaveClass('grid-cols-1')
      })
    })

    test('should show mobile-optimized template cards', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCards = screen.getAllByRole('article')
        templateCards.forEach(card => {
          expect(card).toHaveClass('touch-manipulation')
          
          // Action button should be always visible on mobile
          const actionButton = card.querySelector('[aria-label*="Aktionen"]')
          expect(actionButton).toHaveClass('opacity-100', 'h-9', 'w-9')
        })
      })
    })

    test('should have larger touch targets on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const editButtons = screen.getAllByText('Bearbeiten')
        editButtons.forEach(button => {
          expect(button.closest('button')).toHaveClass('h-11', 'text-base', 'touch-manipulation')
        })
      })
    })

    test('should handle touch interactions properly', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCard = screen.getAllByRole('article')[0]
        expect(templateCard).toBeInTheDocument()
      })

      // Simulate touch interaction
      const editButton = screen.getAllByText('Bearbeiten')[0]
      await user.click(editButton)

      expect(mockUseModalStore().openTemplateEditorModal).toHaveBeenCalled()
    })

    test('should prevent zoom on input focus (iOS)', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const searchInput = screen.getByRole('searchbox')
        expect(searchInput).toHaveAttribute('inputMode', 'search')
        expect(searchInput).toHaveAttribute('enterKeyHint', 'search')
        expect(searchInput).toHaveClass('text-base') // Prevents zoom on iOS
      })
    })

    test('should show mobile-optimized dropdown menus', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const categoryFilter = screen.getByRole('combobox')
        expect(categoryFilter).toHaveClass('h-11')
      })

      // Open dropdown
      const categoryTrigger = screen.getByRole('combobox')
      await user.click(categoryTrigger)

      await waitFor(() => {
        const dropdownContent = screen.getByRole('listbox')
        expect(dropdownContent).toHaveClass('max-h-[60vh]')
        
        // Options should have larger touch targets
        const options = screen.getAllByRole('option')
        options.forEach(option => {
          expect(option).toHaveClass('py-3', 'text-base')
        })
      })
    })

    test('should handle virtual keyboard properly', () => {
      // Mock visualViewport API
      Object.defineProperty(window, 'visualViewport', {
        value: {
          height: 400, // Simulated keyboard open
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        writable: true
      })

      render(<TemplatesManagementModal />)

      // Check if keyboard handling is set up
      expect(window.visualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    test('should render standard modal size on desktop', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('max-w-[90vw]', 'max-h-[90vh]', 'rounded-lg')
        expect(modal).not.toHaveClass('max-w-full', 'inset-0', 'rounded-none')
      })
    })

    test('should show full header with badge on desktop', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const title = screen.getByText('Vorlagen verwalten')
        expect(title).toBeInTheDocument()
        expect(title).toHaveClass('text-xl', 'sm:text-2xl')
        
        // Badge should be visible
        expect(screen.getByText('2 von 2')).toBeInTheDocument()
      })
    })

    test('should show horizontal layout for search and filters on desktop', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const searchSection = screen.getByLabelText('Suche und Filter')
        const searchContainer = searchSection.querySelector('[role="search"]')
        expect(searchContainer).toHaveClass('flex-col', 'sm:flex-row')
      })
    })

    test('should use multi-column grid on desktop', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCards = screen.getAllByRole('article')
        const gridContainer = templateCards[0].parentElement
        expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
      })
    })

    test('should show hover effects on desktop', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCards = screen.getAllByRole('article')
        templateCards.forEach(card => {
          expect(card).toHaveClass('hover:shadow-md', 'hover:border-primary/20')
          expect(card).not.toHaveClass('touch-manipulation')
        })
      })
    })
  })

  describe('Accessibility on Mobile', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    test('should announce modal opening for mobile users', async () => {
      const mockAnnounce = jest.fn()
      
      // Mock the mobile accessibility hook
      jest.doMock('@/hooks/use-mobile-accessibility', () => ({
        useMobileAccessibility: () => ({
          announceToScreenReader: mockAnnounce
        })
      }))

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalledWith(
          expect.stringContaining('Wischen Sie nach links oder rechts'),
          'polite'
        )
      })
    })

    test('should have proper ARIA labels for mobile interactions', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toHaveAttribute('aria-modal', 'true')
        expect(modal).toHaveAttribute('aria-labelledby', 'templates-modal-title')
        expect(modal).toHaveAttribute('aria-describedby', 'templates-modal-description')
      })
    })

    test('should support screen reader navigation on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        // Check for screen reader only content
        const srOnlyElements = document.querySelectorAll('.sr-only')
        expect(srOnlyElements.length).toBeGreaterThan(0)
        
        // Check for proper live regions
        const liveRegions = document.querySelectorAll('[aria-live]')
        expect(liveRegions.length).toBeGreaterThan(0)
      })
    })

    test('should handle focus management on mobile', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const searchInput = screen.getByRole('searchbox')
        expect(document.activeElement).toBe(searchInput)
      })
    })
  })

  describe('Performance on Mobile', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    test('should use single column layout for better performance', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const templateCards = screen.getAllByRole('article')
        const gridContainer = templateCards[0].parentElement
        
        // Should only use single column on mobile
        expect(gridContainer).toHaveClass('grid-cols-1')
        expect(gridContainer).not.toHaveClass('sm:grid-cols-2', 'lg:grid-cols-3')
      })
    })

    test('should reduce motion for users who prefer it', () => {
      // Mock prefers-reduced-motion
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

      // Check if reduced motion class would be applied
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })
  })
})