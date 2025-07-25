import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataTable } from './data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the mobile hook
jest.mock('@/hooks/use-mobile')
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

// Mock data for testing
interface TestData {
  id: string
  name: string
  value: number
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
  { id: '3', name: 'Item 3', value: 300 },
]

const testColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'value',
    header: 'Value',
  },
]

describe('DataTable Mobile Responsiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with horizontal scroll on mobile', () => {
    mockUseIsMobile.mockReturnValue(true)
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enablePagination={true}
      />
    )

    // Check if outer table container has mobile-specific classes
    const outerContainer = screen.getByRole('table').closest('div')?.parentElement
    expect(outerContainer).toHaveClass('overflow-x-auto')
    
    // Check if table has minimum width for horizontal scroll
    const table = screen.getByRole('table')
    expect(table).toHaveClass('min-w-[600px]')
  })

  it('should show mobile toolbar layout', () => {
    mockUseIsMobile.mockReturnValue(true)
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        searchPlaceholder="Search items..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ],
            type: 'select',
          },
        ]}
        enableExport={true}
        onExport={() => {}}
      />
    )

    // Search input should be full width on mobile
    const searchInput = screen.getByPlaceholderText('Search items...')
    expect(searchInput.closest('div')).toHaveClass('flex-1')

    // Filter toggle button should be present
    const filterButton = screen.getByLabelText('Filter anzeigen')
    expect(filterButton).toBeInTheDocument()

    // Export and column buttons should be compact
    const exportButton = screen.getByLabelText('Exportieren')
    const columnButton = screen.getByLabelText('Spalten')
    expect(exportButton).toHaveClass('h-8', 'px-2')
    expect(columnButton).toHaveClass('h-8', 'px-2')
  })

  it('should show/hide mobile filters when toggle is clicked', async () => {
    mockUseIsMobile.mockReturnValue(true)
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ],
            type: 'select',
          },
        ]}
      />
    )

    const filterButton = screen.getByLabelText('Filter anzeigen')
    
    // Filters should be hidden initially
    expect(screen.queryByText('Alle Status')).not.toBeInTheDocument()
    
    // Click to show filters
    fireEvent.click(filterButton)
    
    await waitFor(() => {
      expect(screen.getByText('Alle Status')).toBeInTheDocument()
    })
    
    // Click to hide filters
    fireEvent.click(filterButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Alle Status')).not.toBeInTheDocument()
    })
  })

  it('should show mobile pagination layout', () => {
    mockUseIsMobile.mockReturnValue(true)
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enablePagination={true}
      />
    )

    // Should show compact page size selector
    expect(screen.getByText('Pro Seite')).toBeInTheDocument()
    
    // Should show compact page info
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    
    // Navigation buttons should be larger for touch
    const prevButton = screen.getByLabelText('Zur vorherigen Seite')
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    expect(prevButton).toHaveClass('h-9', 'w-9')
    expect(nextButton).toHaveClass('h-9', 'w-9')
  })

  it('should handle touch gestures for pagination', async () => {
    mockUseIsMobile.mockReturnValue(true)
    
    // Create more data to enable pagination
    const moreData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      value: (i + 1) * 100,
    }))
    
    render(
      <DataTable
        columns={testColumns}
        data={moreData}
        enablePagination={true}
      />
    )

    // Find the outer container that has touch handlers
    const outerContainer = screen.getByRole('table').closest('div')?.parentElement!
    
    // Simulate swipe left (next page) - need larger movement to trigger
    fireEvent.touchStart(outerContainer, {
      touches: [{ clientX: 200, clientY: 100 }],
    })
    
    fireEvent.touchMove(outerContainer, {
      touches: [{ clientX: 50, clientY: 100 }], // Move more than 50px
    })
    
    fireEvent.touchEnd(outerContainer)
    
    await waitFor(() => {
      expect(screen.getByText(/2.*3/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should not trigger row click during scrolling', () => {
    mockUseIsMobile.mockReturnValue(true)
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={mockRowClick}
      />
    )

    const tableContainer = screen.getByRole('table').closest('div')!
    const firstRow = screen.getAllByRole('button')[0] // First data row
    
    // Simulate horizontal scroll gesture
    fireEvent.touchStart(tableContainer, {
      touches: [{ clientX: 200, clientY: 100 }],
    })
    
    fireEvent.touchMove(tableContainer, {
      touches: [{ clientX: 150, clientY: 100 }],
    })
    
    // Touch end on row should not trigger click during scroll
    fireEvent.touchEnd(firstRow)
    
    expect(mockRowClick).not.toHaveBeenCalled()
  })

  it('should use desktop layout when not mobile', () => {
    mockUseIsMobile.mockReturnValue(false)
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ],
            type: 'select',
          },
        ]}
        enableExport={true}
        onExport={() => {}}
      />
    )

    // Should not have mobile-specific classes
    const outerContainer = screen.getByRole('table').closest('div')?.parentElement
    expect(outerContainer).not.toHaveClass('overflow-x-auto')
    
    const table = screen.getByRole('table')
    expect(table).not.toHaveClass('min-w-[600px]')
    
    // Should show desktop toolbar layout
    expect(screen.queryByLabelText('Filter anzeigen')).not.toBeInTheDocument()
    
    // Filters should be visible by default
    expect(screen.getByText('Alle Status')).toBeInTheDocument()
  })

  it('should provide touch feedback on mobile row interactions', () => {
    mockUseIsMobile.mockReturnValue(true)
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={mockRowClick}
      />
    )

    const rows = screen.getAllByRole('row')
    const firstDataRow = rows.find(row => row.getAttribute('tabindex') === '0')
    expect(firstDataRow).toHaveClass('active:bg-muted/70')
  })
})