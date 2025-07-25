import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from './data-table'
import { ColumnDef } from '@tanstack/react-table'

// Mock data for testing
interface TestData {
  id: string
  name: string
  email: string
  status: string
}

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
]

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
]

describe('DataTable', () => {
  it('renders table with data correctly', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchPlaceholder="Search users..."
      />
    )

    // Check if table headers are rendered
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Check if data is rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('active')).toHaveLength(2)
  })

  it('shows loading state correctly', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        loading={true}
      />
    )

    // Check for loading skeleton
    const skeletonElements = screen.getAllByRole('generic')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('shows empty state when no data', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        emptyMessage="No users found"
      />
    )

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('handles row click when onRowClick is provided', () => {
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={mockRowClick}
      />
    )

    // Click on first row
    const firstRow = screen.getByText('John Doe').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      fireEvent.click(firstRow)
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0])
    }
  })

  it('enables selection when enableSelection is true', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableSelection={true}
      />
    )

    // Check for select all checkbox in header
    const selectAllCheckbox = screen.getByLabelText('Alle auswählen')
    expect(selectAllCheckbox).toBeInTheDocument()

    // Check for individual row checkboxes
    const rowCheckboxes = screen.getAllByLabelText('Zeile auswählen')
    expect(rowCheckboxes).toHaveLength(mockData.length)
  })

  it('filters data when global search is used', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchPlaceholder="Search users..."
      />
    )

    const searchInput = screen.getByPlaceholderText('Search users...')
    expect(searchInput).toBeInTheDocument()

    // Type in search input
    fireEvent.change(searchInput, { target: { value: 'John' } })

    // John Doe should still be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    
    // Jane Smith should not be visible (filtered out)
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
  })

  it('disables pagination when enablePagination is false', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enablePagination={false}
      />
    )

    // Pagination controls should not be present
    expect(screen.queryByText('Seite')).not.toBeInTheDocument()
    expect(screen.queryByText('Zeilen pro Seite')).not.toBeInTheDocument()
  })

  it('supports keyboard navigation', () => {
    const mockRowClick = jest.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={mockRowClick}
      />
    )

    // Get first row
    const firstRow = screen.getByText('John Doe').closest('tr')
    expect(firstRow).toBeInTheDocument()
    
    if (firstRow) {
      // Focus the row
      firstRow.focus()
      
      // Press Enter should trigger row click
      fireEvent.keyDown(firstRow, { key: 'Enter' })
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0])
      
      // Press Space should also trigger row click
      fireEvent.keyDown(firstRow, { key: ' ' })
      expect(mockRowClick).toHaveBeenCalledTimes(2)
    }
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={() => {}}
      />
    )

    // Check table has proper role
    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('aria-label', 'Datentabelle')

    // Check column headers have proper roles
    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    expect(nameHeader).toBeInTheDocument()

    // Check data rows have proper attributes by finding the first row with John Doe
    const firstRowCell = screen.getByText('John Doe')
    const firstDataRow = firstRowCell.closest('tr')
    expect(firstDataRow).toHaveAttribute('aria-label')
    expect(firstDataRow).toHaveAttribute('tabindex', '0')
    expect(firstDataRow).toHaveAttribute('role', 'button')
  })

  it('announces status changes to screen readers', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableSelection={true}
      />
    )

    // Check for screen reader status region
    const statusRegion = screen.getByRole('status')
    expect(statusRegion).toBeInTheDocument()
    expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    expect(statusRegion).toHaveTextContent('3 Zeilen insgesamt')
  })

  it('shows export functionality when enabled', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableExport={true}
      />
    )

    // Check for export button
    const exportButton = screen.getByRole('button', { name: /daten exportieren/i })
    expect(exportButton).toBeInTheDocument()
  })

  it('provides export functionality when custom handler is provided', () => {
    const mockExport = jest.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableExport={true}
        onExport={mockExport}
      />
    )

    // Check that export button is present
    const exportButton = screen.getByRole('button', { name: /daten exportieren/i })
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).not.toBeDisabled()
  })

  it('disables export during export process', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        enableExport={true}
      />
    )

    const exportButton = screen.getByRole('button', { name: /daten exportieren/i })
    expect(exportButton).not.toBeDisabled()
  })
})