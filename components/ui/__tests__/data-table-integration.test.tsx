import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table'
import { exportTableData } from '@/lib/data-export'

// Mock dependencies
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: any, delay: number) => {
    // Return a function that calls the original with a minimal delay for testing
    return (...args: any[]) => {
      setTimeout(() => fn(...args), 10)
    }
  },
}))

jest.mock('@/lib/data-export', () => ({
  exportTableData: jest.fn().mockResolvedValue(undefined),
}))

// Test data
interface TestItem {
  id: string
  name: string
  category: string
  status: 'active' | 'inactive'
  value: number
  date: string
}

const generateTestData = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `Item ${i + 1}`,
    category: i % 2 === 0 ? 'Category A' : 'Category B',
    status: i % 3 === 0 ? 'inactive' : 'active',
    value: (i + 1) * 100,
    date: new Date(2024, 0, i + 1).toISOString(),
  }))

const testColumns: ColumnDef<TestItem>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      if (value === 'all') return true
      return row.getValue(id) === value
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <span className={status === 'active' ? 'text-green-600' : 'text-red-600'}>
          {status}
        </span>
      )
    },
    filterFn: (row, id, value) => {
      if (value === 'all') return true
      return row.getValue(id) === value
    },
  },
  {
    accessorKey: 'value',
    header: 'Value',
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => `$${row.getValue('value')}`,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => new Date(row.getValue('date')).toLocaleDateString('de-DE'),
  },
]

const filters = [
  {
    key: 'category',
    label: 'Category',
    options: [
      { label: 'Category A', value: 'Category A' },
      { label: 'Category B', value: 'Category B' },
    ],
    type: 'select' as const,
  },
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

describe('DataTable Integration Tests', () => {
  const user = userEvent.setup()
  const mockExport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockExport.mockClear()
  })

  it('handles complete search, filter, sort, and pagination workflow', async () => {
    const data = generateTestData(50)
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        searchPlaceholder="Search items..."
        filters={filters}
        enableSelection={true}
        enablePagination={true}
        enableColumnVisibility={true}
        enableExport={true}
        onExport={mockExport}
      />
    )

    // Initial state - should show first 10 items
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()

    // Test search functionality
    const searchInput = screen.getByPlaceholderText('Search items...')
    await user.type(searchInput, 'Item 1')
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 10')).toBeInTheDocument()
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
    })

    // Clear search
    await user.clear(searchInput)
    await waitFor(() => {
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    // Test filtering
    const categoryFilter = screen.getByDisplayValue('Alle Category')
    await user.click(categoryFilter)
    await user.click(screen.getByText('Category A'))

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument() // Category A
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument() // Category B
    })

    // Test sorting
    const nameHeader = screen.getByText('Name')
    await user.click(nameHeader)
    
    // Should sort in ascending order
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    // Test pagination with filtered data
    if (screen.queryByLabelText('Zur nächsten Seite')) {
      const nextButton = screen.getByLabelText('Zur nächsten Seite')
      if (!nextButton.hasAttribute('disabled')) {
        await user.click(nextButton)
        await waitFor(() => {
          expect(screen.getByText(/Seite 2/)).toBeInTheDocument()
        })
      }
    }
  })

  it('handles row selection workflow', async () => {
    const data = generateTestData(20)
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        enableSelection={true}
        enablePagination={true}
      />
    )

    // Select individual rows
    const rowCheckboxes = screen.getAllByLabelText('Zeile auswählen')
    await user.click(rowCheckboxes[0])
    await user.click(rowCheckboxes[1])

    // Should show selection count
    expect(screen.getByText(/2 von \d+ Zeile\(n\) ausgewählt/)).toBeInTheDocument()

    // Test select all
    const selectAllCheckbox = screen.getByLabelText('Alle auswählen')
    await user.click(selectAllCheckbox)

    // Should select all visible rows
    expect(screen.getByText(/10 von \d+ Zeile\(n\) ausgewählt/)).toBeInTheDocument()
  })

  it('handles column visibility workflow', async () => {
    const data = generateTestData(10)
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        enableColumnVisibility={true}
      />
    )

    // Initially all columns should be visible
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Open column visibility menu
    const columnsButton = screen.getByText('Spalten')
    await user.click(columnsButton)

    // Hide a column
    const categoryToggle = screen.getByRole('menuitemcheckbox', { name: /Category/ })
    await user.click(categoryToggle)

    // Category column should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Category')).not.toBeInTheDocument()
    })

    // Show column again
    await user.click(columnsButton)
    await user.click(categoryToggle)

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument()
    })
  })

  it('handles export workflow', async () => {
    const data = generateTestData(15)
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        enableExport={true}
        onExport={mockExport}
      />
    )

    // Test CSV export
    const exportButton = screen.getByText('Export')
    await user.click(exportButton)

    const csvOption = screen.getByText('CSV')
    await user.click(csvOption)

    expect(mockExport).toHaveBeenCalledWith('csv')

    // Test PDF export
    await user.click(exportButton)
    const pdfOption = screen.getByText('PDF')
    await user.click(pdfOption)

    expect(mockExport).toHaveBeenCalledWith('pdf')
  })

  it('handles complex filtering combinations', async () => {
    const data = generateTestData(30)
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        searchPlaceholder="Search..."
        filters={filters}
      />
    )

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'Item 1')

    // Apply category filter
    const categoryFilter = screen.getByDisplayValue('Alle Category')
    await user.click(categoryFilter)
    await user.click(screen.getByText('Category A'))

    // Apply status filter
    const statusFilter = screen.getByDisplayValue('Alle Status')
    await user.click(statusFilter)
    await user.click(screen.getByText('Active'))

    // Should show filtered results
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      // Should have header + filtered data rows
      expect(rows.length).toBeGreaterThan(1)
    })

    // Clear all filters
    const clearButton = screen.getByText('Zurücksetzen')
    await user.click(clearButton)

    await waitFor(() => {
      expect(searchInput).toHaveValue('')
      expect(screen.getByDisplayValue('Alle Category')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Alle Status')).toBeInTheDocument()
    })
  })

  it('handles row click interactions', async () => {
    const data = generateTestData(10)
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        onRowClick={mockRowClick}
      />
    )

    // Click on a row
    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      await user.click(firstRow)
      expect(mockRowClick).toHaveBeenCalledWith(data[0])
    }
  })

  it('handles keyboard navigation', async () => {
    const data = generateTestData(10)
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={testColumns}
        data={data}
        onRowClick={mockRowClick}
      />
    )

    // Focus on first row and press Enter
    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      firstRow.focus()
      await user.keyboard('{Enter}')
      expect(mockRowClick).toHaveBeenCalledWith(data[0])
    }
  })

  it('handles error states gracefully', () => {
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

  it('handles loading states', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        loading={true}
      />
    )

    // Should show skeleton loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('handles large datasets with virtualization', () => {
    const largeData = generateTestData(1000)
    
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
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })
})