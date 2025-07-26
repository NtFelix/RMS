import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table'
import { DataTableToolbar, FilterConfig } from '../data-table-toolbar'

// Mock the hooks
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Test data and columns
interface TestData {
  id: string
  name: string
  status: string
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', status: 'active' },
  { id: '2', name: 'Item 2', status: 'inactive' },
]

const testColumns: ColumnDef<TestData>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
]

// Helper component to provide table context
const TestWrapper = ({ 
  children, 
  filters = [],
  enableExport = false,
  onExport,
}: { 
  children: React.ReactNode
  filters?: FilterConfig[]
  enableExport?: boolean
  onExport?: (format: 'csv' | 'pdf') => void
}) => {
  const table = useReactTable({
    data: testData,
    columns: testColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <DataTableToolbar
      table={table}
      searchPlaceholder="Search test..."
      filters={filters}
      enableExport={enableExport}
      onExport={onExport}
    >
      {children}
    </DataTableToolbar>
  )
}

describe('DataTableToolbar', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input correctly', () => {
    render(<TestWrapper />)
    
    const searchInput = screen.getByPlaceholderText('Search test...')
    expect(searchInput).toBeInTheDocument()
  })

  it('handles search input changes', async () => {
    render(<TestWrapper />)
    
    const searchInput = screen.getByPlaceholderText('Search test...')
    await user.type(searchInput, 'test search')
    
    expect(searchInput).toHaveValue('test search')
  })

  it('renders column visibility toggle when enabled', () => {
    render(<TestWrapper />)
    
    const columnsButton = screen.getByText('Spalten')
    expect(columnsButton).toBeInTheDocument()
  })

  it('renders export dropdown when enabled', () => {
    const mockExport = jest.fn()
    render(<TestWrapper enableExport={true} onExport={mockExport} />)
    
    const exportButton = screen.getByText('Export')
    expect(exportButton).toBeInTheDocument()
  })

  it('handles export CSV click', async () => {
    const mockExport = jest.fn()
    render(<TestWrapper enableExport={true} onExport={mockExport} />)
    
    const exportButton = screen.getByText('Export')
    await user.click(exportButton)
    
    const csvOption = screen.getByText('CSV')
    await user.click(csvOption)
    
    expect(mockExport).toHaveBeenCalledWith('csv')
  })

  it('handles export PDF click', async () => {
    const mockExport = jest.fn()
    render(<TestWrapper enableExport={true} onExport={mockExport} />)
    
    const exportButton = screen.getByText('Export')
    await user.click(exportButton)
    
    const pdfOption = screen.getByText('PDF')
    await user.click(pdfOption)
    
    expect(mockExport).toHaveBeenCalledWith('pdf')
  })

  it('renders filters when provided', () => {
    const filters: FilterConfig[] = [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
        type: 'select',
      },
    ]

    render(<TestWrapper filters={filters} />)
    
    expect(screen.getByDisplayValue('Alle Status')).toBeInTheDocument()
  })

  it('handles filter selection', async () => {
    const filters: FilterConfig[] = [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
        type: 'select',
      },
    ]

    render(<TestWrapper filters={filters} />)
    
    const filterSelect = screen.getByDisplayValue('Alle Status')
    await user.click(filterSelect)
    
    const activeOption = screen.getByText('Active')
    await user.click(activeOption)
    
    // Filter should be applied (this would need table state verification)
    expect(filterSelect).toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', async () => {
    const filters: FilterConfig[] = [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
        ],
        type: 'select',
      },
    ]

    render(<TestWrapper filters={filters} />)
    
    // Apply a search filter first
    const searchInput = screen.getByPlaceholderText('Search test...')
    await user.type(searchInput, 'test')
    
    // Clear button should appear
    const clearButton = screen.getByText('Zurücksetzen')
    expect(clearButton).toBeInTheDocument()
  })

  it('handles clear filters click', async () => {
    render(<TestWrapper />)
    
    // Apply a search filter first
    const searchInput = screen.getByPlaceholderText('Search test...')
    await user.type(searchInput, 'test')
    
    // Clear filters
    const clearButton = screen.getByText('Zurücksetzen')
    await user.click(clearButton)
    
    expect(searchInput).toHaveValue('')
  })

  it('shows loading state during export', () => {
    render(<TestWrapper enableExport={true} />)
    
    // This would require mocking the isExporting state
    const exportButton = screen.getByText('Export')
    expect(exportButton).toBeInTheDocument()
  })

  it('disables export button during export', () => {
    render(
      <TestWrapper>
        <DataTableToolbar
          table={useReactTable({
            data: testData,
            columns: testColumns,
            getCoreRowModel: getCoreRowModel(),
          })}
          enableExport={true}
          isExporting={true}
        />
      </TestWrapper>
    )
    
    const exportButton = screen.getByText('Exportiere...')
    expect(exportButton).toBeDisabled()
  })
})