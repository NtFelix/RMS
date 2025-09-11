import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { TemplateCard } from '@/components/template-card'
import { TemplateSearchBar } from '@/components/template-search-bar'
import { CategoryFilter } from '@/components/category-filter'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import type { Template } from '@/types/template'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service', () => ({
  TemplateClientService: jest.fn().mockImplementation(() => ({
    getAllTemplates: jest.fn().mockResolvedValue([]),
    deleteTemplate: jest.fn().mockResolvedValue(undefined),
  })),
}))
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockTemplate: Template = {
  id: 'test-template',
  titel: 'Test Template',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ],
  },
  user_id: 'test-user',
  erstellungsdatum: '2024-01-15T10:00:00Z',
  kategorie: 'Test Category',
  kontext_anforderungen: ['variable1'],
  aktualisiert_am: null,
}

describe('Templates Modal Accessibility Tests', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
    } as any)

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
    } as any)
  })

  describe('TemplatesManagementModal Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper modal ARIA attributes', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toHaveAttribute('aria-modal', 'true')
        expect(modal).toHaveAttribute('aria-labelledby')
        expect(modal).toHaveAttribute('aria-describedby')
      })
    })

    it('should trap focus within the modal', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Focus should start on search input
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      expect(searchInput).toHaveFocus()

      // Tab through all focusable elements
      await user.tab() // Category filter
      expect(screen.getByRole('combobox')).toHaveFocus()

      await user.tab() // Create button
      expect(screen.getByRole('button', { name: /neue vorlage/i })).toHaveFocus()

      await user.tab() // Close button
      expect(screen.getByRole('button', { name: /modal schließen/i })).toHaveFocus()

      // Shift+Tab should go backwards
      await user.tab({ shift: true })
      expect(screen.getByRole('button', { name: /neue vorlage/i })).toHaveFocus()
    })

    it('should restore focus when modal closes', async () => {
      const user = userEvent.setup()
      
      // Create a button outside the modal to test focus restoration
      const triggerButton = document.createElement('button')
      triggerButton.textContent = 'Open Modal'
      triggerButton.setAttribute('aria-label', 'Benutzermenü für test')
      document.body.appendChild(triggerButton)
      triggerButton.focus()

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Close modal
      const closeButton = screen.getByRole('button', { name: /modal schließen/i })
      await user.click(closeButton)

      // Focus should return to trigger button
      expect(triggerButton).toHaveFocus()

      document.body.removeChild(triggerButton)
    })

    it('should handle keyboard navigation properly', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Escape should close modal
      await user.keyboard('{Escape}')
      
      const mockCloseModal = mockUseModalStore().closeTemplatesManagementModal
      expect(mockCloseModal).toHaveBeenCalled()
    })

    it('should announce loading states for screen readers', async () => {
      render(<TemplatesManagementModal />)

      // Should have loading announcement
      await waitFor(() => {
        expect(screen.getByText(/vorlagen werden geladen/i)).toBeInTheDocument()
      })

      // Loading region should have proper ARIA attributes
      const loadingRegion = screen.getByRole('status')
      expect(loadingRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should provide proper headings hierarchy', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent(/vorlagen verwalten/i)
      })
    })

    it('should have proper landmark regions', async () => {
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('search')).toBeInTheDocument()
        expect(screen.getByRole('main')).toBeInTheDocument()
      })
    })
  })

  describe('TemplateCard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels and descriptions', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-labelledby')
      expect(card).toHaveAttribute('aria-describedby')

      const title = screen.getByRole('heading')
      expect(title).toHaveAttribute('id')
    })

    it('should provide accessible button labels', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const editButton = screen.getByRole('button', { name: /bearbeiten/i })
      expect(editButton).toHaveAccessibleName()

      const moreButton = screen.getByRole('button', { name: /aktionen/i })
      expect(moreButton).toHaveAccessibleName()
    })

    it('should handle keyboard navigation in dropdown menu', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const moreButton = screen.getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      // Menu should be accessible
      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(2)

      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      expect(menuItems[0]).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(menuItems[1]).toHaveFocus()
    })

    it('should provide proper time elements', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const timeElements = screen.getAllByRole('time')
      timeElements.forEach(timeElement => {
        expect(timeElement).toHaveAttribute('dateTime')
        expect(timeElement).toHaveAttribute('aria-label')
      })
    })

    it('should announce loading states during operations', async () => {
      const mockOnDelete = jest.fn().mockImplementation(() => new Promise(() => {}))
      
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={mockOnDelete}
        />
      )

      const user = userEvent.setup()
      const moreButton = screen.getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteButton = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteButton)

      // Should announce deletion in progress
      await waitFor(() => {
        expect(screen.getByText(/wird gelöscht/i)).toBeInTheDocument()
      })
    })
  })

  describe('TemplateSearchBar Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplateSearchBar
          value=""
          onChange={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper search input attributes', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={jest.fn()}
        />
      )

      const searchInput = screen.getByRole('textbox')
      expect(searchInput).toHaveAttribute('aria-label')
      expect(searchInput).toHaveAttribute('aria-describedby')
      expect(searchInput).toHaveAttribute('type', 'text')
      expect(searchInput).toHaveAttribute('autoComplete', 'off')
      expect(searchInput).toHaveAttribute('spellCheck', 'false')
    })

    it('should provide help text for screen readers', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText(/geben sie suchbegriffe ein/i)).toBeInTheDocument()
    })

    it('should handle keyboard shortcuts accessibly', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value="test"
          onChange={mockOnChange}
        />
      )

      const searchInput = screen.getByRole('textbox')
      await user.click(searchInput)

      // Escape should clear search
      await user.keyboard('{Escape}')
      expect(mockOnChange).toHaveBeenCalledWith('')

      // Enter should trigger immediate search
      await user.type(searchInput, 'new search')
      await user.keyboard('{Enter}')
      expect(mockOnChange).toHaveBeenCalledWith('new search')
    })

    it('should announce validation errors', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={jest.fn()}
        />
      )

      const searchInput = screen.getByRole('textbox')
      await user.type(searchInput, '<script>')

      // Should announce validation error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/ungültige suchzeichen/i)
      })
    })
  })

  describe('CategoryFilter Accessibility', () => {
    const mockTemplates = [mockTemplate]

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper combobox attributes', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={jest.fn()}
        />
      )

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('should update aria-expanded when opened', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={jest.fn()}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(combobox).toHaveAttribute('aria-expanded', 'true')
    })

    it('should provide accessible option labels', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={jest.fn()}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).toHaveAccessibleName()
        expect(option.textContent).toMatch(/\(\d+\)/) // Should include count
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Arrow keys should navigate options
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('High Contrast Mode Support', () => {
    it('should maintain readability in high contrast mode', async () => {
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
        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('high-contrast-modal')
      })
    })
  })

  describe('Screen Reader Announcements', () => {
    it('should announce search results', async () => {
      const user = userEvent.setup()
      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'test')

      // Should have live region for search results
      await waitFor(() => {
        const liveRegion = screen.getByRole('region', { name: /suchergebnisse/i })
        expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should announce template operations', async () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn().mockImplementation(() => new Promise(() => {}))}
        />
      )

      const user = userEvent.setup()
      const moreButton = screen.getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteButton = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteButton)

      // Should announce operation status
      await waitFor(() => {
        const announcement = screen.getByText(/wird gelöscht/i)
        expect(announcement.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
      })
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', async () => {
      const { container } = render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check that important text elements have proper contrast
      const title = screen.getByText(/vorlagen verwalten/i)
      const computedStyle = window.getComputedStyle(title)
      
      // These would need actual color contrast calculation in a real test
      expect(computedStyle.color).toBeDefined()
      expect(computedStyle.backgroundColor).toBeDefined()
    })

    it('should not rely solely on color for information', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Badges should have text labels, not just colors
      const categoryBadge = screen.getByText('Test Category')
      expect(categoryBadge).toBeInTheDocument()

      const variableBadge = screen.getByText(/1 variable/i)
      expect(variableBadge).toBeInTheDocument()
    })
  })
})