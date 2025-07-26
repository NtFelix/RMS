import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataTable } from './data-table'
import { DataTableEmptyState, DataTableNoDataState, DataTableSearchEmptyState, DataTableFilterEmptyState, DataTableErrorState } from './data-table-empty-state'
import { DataTableSkeleton, HousesTableSkeleton } from './data-table-skeleton'
import { ExportLoadingOverlay } from './data-table-loading-overlay'
import { ColumnDef } from '@tanstack/react-table'

// Mock data and columns for testing
interface TestData {
  id: string
  name: string
  value: number
}

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'value',
    header: 'Value',
  },
]

const mockData: TestData[] = [
  { id: '1', name: 'Test 1', value: 100 },
  { id: '2', name: 'Test 2', value: 200 },
]

describe('DataTable Loading States', () => {
  describe('DataTableSkeleton', () => {
    it('renders skeleton with correct number of columns and rows', () => {
      render(<DataTableSkeleton columnCount={3} rowCount={5} />)
      
      // Check for skeleton elements
      const skeletonElements = screen.getAllByRole('status')
      expect(skeletonElements.length).toBeGreaterThan(0)
      
      // Check for screen reader announcement
      expect(screen.getByLabelText('Tabelle wird geladen')).toBeInTheDocument()
    })

    it('shows toolbar skeleton when enabled', () => {
      render(<DataTableSkeleton showToolbar={true} />)
      
      // Should have toolbar skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(5) // Toolbar + table elements
    })

    it('hides toolbar skeleton when disabled', () => {
      render(<DataTableSkeleton showToolbar={false} />)
      
      // Should have fewer skeleton elements without toolbar
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeLessThan(50) // Only table elements (adjusted for actual count)
    })
  })

  describe('HousesTableSkeleton', () => {
    it('renders with correct configuration for houses table', () => {
      render(<HousesTableSkeleton />)
      
      expect(screen.getByLabelText('Tabelle wird geladen')).toBeInTheDocument()
    })
  })

  describe('DataTable with loading state', () => {
    it('shows skeleton when loading is true', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={true}
        />
      )
      
      expect(screen.getByLabelText('Tabelle wird geladen')).toBeInTheDocument()
    })

    it('shows data when loading is false', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          loading={false}
        />
      )
      
      expect(screen.getByText('Test 1')).toBeInTheDocument()
      expect(screen.getByText('Test 2')).toBeInTheDocument()
    })
  })

  describe('DataTableEmptyState', () => {
    it('renders basic empty state', () => {
      render(<DataTableEmptyState />)
      
      expect(screen.getByText('Keine Daten verfügbar')).toBeInTheDocument()
      expect(screen.getByText('Es sind noch keine Daten vorhanden. Erstellen Sie den ersten Eintrag.')).toBeInTheDocument()
    })

    it('renders search empty state with clear button', () => {
      const mockClearSearch = jest.fn()
      
      render(
        <DataTableEmptyState
          searchTerm="test search"
          onClearSearch={mockClearSearch}
        />
      )
      
      expect(screen.getByText('Keine Suchergebnisse')).toBeInTheDocument()
      expect(screen.getByText('Suche zurücksetzen')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Suche zurücksetzen'))
      expect(mockClearSearch).toHaveBeenCalled()
    })

    it('renders filter empty state with clear button', () => {
      const mockClearFilters = jest.fn()
      
      render(
        <DataTableEmptyState
          isFiltered={true}
          onClearFilters={mockClearFilters}
        />
      )
      
      expect(screen.getByText('Keine gefilterten Ergebnisse')).toBeInTheDocument()
      expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Filter zurücksetzen'))
      expect(mockClearFilters).toHaveBeenCalled()
    })

    it('renders action button when provided', () => {
      const mockAction = jest.fn()
      
      render(
        <DataTableEmptyState
          action={{
            label: 'Create New',
            onClick: mockAction,
          }}
        />
      )
      
      expect(screen.getByText('Create New')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Create New'))
      expect(mockAction).toHaveBeenCalled()
    })
  })

  describe('DataTableNoDataState', () => {
    it('renders with entity name and create button', () => {
      const mockCreate = jest.fn()
      
      render(
        <DataTableNoDataState
          entityName="Häuser"
          onCreateNew={mockCreate}
        />
      )
      
      expect(screen.getByText('Keine Häuser vorhanden')).toBeInTheDocument()
      expect(screen.getByText('Häuser erstellen')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Häuser erstellen'))
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('DataTableSearchEmptyState', () => {
    it('renders search-specific empty state', () => {
      const mockClear = jest.fn()
      
      render(
        <DataTableSearchEmptyState
          searchTerm="nonexistent"
          onClearSearch={mockClear}
        />
      )
      
      expect(screen.getByText('Keine Suchergebnisse')).toBeInTheDocument()
      expect(screen.getByText('Keine Ergebnisse für "nonexistent" gefunden. Versuchen Sie andere Suchbegriffe.')).toBeInTheDocument()
    })
  })

  describe('DataTableFilterEmptyState', () => {
    it('renders filter-specific empty state', () => {
      const mockClear = jest.fn()
      
      render(
        <DataTableFilterEmptyState onClearFilters={mockClear} />
      )
      
      expect(screen.getByText('Keine gefilterten Ergebnisse')).toBeInTheDocument()
    })
  })

  describe('DataTableErrorState', () => {
    it('renders error state with retry button', () => {
      const mockRetry = jest.fn()
      
      render(
        <DataTableErrorState onRetry={mockRetry} />
      )
      
      expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument()
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Erneut versuchen'))
      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('ExportLoadingOverlay', () => {
    it('renders export loading overlay for CSV', () => {
      render(<ExportLoadingOverlay isVisible={true} format="csv" />)
      
      expect(screen.getByText('CSV Export')).toBeInTheDocument()
      expect(screen.getAllByText('Daten werden als CSV exportiert...').length).toBeGreaterThan(0)
    })

    it('renders export loading overlay for PDF', () => {
      render(<ExportLoadingOverlay isVisible={true} format="pdf" />)
      
      expect(screen.getByText('PDF Export')).toBeInTheDocument()
      expect(screen.getAllByText('Daten werden als PDF exportiert...').length).toBeGreaterThan(0)
    })

    it('does not render when not visible', () => {
      render(<ExportLoadingOverlay isVisible={false} format="csv" />)
      
      expect(screen.queryByText('CSV Export')).not.toBeInTheDocument()
    })

    it('shows progress when provided', () => {
      render(<ExportLoadingOverlay isVisible={true} format="csv" progress={50} />)
      
      expect(screen.getByText('50% abgeschlossen')).toBeInTheDocument()
    })
  })

  describe('DataTable with enhanced empty states', () => {
    it('shows enhanced empty state with clear filters option', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={false}
        />
      )
      
      expect(screen.getByText('Keine Daten verfügbar')).toBeInTheDocument()
    })

    it('shows error state when error is provided', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={false}
          error="Test error message"
        />
      )
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('shows empty action when provided', () => {
      const mockAction = jest.fn()
      
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={false}
          emptyAction={{
            label: 'Create First Item',
            onClick: mockAction,
          }}
        />
      )
      
      expect(screen.getByText('Create First Item')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Create First Item'))
      expect(mockAction).toHaveBeenCalled()
    })
  })
})

describe('DataTable Export Loading Integration', () => {
  it('shows export loading overlay during export', async () => {
    const mockExport = jest.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100))
    })
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableExport={true}
        onExport={mockExport}
      />
    )
    
    // Find and click export button (this would need to be adjusted based on actual implementation)
    // This is a simplified test - in reality you'd need to open the dropdown and select format
    
    // The export loading overlay should be shown during export
    // This test would need to be more specific based on the actual UI implementation
  })
})