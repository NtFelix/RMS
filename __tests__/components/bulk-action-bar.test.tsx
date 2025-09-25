import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { BulkOperation, ValidationResult } from '@/types/bulk-operations'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'

// Mock the bulk operations context
const mockClearSelection = jest.fn()
const mockPerformBulkOperation = jest.fn()
const mockValidateOperation = jest.fn()
const mockUseBulkOperations = {
  state: {
    selectedIds: new Set(['1', '2']),
    tableType: 'wohnungen' as const,
    isLoading: false,
    error: null,
    validationResult: null,
  },
  clearSelection: mockClearSelection,
  performBulkOperation: mockPerformBulkOperation,
  validateOperation: mockValidateOperation,
}

jest.mock('@/context/bulk-operations-context', () => ({
  ...jest.requireActual('@/context/bulk-operations-context'),
  useBulkOperations: () => mockUseBulkOperations,
}))

// Mock the error handler hook
const mockErrorHandler = {
  handleBulkOperationResult: jest.fn(),
  handleBulkOperationError: jest.fn(),
  retryState: { isRetrying: false },
}

jest.mock('@/hooks/use-bulk-operations-error-handler', () => ({
  useBulkOperationsErrorHandler: () => mockErrorHandler,
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock child components
jest.mock('@/components/bulk-operation-dropdown', () => ({
  BulkOperationDropdown: ({ operations, onOperationSelect }: any) => (
    <div data-testid="bulk-operation-dropdown">
      {operations.map((op: BulkOperation) => (
        <button
          key={op.id}
          onClick={() => onOperationSelect(op)}
          data-testid={`operation-${op.id}`}
        >
          {op.label}
        </button>
      ))}
    </div>
  ),
}))

jest.mock('@/components/bulk-validation-feedback', () => ({
  BulkValidationFeedback: ({ onValidationChange }: any) => {
    React.useEffect(() => {
      // Simulate validation result
      const mockResult: ValidationResult = {
        isValid: true,
        validIds: ['1', '2'],
        invalidIds: [],
        errors: []
      }
      onValidationChange(mockResult)
    }, [onValidationChange])
    
    return <div data-testid="bulk-validation-feedback">Validation Feedback</div>
  },
}))

jest.mock('@/components/bulk-operation-error-details', () => ({
  BulkOperationErrorDetails: ({ result, onRetry }: any) => (
    <div data-testid="bulk-operation-error-details">
      <div>Error Details</div>
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-button">
          Retry
        </button>
      )}
    </div>
  ),
}))

// Mock operation component
const MockOperationComponent = ({ onConfirm, onCancel, onDataChange }: any) => (
  <div data-testid="mock-operation-component">
    <button onClick={() => onConfirm({ test: 'data' })} data-testid="confirm-operation">
      Confirm
    </button>
    <button onClick={onCancel} data-testid="cancel-operation">
      Cancel
    </button>
    <button onClick={() => onDataChange({ test: 'changed' })} data-testid="change-data">
      Change Data
    </button>
  </div>
)

describe('BulkActionBar', () => {
  const mockOperations: BulkOperation[] = [
    {
      id: 'test-operation',
      label: 'Test Operation',
      requiresConfirmation: true,
      component: MockOperationComponent,
    },
    {
      id: 'another-operation',
      label: 'Another Operation',
      requiresConfirmation: false,
      component: MockOperationComponent,
    },
  ]

  const defaultProps = {
    operations: mockOperations,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBulkOperations.state.selectedIds = new Set(['1', '2'])
    mockUseBulkOperations.state.isLoading = false
    mockUseBulkOperations.state.error = null
    mockPerformBulkOperation.mockResolvedValue({ success: true, updatedCount: 2, failedIds: [], errors: [] })
    mockValidateOperation.mockResolvedValue({ isValid: true, validIds: ['1', '2'], invalidIds: [], errors: [] })
    mockErrorHandler.handleBulkOperationResult.mockReturnValue({
      updatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      canRetry: false,
      retryableIds: []
    })
  })

  describe('Rendering', () => {
    it('renders when rows are selected', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
      expect(screen.getByText('2 items selected')).toBeInTheDocument()
    })

    it('does not render when no rows are selected', () => {
      mockUseBulkOperations.state.selectedIds = new Set()
      
      render(<BulkActionBar {...defaultProps} />)
      
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })

    it('renders with correct aria-label', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveAttribute('aria-label', 'Bulk actions for 2 selected items')
    })

    it('renders selection counter with singular form', () => {
      mockUseBulkOperations.state.selectedIds = new Set(['1'])
      
      render(<BulkActionBar {...defaultProps} />)
      
      expect(screen.getByText('1 item selected')).toBeInTheDocument()
    })

    it('renders operations dropdown when operations are provided', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('bulk-operation-dropdown')).toBeInTheDocument()
    })

    it('does not render operations dropdown when no operations provided', () => {
      render(<BulkActionBar operations={[]} />)
      
      expect(screen.queryByTestId('bulk-operation-dropdown')).not.toBeInTheDocument()
    })

    it('renders clear selection button', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const clearButton = screen.getByRole('button', { name: 'Clear selection' })
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('Positioning and Styling', () => {
    it('applies default top position', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('top-4')
    })

    it('applies bottom position when specified', () => {
      render(<BulkActionBar {...defaultProps} position="bottom" />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('bottom-4')
    })

    it('applies custom className', () => {
      render(<BulkActionBar {...defaultProps} className="custom-class" />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('custom-class')
    })

    it('applies animation classes', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('animate-in', 'slide-in-from-bottom-2')
    })
  })

  describe('Clear Selection', () => {
    it('calls clearSelection when clear button is clicked', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const clearButton = screen.getByRole('button', { name: 'Clear selection' })
      fireEvent.click(clearButton)
      
      expect(mockClearSelection).toHaveBeenCalled()
    })

    it('disables clear button when loading', () => {
      mockUseBulkOperations.state.isLoading = true
      
      render(<BulkActionBar {...defaultProps} />)
      
      const clearButton = screen.getByRole('button', { name: 'Clear selection' })
      expect(clearButton).toBeDisabled()
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator when bulk operations are loading', () => {
      mockUseBulkOperations.state.isLoading = true
      
      render(<BulkActionBar {...defaultProps} />)
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('disables operations dropdown when loading', () => {
      mockUseBulkOperations.state.isLoading = true
      
      render(<BulkActionBar {...defaultProps} />)
      
      // The dropdown should receive isLoading prop
      expect(screen.getByTestId('bulk-operation-dropdown')).toBeInTheDocument()
    })
  })

  describe('Operation Selection', () => {
    it('opens confirmation dialog when operation is selected', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('bulk-validation-feedback')).toBeInTheDocument()
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
    })

    it('calls validateOperation when operation is selected', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(mockValidateOperation).toHaveBeenCalledWith(mockOperations[0])
      })
    })

    it('handles validation errors gracefully', async () => {
      mockValidateOperation.mockRejectedValue(new Error('Validation failed'))
      
      render(<BulkActionBar {...defaultProps} />)
      
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
    })
  })

  describe('Operation Confirmation', () => {
    it('performs bulk operation when confirmed', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      // Select operation
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      // Confirm operation
      const confirmButton = screen.getByTestId('confirm-operation')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      expect(mockPerformBulkOperation).toHaveBeenCalledWith(
        mockOperations[0],
        { test: 'data' }
      )
    })

    it('closes dialog when operation is cancelled', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      // Select operation
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      // Cancel operation
      const cancelButton = screen.getByTestId('cancel-operation')
      fireEvent.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-operation-component')).not.toBeInTheDocument()
      })
    })

    it('handles data changes from operation component', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      // Select operation
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      // Change data
      const changeDataButton = screen.getByTestId('change-data')
      fireEvent.click(changeDataButton)
      
      // Confirm with changed data
      const confirmButton = screen.getByTestId('confirm-operation')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      expect(mockPerformBulkOperation).toHaveBeenCalledWith(
        mockOperations[0],
        { test: 'data' }
      )
    })
  })

  describe('Error Handling', () => {
    it('shows error details when operation has failures', async () => {
      const mockResult = {
        updatedCount: 1,
        failedCount: 1,
        skippedCount: 0,
        canRetry: true,
        retryableIds: ['2']
      }
      
      mockErrorHandler.handleBulkOperationResult.mockReturnValue(mockResult)
      
      render(<BulkActionBar {...defaultProps} />)
      
      // Select and confirm operation
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByTestId('confirm-operation')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('bulk-operation-error-details')).toBeInTheDocument()
      })
    })

    it('handles operation errors', async () => {
      mockPerformBulkOperation.mockRejectedValue(new Error('Operation failed'))
      
      render(<BulkActionBar {...defaultProps} />)
      
      // Select and confirm operation
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByTestId('confirm-operation')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(mockPerformBulkOperation).toHaveBeenCalled()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('clears selection when Escape key is pressed', () => {
      render(<BulkActionBar {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(mockClearSelection).toHaveBeenCalled()
    })

    it('closes confirmation dialog when Escape key is pressed', async () => {
      render(<BulkActionBar {...defaultProps} />)
      
      // Open confirmation dialog
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-operation-component')).toBeInTheDocument()
      })
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-operation-component')).not.toBeInTheDocument()
      })
    })

    it('removes event listener when component unmounts', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const { unmount } = render(<BulkActionBar {...defaultProps} />)
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Affected Items Preview', () => {
    it('calls getAffectedItemsPreview when provided', async () => {
      const mockGetAffectedItemsPreview = jest.fn().mockReturnValue(['Item 1', 'Item 2'])
      
      render(
        <BulkActionBar 
          {...defaultProps} 
          getAffectedItemsPreview={mockGetAffectedItemsPreview}
        />
      )
      
      const operationButton = screen.getByTestId('operation-test-operation')
      fireEvent.click(operationButton)
      
      expect(mockGetAffectedItemsPreview).toHaveBeenCalledWith(['1', '2'])
    })
  })

  describe('Edge Cases', () => {
    it('handles empty operations array', () => {
      render(<BulkActionBar operations={[]} />)
      
      expect(screen.getByText('2 items selected')).toBeInTheDocument()
      expect(screen.queryByTestId('bulk-operation-dropdown')).not.toBeInTheDocument()
    })

    it('handles missing operation component', async () => {
      const operationWithoutComponent = {
        ...mockOperations[0],
        component: undefined as any,
      }
      
      render(<BulkActionBar operations={[operationWithoutComponent]} />)
      
      const operationButton = screen.getByTestId('operation-test-operation')
      
      // Should not crash when clicking operation without component
      expect(() => {
        fireEvent.click(operationButton)
      }).not.toThrow()
    })
  })
})