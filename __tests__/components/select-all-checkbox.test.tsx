import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'

// Mock the bulk operations context
const mockSelectAll = jest.fn()
const mockUseBulkOperations = {
  state: {
    selectedIds: new Set<string>(),
    tableType: null,
    isLoading: false,
    error: null,
  },
  selectRow: jest.fn(),
  selectAll: mockSelectAll,
  clearSelection: jest.fn(),
  setTableType: jest.fn(),
  performBulkOperation: jest.fn(),
}

jest.mock('@/context/bulk-operations-context', () => ({
  ...jest.requireActual('@/context/bulk-operations-context'),
  useBulkOperations: () => mockUseBulkOperations,
}))

describe('SelectAllCheckbox', () => {
  const allIds = ['id1', 'id2', 'id3']
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBulkOperations.state.isLoading = false
  })

  it('renders checkbox with correct aria-label when none selected', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('aria-label', 'Select all rows')
  })

  it('shows unchecked state when no rows are selected', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('shows checked state when all rows are selected', () => {
    const selectedIds = new Set(['id1', 'id2', 'id3'])
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveAttribute('aria-label', 'Deselect all rows')
  })

  it('shows indeterminate state when some rows are selected', () => {
    const selectedIds = new Set(['id1', 'id2'])
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toHaveAttribute('aria-label', 'Select all rows (some selected)')
    
    // Check for indeterminate state (this is set via useEffect on the DOM element)
    expect(checkbox).toHaveProperty('indeterminate', true)
  })

  it('calls selectAll when checkbox is clicked', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(mockSelectAll).toHaveBeenCalledWith(allIds)
  })

  it('prevents event bubbling on container click', () => {
    const mockParentClick = jest.fn()
    const selectedIds = new Set<string>()
    
    render(
      <div onClick={mockParentClick}>
        <SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />
      </div>
    )
    
    const container = screen.getByRole('checkbox').parentElement
    fireEvent.click(container!)
    
    expect(mockParentClick).not.toHaveBeenCalled()
  })

  it('disables checkbox when disabled prop is true', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} disabled />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('disables checkbox when bulk operations are loading', () => {
    mockUseBulkOperations.state.isLoading = true
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('disables checkbox when allIds is empty', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={[]} selectedIds={selectedIds} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('does not call selectAll when disabled', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} disabled />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(mockSelectAll).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const selectedIds = new Set<string>()
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} className="custom-class" />)
    
    const container = screen.getByRole('checkbox').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('sets indeterminate state when some rows are selected', () => {
    const selectedIds = new Set(['id1'])
    
    render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
    
    // Verify the checkbox is in indeterminate state
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveProperty('indeterminate', true)
    expect(checkbox).not.toBeChecked()
  })
})