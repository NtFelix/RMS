import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'

// Mock the bulk operations context
const mockSelectAll = jest.fn()
const mockUseBulkOperations = {
  state: {
    selectedIds: new Set<string>(),
    tableType: null,
    isLoading: false,
    error: null,
  },
  selectAll: mockSelectAll,
}

jest.mock('@/context/bulk-operations-context', () => ({
  ...jest.requireActual('@/context/bulk-operations-context'),
  useBulkOperations: () => mockUseBulkOperations,
}))

describe('SelectAllCheckbox', () => {
  const defaultProps = {
    allIds: ['1', '2', '3'],
    selectedIds: new Set<string>(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBulkOperations.state.selectedIds = new Set<string>()
    mockUseBulkOperations.state.isLoading = false
  })

  describe('Rendering', () => {
    it('renders checkbox with correct aria-label when none selected', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toHaveAttribute('aria-label', 'Select all rows')
    })

    it('renders checkbox with correct aria-label when all selected', () => {
      const selectedIds = new Set(['1', '2', '3'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Deselect all rows')
    })

    it('renders checkbox with correct aria-label when some selected', () => {
      const selectedIds = new Set(['1', '2'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Select all rows (some selected)')
    })
  })

  describe('Selection States', () => {
    it('shows unchecked state when no rows are selected', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
      expect(checkbox).not.toHaveAttribute('data-state', 'indeterminate')
    })

    it('shows checked state when all rows are selected', () => {
      const selectedIds = new Set(['1', '2', '3'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('shows indeterminate state when some rows are selected', () => {
      const selectedIds = new Set(['1', '2'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
    })

    it('shows unchecked state when allIds is empty', () => {
      render(<SelectAllCheckbox {...defaultProps} allIds={[]} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('handles case where selected IDs include items not in allIds', () => {
      const selectedIds = new Set(['1', '2', '4', '5']) // 4 and 5 not in allIds
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      // Should only consider IDs that are in allIds (1, 2 out of 1, 2, 3)
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
    })
  })

  describe('Interactions', () => {
    it('calls selectAll when checkbox is clicked and none are selected', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSelectAll).toHaveBeenCalledWith(['1', '2', '3'])
    })

    it('calls selectAll when checkbox is clicked and some are selected', () => {
      const selectedIds = new Set(['1'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSelectAll).toHaveBeenCalledWith(['1', '2', '3'])
    })

    it('calls selectAll when checkbox is clicked and all are selected (to deselect)', () => {
      const selectedIds = new Set(['1', '2', '3'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSelectAll).toHaveBeenCalledWith(['1', '2', '3'])
    })

    it('prevents event bubbling on container click', () => {
      const mockParentClick = jest.fn()
      
      render(
        <div onClick={mockParentClick}>
          <SelectAllCheckbox {...defaultProps} />
        </div>
      )
      
      const container = screen.getByRole('checkbox').parentElement
      fireEvent.click(container!)
      
      expect(mockParentClick).not.toHaveBeenCalled()
    })
  })

  describe('Disabled States', () => {
    it('disables checkbox when disabled prop is true', () => {
      render(<SelectAllCheckbox {...defaultProps} disabled />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('disables checkbox when bulk operations are loading', () => {
      mockUseBulkOperations.state.isLoading = true
      
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('disables checkbox when allIds is empty', () => {
      render(<SelectAllCheckbox {...defaultProps} allIds={[]} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('does not call selectAll when disabled', () => {
      render(<SelectAllCheckbox {...defaultProps} disabled />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSelectAll).not.toHaveBeenCalled()
    })

    it('does not call selectAll when loading', () => {
      mockUseBulkOperations.state.isLoading = true
      
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      expect(mockSelectAll).not.toHaveBeenCalled()
    })
  })

  describe('Visual States', () => {
    it('applies correct CSS classes for unchecked state', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('border-primary')
      expect(checkbox).not.toHaveClass('bg-blue-600')
    })

    it('applies correct CSS classes for checked state', () => {
      const selectedIds = new Set(['1', '2', '3'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('bg-blue-600', 'border-blue-600', 'text-white')
    })

    it('applies correct CSS classes for indeterminate state', () => {
      const selectedIds = new Set(['1', '2'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass('bg-blue-600', 'border-blue-600', 'text-white')
    })

    it('applies custom className', () => {
      render(<SelectAllCheckbox {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('checkbox').parentElement
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('Icons', () => {
    it('shows Check icon when all selected', () => {
      const selectedIds = new Set(['1', '2', '3'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      // Check for the presence of the Check icon (Lucide Check component)
      const checkbox = screen.getByRole('checkbox')
      const indicator = checkbox.querySelector('svg')
      expect(indicator).toBeInTheDocument()
    })

    it('shows Minus icon when some selected (indeterminate)', () => {
      const selectedIds = new Set(['1', '2'])
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      // Check for the presence of the Minus icon (Lucide Minus component)
      const checkbox = screen.getByRole('checkbox')
      const indicator = checkbox.querySelector('svg')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty allIds array', () => {
      render(<SelectAllCheckbox {...defaultProps} allIds={[]} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
      expect(checkbox).not.toBeChecked()
    })

    it('handles single item in allIds', () => {
      render(<SelectAllCheckbox {...defaultProps} allIds={['1']} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeDisabled()
      expect(checkbox).not.toBeChecked()
    })

    it('handles single item selected in single item allIds', () => {
      const selectedIds = new Set(['1'])
      render(<SelectAllCheckbox {...defaultProps} allIds={['1']} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
      expect(checkbox).not.toHaveAttribute('data-state', 'indeterminate')
    })

    it('handles selectedIds with items not in allIds', () => {
      const selectedIds = new Set(['1', '4', '5']) // 4 and 5 not in allIds
      render(<SelectAllCheckbox {...defaultProps} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      // Should only consider '1' from allIds ['1', '2', '3']
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
    })

    it('handles large number of items', () => {
      const allIds = Array.from({ length: 1000 }, (_, i) => i.toString())
      const selectedIds = new Set(allIds.slice(0, 500))
      
      render(<SelectAllCheckbox allIds={allIds} selectedIds={selectedIds} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
    })
  })

  describe('Accessibility', () => {
    it('has proper role and accessibility attributes', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('role', 'checkbox')
      expect(checkbox).toHaveAttribute('aria-label')
    })

    it('updates aria-label based on selection state', () => {
      const { rerender } = render(<SelectAllCheckbox {...defaultProps} />)
      
      let checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Select all rows')
      
      // Update to some selected
      const someSelected = new Set(['1'])
      rerender(<SelectAllCheckbox {...defaultProps} selectedIds={someSelected} />)
      
      checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Select all rows (some selected)')
      
      // Update to all selected
      const allSelected = new Set(['1', '2', '3'])
      rerender(<SelectAllCheckbox {...defaultProps} selectedIds={allSelected} />)
      
      checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Deselect all rows')
    })

    it('supports keyboard navigation', () => {
      render(<SelectAllCheckbox {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox')
      
      // Should be focusable
      checkbox.focus()
      expect(checkbox).toHaveFocus()
      
      // Should respond to Enter key (Radix checkbox responds to Enter, not Space for programmatic events)
      fireEvent.click(checkbox)
      expect(mockSelectAll).toHaveBeenCalledWith(['1', '2', '3'])
    })
  })
})