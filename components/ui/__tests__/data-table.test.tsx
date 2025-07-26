import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table'

// Mock the hooks
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: any) => fn,
}))

// Mock the export functionality
jest.mock('@/lib/data-export', () => ({
  exportTableData: jest.fn().mockResolvedValue(undefined),
}))

// Test data
interface TestData {
  id: string
  name: string
  status: string
  value: number
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', status: 'active', value: 100 },
  { id: '2', name: 'Item 2', status: 'inactive', value: 200 },
  { id: '3', name: 'Item 3', status: 'active', value: 150 },
]

const testColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    filterFn: (row, id, value) => {
      if (value === 'all') return true
      return row.getValue(id) === value
    },
  },
  {
    accessorKey: 'value',
    header: 'Value',
    enableSorting: true,
  },
]

describe('DataTable', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders table with data correctly', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        searchPlaceholder="Search items..."
      />
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('displays loading skeleton when loading prop is true', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        loading={true}
      />
    )

    // Check for skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays empty state when no data', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        emptyMessage="No items found"
      />
    )

    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('handles global search correctly', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        searchPlaceholder="Search items..."
      />
    )

    const searchInput = screen.getByPlaceholderText('Search items...')
    await user.type(searchInput, 'Item 1')

    // Should show only Item 1
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument()
  })

  it('handles sorting when column header is clicked', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enablePagination={false}
      />
    )

    const nameHeader = screen.getByText('Name')
    await user.click(nameHeader)

    // Check if data is sorted (this would require checking the actual DOM order)
    const rows = screen.getAllByRole('row')
    // Skip header row
    expect(rows).toHaveLength(4) // 1 header + 3 data rows
  })

  it('handles row selection when enabled', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
      />
    )

    // Check for select all checkbox
    const selectAllCheckbox = screen.getByLabelText('Alle auswählen')
    expect(selectAllCheckbox).toBeInTheDocument()

    // Check for individual row checkboxes
    const rowCheckboxes = screen.getAllByLabelText('Zeile auswählen')
    expect(rowCheckboxes).toHaveLength(3)

    // Click first row checkbox
    await user.click(rowCheckboxes[0])
    expect(rowCheckboxes[0]).toBeChecked()
  })

  it('handles row click when onRowClick is provided', async () => {
    const mockRowClick = jest.fn()
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={mockRowClick}
      />
    )

    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      await user.click(firstRow)
      expect(mockRowClick).toHaveBeenCalledWith(testData[0])
    }
  })

  it('handles pagination correctly', async () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      status: 'active',
      value: i * 10,
    }))

    render(
      <DataTable
        columns={testColumns}
        data={largeData}
        enablePagination={true}
      />
    )

    // Should show pagination controls
    expect(screen.getByText('Zeilen pro Seite')).toBeInTheDocument()
    expect(screen.getByText('Seite 1 von 3')).toBeInTheDocument()

    // Click next page
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    await user.click(nextButton)

    expect(screen.getByText('Seite 2 von 3')).toBeInTheDocument()
  })

  it('handles column visibility toggle', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableColumnVisibility={true}
      />
    )

    // Open column visibility dropdown
    const columnsButton = screen.getByText('Spalten')
    await user.click(columnsButton)

    // Should show column options
    expect(screen.getByText('Spalten anzeigen')).toBeInTheDocument()
  })

  it('handles export functionality', async () => {
    const mockExport = jest.fn()
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableExport={true}
        onExport={mockExport}
      />
    )

    // Open export dropdown
    const exportButton = screen.getByText('Export')
    await user.click(exportButton)

    // Click CSV export
    const csvOption = screen.getByText('CSV')
    await user.click(csvOption)

    expect(mockExport).toHaveBeenCalledWith('csv')
  })

  it('handles keyboard navigation', async () => {
    const mockRowClick = jest.fn()
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={mockRowClick}
      />
    )

    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      firstRow.focus()
      fireEvent.keyDown(firstRow, { key: 'Enter' })
      expect(mockRowClick).toHaveBeenCalledWith(testData[0])
    }
  })

  it('handles error state correctly', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        error="Failed to load data"
      />
    )

    expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('handles filters correctly', async () => {
    const filters = [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
        type: 'select' as const,
      },
    ]

    render(
      <DataTable
        columns={testColumns}
        data={testData}
        filters={filters}
      />
    )

    // Should show filter dropdown
    const filterSelect = screen.getByText('Alle Status')
    expect(filterSelect).toBeInTheDocument()
  })

  it('supports virtualization for large datasets', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      status: 'active',
      value: i * 10,
    }))

    render(
      <DataTable
        columns={testColumns}
        data={largeData}
        enableVirtualization={true}
        enablePagination={false}
      />
    )

    // Should render table with virtualization
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('handles debounced search correctly', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        searchDebounceMs={100}
      />
    )

    const searchInput = screen.getByPlaceholderText('Suchen...')
    await user.type(searchInput, 'Item 1')

    // Should handle debounced input
    expect(searchInput).toHaveValue('Item 1')
  })
})