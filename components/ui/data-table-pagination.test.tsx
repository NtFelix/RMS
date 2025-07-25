import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Table } from '@tanstack/react-table'
import { DataTablePagination } from './data-table-pagination'

// Mock the table object
const createMockTable = (overrides = {}) => ({
  getFilteredSelectedRowModel: jest.fn(() => ({ rows: [] })),
  getFilteredRowModel: jest.fn(() => ({ rows: Array(50).fill({}) })),
  getState: jest.fn(() => ({
    pagination: { pageIndex: 0, pageSize: 10 }
  })),
  getPageCount: jest.fn(() => 5),
  setPageSize: jest.fn(),
  setPageIndex: jest.fn(),
  previousPage: jest.fn(),
  nextPage: jest.fn(),
  getCanPreviousPage: jest.fn(() => false),
  getCanNextPage: jest.fn(() => true),
  ...overrides,
}) as unknown as Table<any>

describe('DataTablePagination', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders pagination controls correctly', () => {
    const table = createMockTable()
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByText('Zeilen pro Seite')).toBeInTheDocument()
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur ersten Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur vorherigen Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur nächsten Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur letzten Seite')).toBeInTheDocument()
  })

  it('displays selected row count when rows are selected', () => {
    const table = createMockTable({
      getFilteredSelectedRowModel: jest.fn(() => ({ rows: Array(3).fill({}) })),
    })
    
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByText('3 von 50 Zeile(n) ausgewählt.')).toBeInTheDocument()
  })

  it('hides selected row count when showSelectedCount is false', () => {
    const table = createMockTable({
      getFilteredSelectedRowModel: jest.fn(() => ({ rows: Array(3).fill({}) })),
    })
    
    render(<DataTablePagination table={table} showSelectedCount={false} />)
    
    expect(screen.queryByText('3 von 50 Zeile(n) ausgewählt.')).not.toBeInTheDocument()
  })

  it('displays correct page information for different pages', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        pagination: { pageIndex: 2, pageSize: 10 }
      })),
    })
    
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByText('Seite 3 von 5')).toBeInTheDocument()
  })

  it('calls setPageSize when page size is changed', async () => {
    const user = userEvent.setup()
    const table = createMockTable()
    render(<DataTablePagination table={table} />)
    
    const select = screen.getByRole('combobox')
    await user.click(select)
    
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('20'))
    
    expect(table.setPageSize).toHaveBeenCalledWith(20)
  })

  it('uses custom page size options when provided', async () => {
    const user = userEvent.setup()
    const table = createMockTable()
    const customPageSizes = [5, 15, 25]
    
    render(<DataTablePagination table={table} pageSizeOptions={customPageSizes} />)
    
    const select = screen.getByRole('combobox')
    await user.click(select)
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.queryByText('10')).not.toBeInTheDocument()
  })

  it('calls setPageIndex(0) when first page button is clicked', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        pagination: { pageIndex: 2, pageSize: 10 }
      })),
      getCanPreviousPage: jest.fn(() => true),
    })
    
    render(<DataTablePagination table={table} />)
    
    const firstPageButton = screen.getByLabelText('Zur ersten Seite')
    fireEvent.click(firstPageButton)
    
    expect(table.setPageIndex).toHaveBeenCalledWith(0)
  })

  it('calls previousPage when previous button is clicked', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        pagination: { pageIndex: 2, pageSize: 10 }
      })),
      getCanPreviousPage: jest.fn(() => true),
    })
    
    render(<DataTablePagination table={table} />)
    
    const previousButton = screen.getByLabelText('Zur vorherigen Seite')
    fireEvent.click(previousButton)
    
    expect(table.previousPage).toHaveBeenCalled()
  })

  it('calls nextPage when next button is clicked', () => {
    const table = createMockTable()
    render(<DataTablePagination table={table} />)
    
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    fireEvent.click(nextButton)
    
    expect(table.nextPage).toHaveBeenCalled()
  })

  it('calls setPageIndex with last page when last page button is clicked', () => {
    const table = createMockTable()
    render(<DataTablePagination table={table} />)
    
    const lastPageButton = screen.getByLabelText('Zur letzten Seite')
    fireEvent.click(lastPageButton)
    
    expect(table.setPageIndex).toHaveBeenCalledWith(4) // pageCount - 1
  })

  it('disables previous buttons when on first page', () => {
    const table = createMockTable({
      getCanPreviousPage: jest.fn(() => false),
    })
    
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByLabelText('Zur ersten Seite')).toBeDisabled()
    expect(screen.getByLabelText('Zur vorherigen Seite')).toBeDisabled()
  })

  it('disables next buttons when on last page', () => {
    const table = createMockTable({
      getState: jest.fn(() => ({
        pagination: { pageIndex: 4, pageSize: 10 }
      })),
      getCanNextPage: jest.fn(() => false),
    })
    
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByLabelText('Zur nächsten Seite')).toBeDisabled()
    expect(screen.getByLabelText('Zur letzten Seite')).toBeDisabled()
  })

  it('handles single page scenario correctly', () => {
    const table = createMockTable({
      getPageCount: jest.fn(() => 1),
      getCanPreviousPage: jest.fn(() => false),
      getCanNextPage: jest.fn(() => false),
    })
    
    render(<DataTablePagination table={table} />)
    
    expect(screen.getByText('Seite 1 von 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur ersten Seite')).toBeDisabled()
    expect(screen.getByLabelText('Zur vorherigen Seite')).toBeDisabled()
    expect(screen.getByLabelText('Zur nächsten Seite')).toBeDisabled()
    expect(screen.getByLabelText('Zur letzten Seite')).toBeDisabled()
  })
})