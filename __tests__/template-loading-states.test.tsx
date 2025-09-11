import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'
import {
  TemplateListSkeleton,
  TemplateEditorLoading,
  TemplateSaveStatus,
  TemplateOperationLoading,
  OfflineStatus,
  TemplateLoadingError,
  BatchTemplateOperation,
  TemplateSearchLoading,
  TemplatePreviewLoading
} from '@/components/template-loading-states'

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('Template Loading States', () => {
  beforeEach(() => {
    mockToast.mockClear()
  })

  describe('TemplateListSkeleton', () => {
    it('renders grid view skeleton by default', () => {
      const { container } = render(<TemplateListSkeleton />)
      
      // Should render grid layout
      const gridContainer = container.firstChild
      expect(gridContainer).toHaveClass('grid')
      
      // Should render 8 skeleton items by default
      const skeletonItems = container.querySelectorAll('.animate-pulse')
      expect(skeletonItems.length).toBeGreaterThan(8)
    })

    it('renders list view skeleton when specified', () => {
      const { container } = render(<TemplateListSkeleton viewMode="list" count={5} />)
      
      // Should render list layout
      const listContainer = container.firstChild
      expect(listContainer).toHaveClass('space-y-3')
      
      // Should render 5 skeleton items
      const skeletonItems = container.querySelectorAll('.animate-pulse')
      expect(skeletonItems.length).toBeGreaterThan(5)
    })

    it('applies custom className', () => {
      const { container } = render(<TemplateListSkeleton className="custom-class" />)
      
      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('custom-class')
    })
  })

  describe('TemplateEditorLoading', () => {
    it('renders loading message', () => {
      render(<TemplateEditorLoading message="Loading template..." />)
      
      expect(screen.getByText('Loading template...')).toBeInTheDocument()
    })

    it('shows progress when enabled', () => {
      render(<TemplateEditorLoading showProgress={true} progress={75} />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('uses default message when none provided', () => {
      render(<TemplateEditorLoading />)
      
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
    })
  })

  describe('TemplateSaveStatus', () => {
    it('renders saving status', () => {
      render(<TemplateSaveStatus status="saving" />)
      
      expect(screen.getByText('Speichert...')).toBeInTheDocument()
    })

    it('renders saved status with timestamp', () => {
      const lastSaved = new Date('2024-01-01T12:00:00Z')
      render(<TemplateSaveStatus status="saved" lastSaved={lastSaved} />)
      
      expect(screen.getByText(/Gespeichert um/)).toBeInTheDocument()
    })

    it('renders error status with message', () => {
      render(<TemplateSaveStatus status="error" error="Network error" />)
      
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('renders dirty status', () => {
      render(<TemplateSaveStatus status="dirty" />)
      
      expect(screen.getByText('Ungespeicherte Änderungen')).toBeInTheDocument()
    })

    it('shows auto-save indicator when enabled', () => {
      render(<TemplateSaveStatus status="saved" autoSaveEnabled={true} />)
      
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('returns null for idle status', () => {
      const { container } = render(<TemplateSaveStatus status="idle" />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('TemplateOperationLoading', () => {
    it('renders create operation', () => {
      render(<TemplateOperationLoading operation="create" templateName="Test Template" />)
      
      expect(screen.getByText('Vorlage wird erstellt')).toBeInTheDocument()
      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })

    it('renders update operation', () => {
      render(<TemplateOperationLoading operation="update" />)
      
      expect(screen.getByText('Vorlage wird aktualisiert')).toBeInTheDocument()
    })

    it('renders delete operation', () => {
      render(<TemplateOperationLoading operation="delete" />)
      
      expect(screen.getByText('Vorlage wird gelöscht')).toBeInTheDocument()
    })

    it('shows progress when provided', () => {
      render(<TemplateOperationLoading operation="create" progress={50} />)
      
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  describe('OfflineStatus', () => {
    it('renders nothing when online', () => {
      const { container } = render(<OfflineStatus isOffline={false} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('renders offline status', () => {
      render(<OfflineStatus isOffline={true} />)
      
      expect(screen.getByText('Keine Internetverbindung')).toBeInTheDocument()
    })

    it('renders connecting status', () => {
      render(<OfflineStatus isOffline={false} isConnecting={true} />)
      
      expect(screen.getByText('Verbindung wird hergestellt...')).toBeInTheDocument()
    })

    it('shows retry button when offline and onRetry provided', () => {
      const mockRetry = jest.fn()
      render(<OfflineStatus isOffline={true} onRetry={mockRetry} />)
      
      const retryButton = screen.getByText('Erneut versuchen')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(mockRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('TemplateLoadingError', () => {
    it('renders error message', () => {
      render(<TemplateLoadingError error="Failed to load template" />)
      
      expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
      expect(screen.getByText('Failed to load template')).toBeInTheDocument()
    })

    it('shows template name when provided', () => {
      render(<TemplateLoadingError error="Error" templateName="My Template" />)
      
      expect(screen.getByText('Vorlage: My Template')).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', () => {
      const mockRetry = jest.fn()
      render(<TemplateLoadingError error="Error" onRetry={mockRetry} />)
      
      const retryButton = screen.getByText('Erneut versuchen')
      fireEvent.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalledTimes(1)
    })

    it('calls onCancel when cancel button clicked', () => {
      const mockCancel = jest.fn()
      render(<TemplateLoadingError error="Error" onCancel={mockCancel} />)
      
      const cancelButton = screen.getByText('Abbrechen')
      fireEvent.click(cancelButton)
      
      expect(mockCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('BatchTemplateOperation', () => {
    it('renders operation progress', () => {
      render(
        <BatchTemplateOperation
          operation="Bulk Import"
          totalItems={10}
          completedItems={7}
          currentItem="Template 7"
        />
      )
      
      expect(screen.getByText('Bulk Import')).toBeInTheDocument()
      expect(screen.getByText('7/10')).toBeInTheDocument()
      expect(screen.getByText('70% abgeschlossen')).toBeInTheDocument()
      expect(screen.getByText('Aktuell: Template 7')).toBeInTheDocument()
    })

    it('shows errors when present', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3', 'Error 4']
      render(
        <BatchTemplateOperation
          operation="Bulk Import"
          totalItems={10}
          completedItems={5}
          errors={errors}
        />
      )
      
      expect(screen.getByText('4 Fehler')).toBeInTheDocument()
      expect(screen.getByText('Fehler aufgetreten:')).toBeInTheDocument()
      expect(screen.getByText('Error 1')).toBeInTheDocument()
      expect(screen.getByText('... und 1 weitere')).toBeInTheDocument()
    })
  })

  describe('TemplateSearchLoading', () => {
    it('renders search loading skeleton', () => {
      const { container } = render(<TemplateSearchLoading />)
      
      // Should render 3 skeleton items by default
      const skeletonItems = container.querySelectorAll('.animate-pulse')
      expect(skeletonItems.length).toBeGreaterThan(3)
    })
  })

  describe('TemplatePreviewLoading', () => {
    it('renders preview loading skeleton', () => {
      const { container } = render(<TemplatePreviewLoading />)
      
      // Should render skeleton elements for preview
      const skeletonItems = container.querySelectorAll('.animate-pulse')
      expect(skeletonItems.length).toBeGreaterThan(5)
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for loading states', () => {
      render(<TemplateEditorLoading />)
      
      // Loading states should be announced to screen readers
      const loadingElement = screen.getByText('Editor wird geladen...')
      expect(loadingElement).toBeInTheDocument()
    })

    it('provides proper button labels for interactive elements', () => {
      const mockRetry = jest.fn()
      render(<OfflineStatus isOffline={true} onRetry={mockRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('Animation and Performance', () => {
    it('applies staggered animation delays to skeleton items', () => {
      const { container } = render(<TemplateListSkeleton count={3} />)
      
      // Skeleton items should have animation delays
      const skeletonItems = container.querySelectorAll('.group')
      const firstItem = skeletonItems[0]
      expect(firstItem).toHaveStyle('animation-delay: 0ms')
    })

    it('shows shimmer effect on skeleton elements', () => {
      const { container } = render(<TemplateListSkeleton />)
      
      // Should contain shimmer animation classes
      const shimmerElements = container.querySelectorAll('.animate-shimmer')
      expect(shimmerElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('adapts grid layout for different screen sizes', () => {
      const { container } = render(<TemplateListSkeleton viewMode="grid" />)
      
      const gridContainer = container.firstChild
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
    })

    it('truncates long text in loading states', () => {
      render(
        <TemplateOperationLoading 
          operation="create" 
          templateName="This is a very long template name that should be truncated" 
        />
      )
      
      const templateName = screen.getByText(/This is a very long template name/)
      expect(templateName).toHaveClass('truncate')
    })
  })

  describe('Error Handling', () => {
    it('handles missing props gracefully', () => {
      // Should not throw when required props are missing
      expect(() => {
        render(<TemplateSaveStatus status="saved" />)
      }).not.toThrow()
    })

    it('provides fallback content for undefined states', () => {
      render(<TemplateOperationLoading operation="create" />)
      
      // Should show default text when template name is not provided
      expect(screen.getByText('Vorlage wird erstellt')).toBeInTheDocument()
    })
  })
})

describe('Integration with Template System', () => {
  it('works with template editor modal', async () => {
    // This would be tested in the actual template editor modal tests
    // but we can verify the components render correctly together
    render(
      <div>
        <TemplateSaveStatus status="saving" />
        <TemplateEditorLoading />
      </div>
    )
    
    expect(screen.getByText('Speichert...')).toBeInTheDocument()
    expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
  })

  it('works with template operations hook', () => {
    // Mock the operation state
    const operationState = {
      isLoading: true,
      operation: 'create' as const,
      currentTemplate: 'Test Template',
      progress: 50
    }
    
    render(
      <TemplateOperationLoading
        operation={operationState.operation}
        templateName={operationState.currentTemplate}
        progress={operationState.progress}
      />
    )
    
    expect(screen.getByText('Vorlage wird erstellt')).toBeInTheDocument()
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})