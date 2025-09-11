import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesEmptyState, TemplatesErrorEmptyState } from '@/components/templates-empty-state'

describe('TemplatesEmptyState', () => {
  const mockOnCreateTemplate = jest.fn()
  const mockOnClearFilters = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('No Templates State', () => {
    it('should render empty state when no templates exist', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      expect(screen.getByText(/noch keine vorlagen vorhanden/i)).toBeInTheDocument()
      expect(screen.getByText(/erstellen sie ihre erste vorlage/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /erste vorlage erstellen/i })).toBeInTheDocument()
    })

    it('should call onCreateTemplate when create button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const createButton = screen.getByRole('button', { name: /erste vorlage erstellen/i })
      await user.click(createButton)

      expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1)
    })

    it('should have proper accessibility attributes for no templates state', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent(/noch keine vorlagen vorhanden/i)
      
      const createButton = screen.getByRole('button', { name: /erste vorlage erstellen/i })
      expect(createButton).toBeInTheDocument()
    })
  })

  describe('Search Results Empty State', () => {
    it('should render search empty state when no search results', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
      expect(screen.getByText(/ihre suche ergab keine treffer/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /filter zurücksetzen/i })).toBeInTheDocument()
    })

    it('should call onClearFilters when reset button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const resetButton = screen.getByRole('button', { name: /filter zurücksetzen/i })
      await user.click(resetButton)

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
    })

    it('should show search icon for search empty state', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      // Search icon should be present (using data-testid or class)
      const searchIcon = document.querySelector('[data-lucide="search"]')
      expect(searchIcon).toBeInTheDocument()
    })
  })

  describe('Filter Results Empty State', () => {
    it('should render filter empty state when no filter results', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={true}
          onClearFilters={mockOnClearFilters}
        />
      )

      expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
      expect(screen.getByText(/in dieser kategorie sind keine vorlagen vorhanden/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /filter zurücksetzen/i })).toBeInTheDocument()
    })

    it('should handle combined search and filter empty state', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={true}
          onClearFilters={mockOnClearFilters}
        />
      )

      expect(screen.getByText(/keine vorlagen gefunden/i)).toBeInTheDocument()
      expect(screen.getByText(/ihre suche ergab keine treffer/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /filter zurücksetzen/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toBeInTheDocument()
    })

    it('should have descriptive button labels', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const createButton = screen.getByRole('button', { name: /erste vorlage erstellen/i })
      expect(createButton).toHaveAccessibleName()
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const createButton = screen.getByRole('button', { name: /erste vorlage erstellen/i })
      await user.tab()
      
      expect(createButton).toHaveFocus()
    })
  })

  describe('Visual Design', () => {
    it('should have proper styling classes', () => {
      render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      const container = screen.getByText(/noch keine vorlagen vorhanden/i).closest('div')
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })

    it('should show appropriate icons for different states', () => {
      const { rerender } = render(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      // No templates state should show FileText icon
      expect(document.querySelector('[data-lucide="file-text"]')).toBeInTheDocument()

      rerender(
        <TemplatesEmptyState
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )

      // Search state should show Search icon
      expect(document.querySelector('[data-lucide="search"]')).toBeInTheDocument()
    })
  })
})

describe('TemplatesErrorEmptyState', () => {
  const mockOnRetry = jest.fn()
  const mockOnCreateTemplate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Error State Rendering', () => {
    it('should render error state with error message', () => {
      render(
        <TemplatesErrorEmptyState
          error="Failed to load templates"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      expect(screen.getByText(/vorlagen konnten nicht geladen werden/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesErrorEmptyState
          error="Network error"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should disable retry button when canRetry is false', () => {
      render(
        <TemplatesErrorEmptyState
          error="Permanent error"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={false}
        />
      )

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      expect(retryButton).toBeDisabled()
    })

    it('should show create template option as fallback', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesErrorEmptyState
          error="Load error"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const createButton = screen.getByRole('button', { name: /neue vorlage erstellen/i })
      await user.click(createButton)

      expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Types', () => {
    it('should handle network errors', () => {
      render(
        <TemplatesErrorEmptyState
          error="Network request failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
    })

    it('should handle authentication errors', () => {
      render(
        <TemplatesErrorEmptyState
          error="User not authenticated"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={false}
        />
      )

      expect(screen.getByText(/user not authenticated/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeDisabled()
    })

    it('should handle generic errors', () => {
      render(
        <TemplatesErrorEmptyState
          error="Something went wrong"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper error announcement', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const errorRegion = screen.getByRole('alert')
      expect(errorRegion).toBeInTheDocument()
    })

    it('should have proper heading structure', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent(/vorlagen konnten nicht geladen werden/i)
    })

    it('should have descriptive button labels', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      const createButton = screen.getByRole('button', { name: /neue vorlage erstellen/i })
      
      expect(retryButton).toHaveAccessibleName()
      expect(createButton).toHaveAccessibleName()
    })

    it('should provide keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      await user.tab()
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /neue vorlage erstellen/i })).toHaveFocus()
    })
  })

  describe('Visual Design', () => {
    it('should show error icon', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      expect(document.querySelector('[data-lucide="alert-triangle"]')).toBeInTheDocument()
    })

    it('should have proper error styling', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const container = screen.getByRole('alert').closest('div')
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })

    it('should differentiate retry and create buttons visually', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      const createButton = screen.getByRole('button', { name: /neue vorlage erstellen/i })

      // Retry button should be primary, create button should be secondary
      expect(retryButton).not.toHaveClass('variant-outline')
      expect(createButton).toHaveClass('variant-outline')
    })
  })

  describe('Error Recovery', () => {
    it('should provide multiple recovery options', () => {
      render(
        <TemplatesErrorEmptyState
          error="Load failed"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={true}
        />
      )

      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /neue vorlage erstellen/i })).toBeInTheDocument()
    })

    it('should handle retry limitations gracefully', () => {
      render(
        <TemplatesErrorEmptyState
          error="Max retries exceeded"
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
          canRetry={false}
        />
      )

      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      expect(retryButton).toBeDisabled()
      
      // Create template should still be available
      expect(screen.getByRole('button', { name: /neue vorlage erstellen/i })).not.toBeDisabled()
    })
  })
})