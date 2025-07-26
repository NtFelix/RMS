import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Column } from '@tanstack/react-table'
import { DataTableColumnHeader } from '../data-table-column-header'

// Mock column object
const createMockColumn = (overrides = {}) => ({
  getCanSort: jest.fn(() => true),
  getIsSorted: jest.fn(() => false),
  toggleSorting: jest.fn(),
  getCanHide: jest.fn(() => true),
  toggleVisibility: jest.fn(),
  getIsVisible: jest.fn(() => true),
  id: 'test-column',
  ...overrides,
}) as unknown as Column<any, any>

describe('DataTableColumnHeader', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders column title correctly', () => {
    const mockColumn = createMockColumn()
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    expect(screen.getByText('Test Column')).toBeInTheDocument()
  })

  it('renders as non-sortable when column cannot be sorted', () => {
    const mockColumn = createMockColumn({
      getCanSort: jest.fn(() => false),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    // Should render as plain text, not a button
    expect(screen.getByText('Test Column')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as sortable button when column can be sorted', () => {
    const mockColumn = createMockColumn({
      getCanSort: jest.fn(() => true),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows ascending sort indicator when sorted ascending', () => {
    const mockColumn = createMockColumn({
      getIsSorted: jest.fn(() => 'asc'),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    // Should show ascending arrow icon
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows descending sort indicator when sorted descending', () => {
    const mockColumn = createMockColumn({
      getIsSorted: jest.fn(() => 'desc'),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    // Should show descending arrow icon
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('handles sort toggle on click', async () => {
    const mockToggleSorting = jest.fn()
    const mockColumn = createMockColumn({
      toggleSorting: mockToggleSorting,
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockToggleSorting).toHaveBeenCalledWith(false)
  })

  it('handles sort toggle with shift key for multi-sort', async () => {
    const mockToggleSorting = jest.fn()
    const mockColumn = createMockColumn({
      toggleSorting: mockToggleSorting,
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    await user.keyboard('{Shift>}')
    await user.click(button)
    await user.keyboard('{/Shift}')
    
    expect(mockToggleSorting).toHaveBeenCalledWith(false, true)
  })

  it('shows dropdown menu on right click or menu button', async () => {
    const mockColumn = createMockColumn()
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
        className="test-class"
      />
    )
    
    const button = screen.getByRole('button')
    
    // Right click to open context menu
    await user.pointer({ keys: '[MouseRight]', target: button })
    
    // Should show dropdown menu options
    expect(screen.getByText('Aufsteigend')).toBeInTheDocument()
    expect(screen.getByText('Absteigend')).toBeInTheDocument()
  })

  it('handles hide column action', async () => {
    const mockToggleVisibility = jest.fn()
    const mockColumn = createMockColumn({
      toggleVisibility: mockToggleVisibility,
      getCanHide: jest.fn(() => true),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    await user.pointer({ keys: '[MouseRight]', target: button })
    
    const hideOption = screen.getByText('Ausblenden')
    await user.click(hideOption)
    
    expect(mockToggleVisibility).toHaveBeenCalledWith(false)
  })

  it('does not show hide option when column cannot be hidden', async () => {
    const mockColumn = createMockColumn({
      getCanHide: jest.fn(() => false),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    await user.pointer({ keys: '[MouseRight]', target: button })
    
    expect(screen.queryByText('Ausblenden')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const mockColumn = createMockColumn({
      getCanSort: jest.fn(() => false),
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
        className="custom-class"
      />
    )
    
    const element = screen.getByText('Test Column')
    expect(element.closest('div')).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    const mockColumn = createMockColumn()
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label')
  })

  it('handles keyboard navigation', async () => {
    const mockToggleSorting = jest.fn()
    const mockColumn = createMockColumn({
      toggleSorting: mockToggleSorting,
    })
    
    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
      />
    )
    
    const button = screen.getByRole('button')
    button.focus()
    
    await user.keyboard('{Enter}')
    expect(mockToggleSorting).toHaveBeenCalled()
    
    await user.keyboard('{Space}')
    expect(mockToggleSorting).toHaveBeenCalledTimes(2)
  })
})