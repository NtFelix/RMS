import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { BulkOperationsProvider, useBulkOperations } from '@/context/bulk-operations-context'
import { BulkOperation, TableType, ValidationResult } from '@/types/bulk-operations'

// Mock the validation service
jest.mock('@/lib/bulk-operations-validation', () => ({
  validationService: {
    validateBulkOperation: jest.fn(),
  },
}))

// Mock the error handler hook
jest.mock('@/hooks/use-bulk-operations-error-handler', () => ({
  useBulkOperationsErrorHandler: () => ({
    handleBulkOperationResult: jest.fn(),
    handleBulkOperationError: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

// Import mocked functions
import { validationService } from '@/lib/bulk-operations-validation'
import { useBulkOperationsErrorHandler } from '@/hooks/use-bulk-operations-error-handler'

const mockValidationService = validationService as jest.Mocked<typeof validationService>
const mockErrorHandler = useBulkOperationsErrorHandler() as jest.Mocked<ReturnType<typeof useBulkOperationsErrorHandler>>

// Test component to interact with the context
function TestComponent() {
  const {
    state,
    selectRow,
    selectAll,
    clearSelection,
    clearSelectionOnPageChange,
    clearSelectionOnFilterChange,
    setTableType,
    performBulkOperation,
    validateOperation,
  } = useBulkOperations()

  return (
    <div>
      <div data-testid="selected-count">{state.selectedIds.size}</div>
      <div data-testid="table-type">{state.tableType || 'none'}</div>
      <div data-testid="is-loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'none'}</div>
      <div data-testid="validation-result">
        {state.validationResult ? JSON.stringify(state.validationResult) : 'none'}
      </div>
      
      <button onClick={() => selectRow('1')} data-testid="select-1">
        Select 1
      </button>
      <button onClick={() => selectRow('2')} data-testid="select-2">
        Select 2
      </button>
      <button onClick={() => selectAll(['1', '2', '3'])} data-testid="select-all">
        Select All
      </button>
      <button onClick={clearSelection} data-testid="clear">
        Clear
      </button>
      <button onClick={clearSelectionOnPageChange} data-testid="clear-page">
        Clear on Page Change
      </button>
      <button onClick={clearSelectionOnFilterChange} data-testid="clear-filter">
        Clear on Filter Change
      </button>
      <button onClick={() => setTableType('wohnungen')} data-testid="set-table-type">
        Set Table Type
      </button>
      <button 
        onClick={() => {
          const mockOperation: BulkOperation = {
            id: 'test-operation',
            label: 'Test Operation',
            requiresConfirmation: true,
            component: () => <div>Test Component</div>
          }
          performBulkOperation(mockOperation, { test: 'data' })
        }} 
        data-testid="perform-operation"
      >
        Perform Operation
      </button>
      <button 
        onClick={() => {
          const mockOperation: BulkOperation = {
            id: 'test-operation',
            label: 'Test Operation',
            requiresConfirmation: true,
            component: () => <div>Test Component</div>
          }
          validateOperation(mockOperation, { test: 'data' })
        }} 
        data-testid="validate-operation"
      >
        Validate Operation
      </button>
    </div>
  )
}

describe('BulkOperationsProvider Context', () => {
  const renderWithProvider = () => {
    return render(
      <BulkOperationsProvider>
        <TestComponent />
      </BulkOperationsProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      renderWithProvider()
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
      expect(screen.getByTestId('table-type')).toHaveTextContent('none')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('none')
      expect(screen.getByTestId('validation-result')).toHaveTextContent('none')
    })
  })

  describe('Row Selection', () => {
    it('should select individual rows', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
    })

    it('should deselect already selected rows', async () => {
      renderWithProvider()
      
      // Select row 1
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      
      // Deselect row 1
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should select multiple rows', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    })

    it('should clear error when selecting rows', async () => {
      renderWithProvider()
      
      // First trigger an error by performing operation without selection
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      expect(screen.getByTestId('error')).toHaveTextContent('No rows selected')
      
      // Select a row should clear the error
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('error')).toHaveTextContent('none')
    })
  })

  describe('Select All Functionality', () => {
    it('should select all provided IDs when none are selected', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('select-all').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3')
    })

    it('should deselect all when all are already selected', async () => {
      renderWithProvider()
      
      // Select all
      await act(async () => {
        screen.getByTestId('select-all').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3')
      
      // Select all again should deselect all
      await act(async () => {
        screen.getByTestId('select-all').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should select all when some are already selected', async () => {
      renderWithProvider()
      
      // Select one row first
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      
      // Select all should select all 3
      await act(async () => {
        screen.getByTestId('select-all').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3')
    })
  })

  describe('Clear Selection', () => {
    it('should clear all selections', async () => {
      renderWithProvider()
      
      // Select some rows first
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      
      // Clear selection
      await act(async () => {
        screen.getByTestId('clear').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should clear selections on page change', async () => {
      renderWithProvider()
      
      // Select some rows first
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      
      // Clear on page change
      await act(async () => {
        screen.getByTestId('clear-page').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should clear selections on filter change', async () => {
      renderWithProvider()
      
      // Select some rows first
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      
      // Clear on filter change
      await act(async () => {
        screen.getByTestId('clear-filter').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })
  })

  describe('Table Type Management', () => {
    it('should set table type', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('set-table-type').click()
      })
      
      expect(screen.getByTestId('table-type')).toHaveTextContent('wohnungen')
    })

    it('should clear selections when changing table type', async () => {
      renderWithProvider()
      
      // Select some rows first
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      
      // Change table type should clear selections
      await act(async () => {
        screen.getByTestId('set-table-type').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
      expect(screen.getByTestId('table-type')).toHaveTextContent('wohnungen')
    })
  })

  describe('Validation', () => {
    it('should validate operation successfully', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: true,
        validIds: ['1', '2'],
        invalidIds: [],
        errors: []
      }
      
      mockValidationService.validateBulkOperation.mockResolvedValue(mockValidationResult)
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      // Validate operation
      await act(async () => {
        screen.getByTestId('validate-operation').click()
      })
      
      await waitFor(() => {
        expect(mockValidationService.validateBulkOperation).toHaveBeenCalled()
      })
    })

    it('should handle validation errors', async () => {
      const mockError = new Error('Validation failed')
      mockValidationService.validateBulkOperation.mockRejectedValue(mockError)
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
      })
      
      // Validate operation
      await act(async () => {
        screen.getByTestId('validate-operation').click()
      })
      
      await waitFor(() => {
        expect(mockValidationService.validateBulkOperation).toHaveBeenCalled()
      })
    })

    it('should return null when no rows selected for validation', async () => {
      renderWithProvider()
      
      // Set table type but don't select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
      })
      
      // Validate operation
      await act(async () => {
        screen.getByTestId('validate-operation').click()
      })
      
      // Should not call validation service
      expect(mockValidationService.validateBulkOperation).not.toHaveBeenCalled()
    })
  })

  describe('Bulk Operations', () => {
    it('should handle successful bulk operation', async () => {
      const mockResponse = {
        success: true,
        updatedCount: 2,
        failedIds: [],
        errors: []
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
      
      mockErrorHandler.handleBulkOperationResult.mockReturnValue({
        updatedCount: 2,
        failedCount: 0,
        skippedCount: 0,
        canRetry: false,
        retryableIds: []
      })
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      // Perform operation
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/bulk-operations', expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('test-operation')
        }))
      })
      
      // Should clear selections after successful operation
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should handle bulk operation errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid operation' })
      })
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
      })
      
      // Perform operation
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid operation')
      })
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      ;(global.fetch as jest.Mock).mockRejectedValue(networkError)
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
      })
      
      // Perform operation
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      await waitFor(() => {
        expect(mockErrorHandler.handleBulkOperationError).toHaveBeenCalledWith(
          networkError,
          expect.any(Object),
          expect.any(Array)
        )
      })
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      ;(global.fetch as jest.Mock).mockRejectedValue(timeoutError)
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
      })
      
      // Perform operation
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      await waitFor(() => {
        expect(mockErrorHandler.handleBulkOperationError).toHaveBeenCalledWith(
          timeoutError,
          expect.any(Object),
          expect.any(Array)
        )
      })
    })

    it('should show error when no rows selected', async () => {
      renderWithProvider()
      
      // Perform operation without selecting rows
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      expect(screen.getByTestId('error')).toHaveTextContent('No rows selected')
    })

    it('should show error when no table type set', async () => {
      renderWithProvider()
      
      // Select rows but don't set table type
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      // Perform operation
      await act(async () => {
        screen.getByTestId('perform-operation').click()
      })
      
      expect(screen.getByTestId('error')).toHaveTextContent('No table type set')
    })
  })

  describe('Loading States', () => {
    it('should show loading state during bulk operation', async () => {
      // Mock a delayed response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, updatedCount: 1, failedIds: [], errors: [] })
          }), 100)
        )
      )
      
      renderWithProvider()
      
      // Set table type and select rows
      await act(async () => {
        screen.getByTestId('set-table-type').click()
        screen.getByTestId('select-1').click()
      })
      
      // Perform operation
      act(() => {
        screen.getByTestId('perform-operation').click()
      })
      
      // Should show loading state
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      }, { timeout: 200 })
    })
  })
})

describe('useBulkOperations Hook Error Handling', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useBulkOperations must be used within a BulkOperationsProvider')
    
    consoleSpy.mockRestore()
  })
})