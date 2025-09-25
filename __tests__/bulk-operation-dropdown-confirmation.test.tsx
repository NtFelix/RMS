import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkOperationDropdown } from '@/components/bulk-operation-dropdown'
import { BulkOperation } from '@/types/bulk-operations'
import { BulkOperationConfirmationDialog } from '@/components/bulk-operation-confirmation-dialog'
import { Home, Trash2 } from 'lucide-react'

// Mock operations for testing
const mockOperations: BulkOperation[] = [
  {
    id: 'change-haus',
    label: 'Change Haus',
    icon: Home,
    requiresConfirmation: true,
    destructive: false,
    component: () => <div>Mock Component</div>
  },
  {
    id: 'delete',
    label: 'Delete Items',
    icon: Trash2,
    requiresConfirmation: true,
    destructive: true,
    component: () => <div>Mock Component</div>
  },
  {
    id: 'disabled-op',
    label: 'Disabled Operation',
    requiresConfirmation: true,
    disabled: true,
    disabledReason: 'Not available',
    component: () => <div>Mock Component</div>
  }
]

describe('BulkOperationDropdown', () => {
  const mockOnOperationSelect = jest.fn()

  beforeEach(() => {
    mockOnOperationSelect.mockClear()
  })

  it('should render dropdown trigger button', () => {
    render(
      <BulkOperationDropdown
        operations={mockOperations}
        selectedCount={3}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    expect(screen.getByRole('button', { name: /bulk actions/i })).toBeInTheDocument()
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <BulkOperationDropdown
        operations={mockOperations}
        selectedCount={3}
        isLoading={true}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should disable button when selectedCount is 0', () => {
    render(
      <BulkOperationDropdown
        operations={mockOperations}
        selectedCount={0}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should show operations in dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <BulkOperationDropdown
        operations={mockOperations}
        selectedCount={3}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    // Click the dropdown trigger
    await user.click(screen.getByRole('button', { name: /bulk actions/i }))

    // Should show enabled operations
    expect(screen.getByText('Change Haus')).toBeInTheDocument()
    expect(screen.getByText('Delete Items')).toBeInTheDocument()
    
    // Disabled operation should not be shown (filtered out)
    expect(screen.queryByText('Disabled Operation')).not.toBeInTheDocument()
  })

  it('should call onOperationSelect when operation is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <BulkOperationDropdown
        operations={mockOperations}
        selectedCount={3}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    // Open dropdown and click operation
    await user.click(screen.getByRole('button', { name: /bulk actions/i }))
    await user.click(screen.getByText('Change Haus'))

    expect(mockOnOperationSelect).toHaveBeenCalledWith(mockOperations[0])
  })

  it('should not render when no operations are available', () => {
    const { container } = render(
      <BulkOperationDropdown
        operations={[]}
        selectedCount={3}
        onOperationSelect={mockOnOperationSelect}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})

describe('BulkOperationConfirmationDialog', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()
  const mockOnOpenChange = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    operation: mockOperations[0],
    selectedCount: 3,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    mockOnConfirm.mockClear()
    mockOnCancel.mockClear()
    mockOnOpenChange.mockClear()
  })

  it('should render confirmation dialog with operation details', () => {
    render(<BulkOperationConfirmationDialog {...defaultProps} />)

    expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument()
    expect(screen.getByText(/change haus.*3 items/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm change haus/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should show warning for destructive operations', () => {
    render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        operation={mockOperations[1]} // destructive operation
      />
    )

    // Should show warning icon for destructive operations
    expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm delete items/i })).toBeInTheDocument()
  })

  it('should require typed confirmation for operations affecting >10 records', () => {
    render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        selectedCount={15}
      />
    )

    expect(screen.getByText(/15 records/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Type.*CONFIRM.*to confirm/)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    
    // Confirm button should be disabled initially
    expect(screen.getByRole('button', { name: /confirm change haus/i })).toBeDisabled()
  })

  it('should enable confirm button when correct confirmation text is entered', async () => {
    const user = userEvent.setup()
    
    render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        selectedCount={15}
      />
    )

    const input = screen.getByRole('textbox')
    const confirmButton = screen.getByRole('button', { name: /confirm change haus/i })

    // Initially disabled
    expect(confirmButton).toBeDisabled()

    // Type incorrect text
    await user.type(input, 'wrong')
    expect(confirmButton).toBeDisabled()

    // Clear and type correct text
    await user.clear(input)
    await user.type(input, 'CONFIRM')
    
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled()
    })
  })

  it('should show affected items preview for small operations', () => {
    const affectedItems = ['Item 1', 'Item 2', 'Item 3']
    
    render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        selectedCount={3}
        affectedItems={affectedItems}
      />
    )

    expect(screen.getByText('Affected items:')).toBeInTheDocument()
    expect(screen.getByText('• Item 1')).toBeInTheDocument()
    expect(screen.getByText('• Item 2')).toBeInTheDocument()
    expect(screen.getByText('• Item 3')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<BulkOperationConfirmationDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /confirm change haus/i }))
    
    expect(mockOnConfirm).toHaveBeenCalled()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<BulkOperationConfirmationDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should handle loading state correctly', () => {
    render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        isLoading={true}
      />
    )

    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    
    // Confirm button should show loading state
    const confirmButton = screen.getByRole('button', { name: /processing/i })
    expect(confirmButton).toBeDisabled()
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(<BulkOperationConfirmationDialog {...defaultProps} />)

    // Focus the dialog content and test Enter key to confirm
    const dialog = screen.getByRole('dialog')
    dialog.focus()
    await user.keyboard('{Enter}')
    expect(mockOnConfirm).toHaveBeenCalled()
  })

  it('should handle escape key to cancel', async () => {
    const user = userEvent.setup()
    
    render(<BulkOperationConfirmationDialog {...defaultProps} />)

    // Focus the dialog content and test Escape key to cancel
    const dialog = screen.getByRole('dialog')
    dialog.focus()
    await user.keyboard('{Escape}')
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should not render when operation is null', () => {
    const { container } = render(
      <BulkOperationConfirmationDialog 
        {...defaultProps} 
        operation={null}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})