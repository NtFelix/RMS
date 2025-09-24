import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'

// Mock the bulk operations context
const mockSelectRow = jest.fn()
const mockUseBulkOperations = {
  state: {
    selectedIds: new Set<string>(),
    tableType: null,
    isLoading: false,
    error: null,
  },
  selectRow: mockSelectRow,
  selectAll: jest.fn(),
  clearSelection: jest.fn(),
  setTableType: jest.fn(),
  performBulkOperation: jest.fn(),
}

jest.mock('@/context/bulk-operations-context', () => ({
  ...jest.requireActual('@/context/bulk-operations-context'),
  useBulkOperations: () => mockUseBulkOperations,
}))

describe('RowSelectionCheckbox', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBulkOperations.state.selectedIds = new Set<string>()
  })

  it('renders checkbox with correct aria-label', () => {
    render(<RowSelectionCheckbox rowId="test-id" />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('aria-label', 'Select row test-id')
  })

  it('shows unchecked state when row is not selected', () => {
    render(<RowSelectionCheckbox rowId="test-id" />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('shows checked state when row is selected', () => {
    mockUseBulkOperations.state.selectedIds = new Set(['test-id'])
    
    render(<RowSelectionCheckbox rowId="test-id" />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('calls selectRow when checkbox is clicked', () => {
    render(<RowSelectionCheckbox rowId="test-id" />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(mockSelectRow).toHaveBeenCalledWith('test-id')
  })

  it('prevents event bubbling on container click', () => {
    const mockParentClick = jest.fn()
    
    render(
      <div onClick={mockParentClick}>
        <RowSelectionCheckbox rowId="test-id" />
      </div>
    )
    
    const container = screen.getByRole('checkbox').parentElement
    fireEvent.click(container!)
    
    expect(mockParentClick).not.toHaveBeenCalled()
  })

  it('disables checkbox when disabled prop is true', () => {
    render(<RowSelectionCheckbox rowId="test-id" disabled />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('disables checkbox when bulk operations are loading', () => {
    mockUseBulkOperations.state.isLoading = true
    
    render(<RowSelectionCheckbox rowId="test-id" />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('does not call selectRow when disabled', () => {
    render(<RowSelectionCheckbox rowId="test-id" disabled />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(mockSelectRow).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<RowSelectionCheckbox rowId="test-id" className="custom-class" />)
    
    const container = screen.getByRole('checkbox').parentElement
    expect(container).toHaveClass('custom-class')
  })
})