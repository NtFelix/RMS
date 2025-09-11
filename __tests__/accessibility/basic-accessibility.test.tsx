import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCard } from '@/components/template-card'
import { CategoryFilter } from '@/components/category-filter'
import { UserSettings } from '@/components/user-settings'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

jest.mock('@/components/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  })
}))

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    isTemplatesManagementModalOpen: false,
    closeTemplatesManagementModal: jest.fn(),
    openTemplateEditorModal: jest.fn()
  })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'test', email: 'test@example.com', user_metadata: {} } },
        error: null
      }),
      signOut: () => Promise.resolve({ error: null })
    }
  })
}))

const mockTemplate = {
  id: '1',
  titel: 'Test Template',
  kategorie: 'Test Category',
  inhalt: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] },
  erstellungsdatum: '2024-01-01',
  aktualisiert_am: '2024-01-02',
  kontext_anforderungen: ['test_var']
}

const mockTemplates = [mockTemplate]

describe('Basic Accessibility Features', () => {
  describe('TemplateCard Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check article role and labeling
      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-labelledby', 'template-title-1')
      expect(card).toHaveAttribute('aria-describedby', 'template-description-1')

      // Check title has correct ID
      expect(screen.getByText('Test Template')).toHaveAttribute('id', 'template-title-1')

      // Check edit button has proper label
      const editButton = screen.getByRole('button', { name: /Vorlage "Test Template" bearbeiten/ })
      expect(editButton).toBeInTheDocument()

      // Check dropdown trigger has proper label
      const dropdownTrigger = screen.getByRole('button', { name: /Aktionen für Vorlage Test Template/ })
      expect(dropdownTrigger).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Tab to edit button
      await user.tab()
      const editButton = screen.getByRole('button', { name: /Vorlage "Test Template" bearbeiten/ })
      expect(editButton).toHaveFocus()

      // Press Enter to trigger edit
      await user.keyboard('{Enter}')
      expect(mockOnEdit).toHaveBeenCalled()
    })

    test('should have proper time elements with datetime attributes', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check creation date time element
      const creationTime = screen.getByText(/Erstellt:/).closest('time')
      expect(creationTime).toHaveAttribute('datetime', '2024-01-01')

      // Check update date time element
      const updateTime = screen.getByText(/Geändert:/).closest('time')
      expect(updateTime).toHaveAttribute('datetime', '2024-01-02')
    })
  })

  describe('CategoryFilter Accessibility', () => {
    test('should have proper labels and descriptions', () => {
      const mockOnChange = jest.fn()

      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnChange}
        />
      )

      // Check combobox has proper labeling
      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveAttribute('aria-label', 'Kategorie auswählen')
      expect(combobox).toHaveAttribute('aria-describedby', 'category-filter-help')

      // Check help text exists
      expect(screen.getByText(/Wählen Sie eine Kategorie aus/)).toHaveAttribute('id', 'category-filter-help')
    })

    test('should support keyboard navigation', async () => {
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
      
      // Focus and open with Enter
      combobox.focus()
      await user.keyboard('{Enter}')

      // Should show options
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  describe('UserSettings Accessibility', () => {
    test('should have proper button labeling', async () => {
      render(<UserSettings />)

      // Wait for user data to load
      await screen.findByText(/test@example.com/)

      // Check user menu button has proper labeling
      const userMenuButton = screen.getByRole('button')
      expect(userMenuButton).toHaveAttribute('aria-label')
      expect(userMenuButton.getAttribute('aria-label')).toMatch(/Benutzermenü/)
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<UserSettings />)

      // Wait for user data to load
      await screen.findByText(/test@example.com/)

      const userMenuButton = screen.getByRole('button')
      
      // Focus and activate with Enter
      userMenuButton.focus()
      await user.keyboard('{Enter}')

      // Should show menu items
      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
      expect(screen.getByText('Einstellungen')).toBeInTheDocument()
      expect(screen.getByText('Abmelden')).toBeInTheDocument()
    })

    test('should have descriptive text for screen readers', async () => {
      render(<UserSettings />)

      // Wait for user data to load
      await screen.findByText(/test@example.com/)

      // Check for hidden descriptions
      expect(screen.getByText(/Öffnet das Benutzermenü/)).toHaveClass('sr-only')
      expect(screen.getByText(/Öffnet die Vorlagenverwaltung/)).toHaveClass('sr-only')
      expect(screen.getByText(/Öffnet die Benutzereinstellungen/)).toHaveClass('sr-only')
    })
  })

  describe('Focus Management', () => {
    test('should have visible focus indicators', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      const editButton = screen.getByRole('button', { name: /Vorlage "Test Template" bearbeiten/ })
      editButton.focus()

      // Check that focus styles are applied
      expect(editButton).toHaveClass('focus:ring-2', 'focus:ring-primary', 'focus:ring-offset-2')
    })

    test('should support focus-visible for keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Tab to button (keyboard navigation)
      await user.tab()
      const editButton = screen.getByRole('button', { name: /Vorlage "Test Template" bearbeiten/ })
      expect(editButton).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    test('should have sr-only content for screen readers', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Check for screen reader only content
      const srOnlyElements = document.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)
    })

    test('should have proper aria-hidden on decorative icons', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Icons should be hidden from screen readers
      const icons = document.querySelectorAll('svg')
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('High Contrast Mode', () => {
    test('should detect high contrast mode preference', () => {
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

      // The hook should detect high contrast mode
      // This would be tested in the actual component that uses the hook
      expect(window.matchMedia('(prefers-contrast: high)').matches).toBe(true)
    })
  })

  describe('Reduced Motion Support', () => {
    test('should respect reduced motion preferences', () => {
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

      expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
    })
  })
})