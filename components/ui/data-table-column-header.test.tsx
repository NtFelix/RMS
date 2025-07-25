import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Column } from '@tanstack/react-table'
import { DataTableColumnHeader } from './data-table-column-header'

// Mock the column object
const createMockColumn = (overrides = {}) => ({
  getCanSort: jest.fn(() => true),
  getIsSorted: jest.fn(() => false),
  toggleSorting: jest.fn(),
  toggleVisibility: jest.fn(),
  ...overrides,
}) as unknown as Column<any, any>

describe('DataTableColumnHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders title correctly', () => {
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" />)
    
    expect(screen.getByText('Test Column')).toBeInTheDocument()
  })

  it('renders as plain div when column cannot be sorted', () => {
    const column = createMockColumn({
      getCanSort: jest.fn(() => false)
    })
    
    render(<DataTableColumnHeader column={column} title="Non-sortable Column" />)
    
    expect(screen.getByText('Non-sortable Column')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows correct sort indicator for ascending sort', () => {
    const column = createMockColumn({
      getIsSorted: jest.fn(() => 'asc')
    })
    
    render(<DataTableColumnHeader column={column} title="Sorted Column" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Sortiert nach Sorted Column aufsteigend. Klicken um absteigend zu sortieren.')
  })

  it('shows correct sort indicator for descending sort', () => {
    const column = createMockColumn({
      getIsSorted: jest.fn(() => 'desc')
    })
    
    render(<DataTableColumnHeader column={column} title="Sorted Column" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Sortiert nach Sorted Column absteigend. Klicken um aufsteigend zu sortieren.')
  })

  it('shows correct sort indicator for unsorted column', () => {
    const column = createMockColumn()
    
    render(<DataTableColumnHeader column={column} title="Unsorted Column" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Sortieren nach Unsorted Column')
  })

  it('opens dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Aufsteigend')).toBeInTheDocument()
    })
    expect(screen.getByText('Absteigend')).toBeInTheDocument()
    expect(screen.getByText('Ausblenden')).toBeInTheDocument()
  })

  it('calls toggleSorting with false when ascending option is clicked', async () => {
    const user = userEvent.setup()
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Aufsteigend')).toBeInTheDocument()
    })
    
    const ascendingOption = screen.getByText('Aufsteigend')
    await user.click(ascendingOption)
    
    expect(column.toggleSorting).toHaveBeenCalledWith(false)
  })

  it('calls toggleSorting with true when descending option is clicked', async () => {
    const user = userEvent.setup()
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Absteigend')).toBeInTheDocument()
    })
    
    const descendingOption = screen.getByText('Absteigend')
    await user.click(descendingOption)
    
    expect(column.toggleSorting).toHaveBeenCalledWith(true)
  })

  it('calls toggleVisibility with false when hide option is clicked', () => {
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    const hideOption = screen.getByText('Ausblenden')
    fireEvent.click(hideOption)
    
    expect(column.toggleVisibility).toHaveBeenCalledWith(false)
  })

  it('applies custom className', () => {
    const column = createMockColumn()
    render(<DataTableColumnHeader column={column} title="Test Column" className="custom-class" />)
    
    const container = screen.getByText('Test Column').closest('div')
    expect(container).toHaveClass('custom-class')
  })
})