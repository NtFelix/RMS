import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import { 
  TemplatesLoadingSkeleton, 
  TemplateSearchLoading, 
  TemplateOperationLoading,
  TemplatePreviewLoading 
} from '@/components/templates-loading-skeleton'
import { 
  TemplatesEmptyState, 
  TemplatesErrorEmptyState,
  TemplatesOfflineEmptyState 
} from '@/components/templates-empty-state'

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={`skeleton ${className}`} data-testid="skeleton" />
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}))

describe('Templates Loading States', () => {
  describe('TemplatesLoadingSkeleton', () => {
    it('should render loading skeleton with default props', () => {
      render(<TemplatesLoadingSkeleton />)
      
      expect(screen.getByTestId('templates-loading-skeleton')).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    })

    it('should render category sections when showCategories is true', () => {
      render(<TemplatesLoadingSkeleton showCategories={true} />)
      
      const skeleton = screen.getByTestId('templates-loading-skeleton')
      expect(skeleton).toBeInTheDocument()
      
      // Should have multiple skeleton elements for category headers and cards
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(8) // Headers + cards
    })

    it('should render specified number of cards', () => {
      render(<TemplatesLoadingSkeleton count={4} showCategories={false} />)
      
      const skeletons = screen.getAllByTestId('skeleton')
      // Each card has multiple skeleton elements, so total should be more than count
      expect(skeletons.length).toBeGreaterThan(4)
    })

    it('should include accessibility announcement', () => {
      render(<TemplatesLoadingSkeleton />)
      
      expect(screen.getByText(/Vorlagen werden geladen/)).toBeInTheDocument()
    })
  })

  describe('TemplateSearchLoading', () => {
    it('should render search loading skeleton', () => {
      render(<TemplateSearchLoading />)
      
      expect(screen.getByTestId('template-search-loading')).toBeInTheDocument()
      expect(screen.getByText(/Suchergebnisse werden geladen/)).toBeInTheDocument()
    })

    it('should render specified number of search results', () => {
      render(<TemplateSearchLoading count={5} />)
      
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('TemplateOperationLoading', () => {
    it('should render create operation loading', () => {
      render(<TemplateOperationLoading operation="create" />)
      
      expect(screen.getAllByText(/Vorlage wird erstellt/)).toHaveLength(2) // One visible, one for screen reader
    })

    it('should render update operation loading', () => {
      render(<TemplateOperationLoading operation="update" />)
      
      expect(screen.getAllByText(/Vorlage wird aktualisiert/)).toHaveLength(2) // One visible, one for screen reader
    })

    it('should render delete operation loading', () => {
      render(<TemplateOperationLoading operation="delete" />)
      
      expect(screen.getAllByText(/Vorlage wird gelöscht/)).toHaveLength(2) // One visible, one for screen reader
    })

    it('should show template name when provided', () => {
      const templateName = 'Test Template'
      render(<TemplateOperationLoading operation="create" templateName={templateName} />)
      
      expect(screen.getByText(templateName)).toBeInTheDocument()
    })

    it('should include accessibility announcement', () => {
      render(<TemplateOperationLoading operation="create" templateName="Test" />)
      
      expect(screen.getByText(/Vorlage wird erstellt: Test/)).toBeInTheDocument()
    })
  })

  describe('TemplatePreviewLoading', () => {
    it('should render preview loading skeleton', () => {
      render(<TemplatePreviewLoading />)
      
      expect(screen.getByText(/Vorlagen-Vorschau wird geladen/)).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    })
  })
})

describe('Templates Empty States', () => {
  describe('TemplatesEmptyState', () => {
    const mockOnCreateTemplate = jest.fn()
    const mockOnClearFilters = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render no templates state when no search or filter', () => {
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
        />
      )
      
      expect(screen.getByText(/Noch keine Vorlagen vorhanden/)).toBeInTheDocument()
      expect(screen.getByText(/Erste Vorlage erstellen/)).toBeInTheDocument()
    })

    it('should render no results state when search is active', () => {
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )
      
      expect(screen.getAllByText(/Keine Suchergebnisse/)).toHaveLength(2) // One visible, one for screen reader
      expect(screen.getByText(/Filter zurücksetzen/)).toBeInTheDocument()
    })

    it('should render no results state when filter is active', () => {
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={true}
          onClearFilters={mockOnClearFilters}
        />
      )
      
      expect(screen.getAllByText(/Keine Vorlagen in dieser Kategorie/)).toHaveLength(2) // One visible, one for screen reader
      expect(screen.getByText(/Filter zurücksetzen/)).toBeInTheDocument()
    })

    it('should call onCreateTemplate when create button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
        />
      )
      
      const createButton = screen.getByText(/Erste Vorlage erstellen/)
      await user.click(createButton)
      
      expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1)
    })

    it('should call onClearFilters when clear filters button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
          onClearFilters={mockOnClearFilters}
        />
      )
      
      const clearButton = screen.getByText(/Filter zurücksetzen/)
      await user.click(clearButton)
      
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
    })

    it('should show search tips when search is active', () => {
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={true}
          hasFilter={false}
        />
      )
      
      expect(screen.getByText(/Suchtipps:/)).toBeInTheDocument()
      expect(screen.getByText(/Verwenden Sie kürzere Suchbegriffe/)).toBeInTheDocument()
    })

    it('should include accessibility announcements', () => {
      render(
        <TemplatesEmptyState 
          onCreateTemplate={mockOnCreateTemplate}
          hasSearch={false}
          hasFilter={false}
        />
      )
      
      expect(screen.getByText(/Keine Vorlagen vorhanden/)).toBeInTheDocument()
    })
  })

  describe('TemplatesErrorEmptyState', () => {
    const mockOnRetry = jest.fn()
    const mockOnCreateTemplate = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render error state with message', () => {
      const errorMessage = 'Network error occurred'
      
      render(
        <TemplatesErrorEmptyState 
          error={errorMessage}
          onRetry={mockOnRetry}
          onCreateTemplate={mockOnCreateTemplate}
        />
      )
      
      expect(screen.getAllByText(/Fehler beim Laden der Vorlagen/)).toHaveLength(2) // One visible, one for screen reader
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should show retry button when canRetry is true', () => {
      render(
        <TemplatesErrorEmptyState 
          error="Error"
          onRetry={mockOnRetry}
          canRetry={true}
        />
      )
      
      expect(screen.getByText(/Erneut versuchen/)).toBeInTheDocument()
    })

    it('should hide retry button when canRetry is false', () => {
      render(
        <TemplatesErrorEmptyState 
          error="Error"
          onRetry={mockOnRetry}
          canRetry={false}
        />
      )
      
      expect(screen.queryByText(/Erneut versuchen/)).not.toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesErrorEmptyState 
          error="Error"
          onRetry={mockOnRetry}
          canRetry={true}
        />
      )
      
      const retryButton = screen.getByText(/Erneut versuchen/)
      await user.click(retryButton)
      
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should include accessibility announcement', () => {
      const errorMessage = 'Test error'
      
      render(
        <TemplatesErrorEmptyState 
          error={errorMessage}
          onRetry={mockOnRetry}
        />
      )
      
      expect(screen.getByText(`Fehler beim Laden der Vorlagen: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  describe('TemplatesOfflineEmptyState', () => {
    const mockOnRetry = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render offline state', () => {
      render(<TemplatesOfflineEmptyState onRetry={mockOnRetry} />)
      
      expect(screen.getAllByText(/Keine Internetverbindung/)).toHaveLength(2) // One visible, one for screen reader
      expect(screen.getAllByText(/Vorlagen können nicht geladen werden/)).toHaveLength(2) // One visible, one for screen reader
    })

    it('should show retry button when onRetry is provided', () => {
      render(<TemplatesOfflineEmptyState onRetry={mockOnRetry} />)
      
      expect(screen.getByText(/Erneut versuchen/)).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      
      render(<TemplatesOfflineEmptyState onRetry={mockOnRetry} />)
      
      const retryButton = screen.getByText(/Erneut versuchen/)
      await user.click(retryButton)
      
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should include accessibility announcement', () => {
      render(<TemplatesOfflineEmptyState />)
      
      expect(screen.getByText(/Keine Internetverbindung. Vorlagen können nicht geladen werden./)).toBeInTheDocument()
    })
  })
})

describe('Loading State Transitions', () => {
  it('should handle loading state changes with proper animations', () => {
    const { rerender } = render(<TemplatesLoadingSkeleton />)
    
    expect(screen.getByTestId('templates-loading-skeleton')).toBeInTheDocument()
    
    // Simulate transition to empty state
    rerender(
      <TemplatesEmptyState 
        onCreateTemplate={() => {}}
        hasSearch={false}
        hasFilter={false}
      />
    )
    
    expect(screen.getByText(/Noch keine Vorlagen vorhanden/)).toBeInTheDocument()
  })

  it('should maintain accessibility during state transitions', () => {
    const { rerender } = render(<TemplatesLoadingSkeleton />)
    
    // Loading state should have aria-live announcement
    expect(screen.getByText(/Vorlagen werden geladen/)).toBeInTheDocument()
    
    // Transition to error state
    rerender(
      <TemplatesErrorEmptyState 
        error="Network error"
        onRetry={() => {}}
      />
    )
    
    // Error state should have assertive aria-live announcement
    expect(screen.getByText(/Fehler beim Laden der Vorlagen: Network error/)).toBeInTheDocument()
  })
})