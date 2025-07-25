import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Table, Column } from '@tanstack/react-table'
import { DataTableToolbar, FilterConfig } from './data-table-toolbar'

// Mock the table object
const createMockTable = (overrides = {}) => {
  const mockColumn = {
    getFilterValue: jest.fn(() => undefined),
    setFilterValue: jest.fn(),
    getCanHide: jest.fn(() => true),
    getIsVisible: jest.fn(() => true),
    toggleVisibility: jest.fn(),
    columnDef: { header: 'Test Column' },
    id: 'testColumn',
    accessorFn: jest.fn(),
  } as unknown as Column<any, any>

  return {
    getState: jest.fn(() => ({
      columnFilters: [],
      globalFilter: '',
    })),
    setGlobalFilter: jest.fn(),
    resetColumnFilters: jest.fn(),
    getColumn: jest.fn(() => mockColumn),
    getAllColumns: jest.fn(() => [mockColumn]),
    ...overrides,
  } as unknown as Table<any>
}

const mockFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Aktiv', value: 'active' },
      { label: 'Inaktiv', value: 'inactive' },
    ],
    type: 'select',
  },
]

describe('DataTableToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input correctly', () => {
    const table = createMockTable()
    render(<DataTableToolbar table={table} />)
    
    const searchInput = screen.getByPlaceholderText('Suchen...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('aria-label', 'Globale Suche')
  })

  it('renders custom search placeholder', () => {
    const table = createMockTable()
    render(<DataTableToolbar table={table} searchPlaceholder="Häuser suchen..." />)
    
    expect(screen.getByPlaceholderText('Häuser suchen...')).toBeInTheDocument()
  })

  it('calls setGlobalFilter when search input changes', async () => {
    const table = createMockTable()
    render(<DataTableToolbar table={table} />)
    
    const searchInput = screen.getByPlaceholderText('Suchen...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })
    
    expect(table.setGlobalFilter).toHaveBeenCalledWith('test search')
  })

  it('displays current global filter value', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        columnFilters: [],
        globalFilter: 'existing search',
      })),
    })
    
    render(<DataTableToolbar table={table} />)
    
    const searchInput = screen.getByDisplayValue('existing search')
    expect(searchInput).toBeInTheDocument()
  })

  it('renders filter dropdowns when filters are provided', () => {
    const table = createMockTable()
    render(<DataTableToolbar table={table} filters={mockFilters} />)
    
    // The filter dropdown shows "Alle Status" as the default placeholder
    expect(screen.getByText('Alle Status')).toBeInTheDocument()
  })

  it('calls column setFilterValue when filter is changed', async () => {
    const user = userEvent.setup()
    const mockColumn = {
      getFilterValue: jest.fn(() => undefined),
      setFilterValue: jest.fn(),
    }
    const table = createMockTable({
      getColumn: jest.fn(() => mockColumn),
    })
    
    render(<DataTableToolbar table={table} filters={mockFilters} />)
    
    const filterSelect = screen.getByRole('combobox')
    await user.click(filterSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Aktiv')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Aktiv'))
    
    expect(mockColumn.setFilterValue).toHaveBeenCalledWith('active')
  })

  it('clears filter when "Alle" option is selected', async () => {
    const user = userEvent.setup()
    const mockColumn = {
      getFilterValue: jest.fn(() => 'active'),
      setFilterValue: jest.fn(),
    }
    const table = createMockTable({
      getColumn: jest.fn(() => mockColumn),
    })
    
    render(<DataTableToolbar table={table} filters={mockFilters} />)
    
    const filterSelect = screen.getByRole('combobox')
    await user.click(filterSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Alle Status')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Alle Status'))
    
    expect(mockColumn.setFilterValue).toHaveBeenCalledWith(undefined)
  })

  it('shows reset button when filters are active', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        columnFilters: [{ id: 'status', value: 'active' }],
        globalFilter: '',
      })),
    })
    
    render(<DataTableToolbar table={table} />)
    
    expect(screen.getByText('Zurücksetzen')).toBeInTheDocument()
  })

  it('shows reset button when global filter is active', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        columnFilters: [],
        globalFilter: 'search term',
      })),
    })
    
    render(<DataTableToolbar table={table} />)
    
    expect(screen.getByText('Zurücksetzen')).toBeInTheDocument()
  })

  it('calls reset functions when reset button is clicked', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        columnFilters: [{ id: 'status', value: 'active' }],
        globalFilter: 'search',
      })),
    })
    
    render(<DataTableToolbar table={table} />)
    
    const resetButton = screen.getByText('Zurücksetzen')
    fireEvent.click(resetButton)
    
    expect(table.resetColumnFilters).toHaveBeenCalled()
    expect(table.setGlobalFilter).toHaveBeenCalledWith('')
  })

  it('renders export dropdown when enableExport is true and onExport is provided', () => {
    const table = createMockTable()
    const mockOnExport = jest.fn()
    
    render(<DataTableToolbar table={table} enableExport={true} onExport={mockOnExport} />)
    
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('does not render export dropdown when enableExport is false', () => {
    const table = createMockTable()
    const mockOnExport = jest.fn()
    
    render(<DataTableToolbar table={table} enableExport={false} onExport={mockOnExport} />)
    
    expect(screen.queryByText('Export')).not.toBeInTheDocument()
  })

  it('calls onExport with correct format when export option is clicked', async () => {
    const user = userEvent.setup()
    const table = createMockTable()
    const mockOnExport = jest.fn()
    
    render(<DataTableToolbar table={table} onExport={mockOnExport} />)
    
    const exportButton = screen.getByText('Export')
    await user.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('CSV'))
    
    expect(mockOnExport).toHaveBeenCalledWith('csv')
  })

  it('renders column visibility dropdown when enableColumnVisibility is true', () => {
    const table = createMockTable()
    
    render(<DataTableToolbar table={table} enableColumnVisibility={true} />)
    
    expect(screen.getByText('Spalten')).toBeInTheDocument()
  })

  it('does not render column visibility dropdown when enableColumnVisibility is false', () => {
    const table = createMockTable()
    
    render(<DataTableToolbar table={table} enableColumnVisibility={false} />)
    
    expect(screen.queryByText('Spalten')).not.toBeInTheDocument()
  })

  it('shows column visibility options when dropdown is opened', async () => {
    const user = userEvent.setup()
    const table = createMockTable()
    
    render(<DataTableToolbar table={table} />)
    
    const columnsButton = screen.getByText('Spalten')
    await user.click(columnsButton)
    
    await waitFor(() => {
      expect(screen.getByText('Spalten anzeigen')).toBeInTheDocument()
    })
    expect(screen.getByText('Test Column')).toBeInTheDocument()
  })

  it('calls toggleVisibility when column visibility is changed', async () => {
    const user = userEvent.setup()
    const mockColumn = {
      getFilterValue: jest.fn(() => undefined),
      setFilterValue: jest.fn(),
      getCanHide: jest.fn(() => true),
      getIsVisible: jest.fn(() => true),
      toggleVisibility: jest.fn(),
      columnDef: { header: 'Test Column' },
      id: 'testColumn',
      accessorFn: jest.fn(),
    }
    const table = createMockTable({
      getAllColumns: jest.fn(() => [mockColumn]),
    })
    
    render(<DataTableToolbar table={table} />)
    
    const columnsButton = screen.getByText('Spalten')
    await user.click(columnsButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test Column')).toBeInTheDocument()
    })
    
    const columnCheckbox = screen.getByRole('menuitemcheckbox')
    await user.click(columnCheckbox)
    
    expect(mockColumn.toggleVisibility).toHaveBeenCalledWith(false)
  })
})