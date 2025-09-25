import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { useBulkOperations } from '@/hooks/use-bulk-operations'
import { TableType } from '@/types/bulk-operations'

// Test component to interact with the hook
function TestComponent() {
  const {
    // State
    selectedIds,
    tableType,
    isLoading,
    error,
    validationResult,
    
    // Computed values
    selectedCount,
    selectedIdsArray,
    hasSelection,
    
    // Selection state checkers
    isAllSelected,
    isSomeSelected,
    isRowSelected,
    
    // Selection actions
    selectRow,
    selectAll,
    clearSelection,
    clearSelectionOnPageChange,
    clearSelectionOnFilterChange,
    toggleRowSelection,
    selectMultiple,
    deselectMultiple,
    
    // Table management
    setTableType,
    initializeTable,
    
    // Operations
    performBulkOperation,
  } = useBulkOperations()

  return (
    <div>
      {/* State */}
      <div data-testid="selected-count">{selectedCount}</div>
      <div data-testid="selected-ids-array">{selectedIdsArray.join(',')}</div>
      <div data-testid="has-selection">{hasSelection.toString()}</div>
      <div data-testid="table-type">{tableType || 'none'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'none'}</div>
      
      {/* Selection state checkers */}
      <div data-testid="is-all-selected-123">{isAllSelected(['1', '2', '3']).toString()}</div>
      <div data-testid="is-some-selected-123">{isSomeSelected(['1', '2', '3']).toString()}</div>
      <div data-testid="is-row-1-selected">{isRowSelected('1').toString()}</div>
      <div data-testid="is-row-2-selected">{isRowSelected('2').toString()}</div>
      
      {/* Action buttons */}
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
        Clear Page
      </button>
      <button onClick={clearSelectionOnFilterChange} data-testid="clear-filter">
        Clear Filter
      </button>
      <button onClick={() => toggleRowSelection('1')} data-testid="toggle-1">
        Toggle 1
      </button>
      <button onClick={() => selectMultiple(['1', '2'])} data-testid="select-multiple">
        Select Multiple
      </button>
      <button onClick={() => deselectMultiple(['1', '2'])} data-testid="deselect-multiple">
        Deselect Multiple
      </button>
      <button onClick={() => setTableType('wohnungen')} data-testid="set-table-type">
        Set Table Type
      </button>
      <button onClick={() => initializeTable('finanzen')} data-testid="initialize-table">
        Initialize Table
      </button>
    </div>
  )
}

describe('useBulkOperations Hook', () => {
  const renderWithProvider = () => {
    return render(
      <BulkOperationsProvider>
        <TestComponent />
      </BulkOperationsProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should provide correct initial computed values', () => {
      renderWithProvider()
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
      expect(screen.getByTestId('selected-ids-array')).toHaveTextContent('')
      expect(screen.getByTestId('has-selection')).toHaveTextContent('false')
      expect(screen.getByTestId('table-type')).toHaveTextContent('none')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('none')
    })

    it('should provide correct initial selection state checkers', () => {
      renderWithProvider()
      
      expect(screen.getByTestId('is-all-selected-123')).toHaveTextContent('false')
      expect(screen.getByTestId('is-some-selected-123')).toHaveTextContent('false')
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('false')
      expect(screen.getByTestId('is-row-2-selected')).toHaveTextContent('false')
    })
  })

  describe('Computed Values', () => {
    it('should update selectedCount when rows are selected', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    })

    it('should update selectedIdsArray when rows are selected', async () => {
      renderWithProvider()
      
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
      })
      
      const selectedIds = screen.getByTestId('selected-ids-array').textContent
      expect(selectedIds).toContain('1')
      expect(selectedIds).toContain('2')
    })

    it('should update hasSelection when rows are selected', async () => {
      renderWithProvider()
      
      expect(screen.getByTestId('has-selection')).toHaveTextContent('false')
      
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('has-selection')).toHaveTextContent('true')
    })
  })

  describe('Selection State Checkers', () => {
    it('should correctly identify when all rows are selected', async () => {
      renderWithProvider()
      
      // Select all rows
      await act(async () => {
        screen.getByTestId('select-all').click()
      })
      
      expect(screen.getByTestId('is-all-selected-123')).toHaveTextContent('true')
      expect(screen.getByTestId('is-some-selected-123')).toHaveTextContent('false')
    })

    it('should correctly identify when some rows are selected', async () => {
      renderWithProvider()
      
      // Select only one row
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('is-all-selected-123')).toHaveTextContent('false')
      expect(screen.getByTestId('is-some-selected-123')).toHaveTextContent('true')
    })

    it('should correctly identify individual row selection', async () => {
      renderWithProvider()
      
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('false')
      
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('true')
      expect(screen.getByTestId('is-row-2-selected')).toHaveTextContent('false')
    })

    it('should handle empty arrays in isAllSelected', async () => {
      renderWithProvider()
      
      // Create a test component that checks empty array
      const TestEmptyArray = () => {
        const { isAllSelected } = useBulkOperations()
        return <div data-testid="empty-all-selected">{isAllSelected([]).toString()}</div>
      }
      
      render(
        <BulkOperationsProvider>
          <TestEmptyArray />
        </BulkOperationsProvider>
      )
      
      expect(screen.getByTestId('empty-all-selected')).toHaveTextContent('false')
    })

    it('should handle empty arrays in isSomeSelected', async () => {
      renderWithProvider()
      
      // Create a test component that checks empty array
      const TestEmptyArray = () => {
        const { isSomeSelected } = useBulkOperations()
        return <div data-testid="empty-some-selected">{isSomeSelected([]).toString()}</div>
      }
      
      render(
        <BulkOperationsProvider>
          <TestEmptyArray />
        </BulkOperationsProvider>
      )
      
      expect(screen.getByTestId('empty-some-selected')).toHaveTextContent('false')
    })
  })

  describe('Enhanced Selection Methods', () => {
    it('should toggle row selection', async () => {
      renderWithProvider()
      
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('false')
      
      // Toggle to select
      await act(async () => {
        screen.getByTestId('toggle-1').click()
      })
      
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('true')
      
      // Toggle to deselect
      await act(async () => {
        screen.getByTestId('toggle-1').click()
      })
      
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('false')
    })

    it('should select multiple rows at once', async () => {
      renderWithProvider()
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
      
      await act(async () => {
        screen.getByTestId('select-multiple').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('true')
      expect(screen.getByTestId('is-row-2-selected')).toHaveTextContent('true')
    })

    it('should not select already selected rows in selectMultiple', async () => {
      renderWithProvider()
      
      // Select row 1 first
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      
      // Select multiple including already selected row 1
      await act(async () => {
        screen.getByTestId('select-multiple').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    })

    it('should deselect multiple rows at once', async () => {
      renderWithProvider()
      
      // First select multiple rows
      await act(async () => {
        screen.getByTestId('select-multiple').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
      
      // Then deselect them
      await act(async () => {
        screen.getByTestId('deselect-multiple').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })

    it('should not deselect unselected rows in deselectMultiple', async () => {
      renderWithProvider()
      
      // Select only row 1
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      
      // Try to deselect multiple including unselected row 2
      await act(async () => {
        screen.getByTestId('deselect-multiple').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    })
  })

  describe('Table Management', () => {
    it('should initialize table with new type', async () => {
      renderWithProvider()
      
      expect(screen.getByTestId('table-type')).toHaveTextContent('none')
      
      await act(async () => {
        screen.getByTestId('initialize-table').click()
      })
      
      expect(screen.getByTestId('table-type')).toHaveTextContent('finanzen')
    })

    it('should not change table type if already set to same type', async () => {
      renderWithProvider()
      
      // Set table type first
      await act(async () => {
        screen.getByTestId('set-table-type').click()
      })
      
      expect(screen.getByTestId('table-type')).toHaveTextContent('wohnungen')
      
      // Select some rows
      await act(async () => {
        screen.getByTestId('select-1').click()
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      
      // Initialize with same table type should not clear selections
      await act(async () => {
        screen.getByTestId('initialize-table').click()
      })
      
      expect(screen.getByTestId('table-type')).toHaveTextContent('finanzen')
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0') // Should clear when type changes
    })
  })

  describe('Memoization and Performance', () => {
    it('should memoize computed values', () => {
      const TestMemoization = () => {
        const { selectedCount, selectedIdsArray, hasSelection } = useBulkOperations()
        
        // Track render count
        const renderCount = React.useRef(0)
        renderCount.current++
        
        return (
          <div>
            <div data-testid="render-count">{renderCount.current}</div>
            <div data-testid="selected-count">{selectedCount}</div>
            <div data-testid="selected-ids-array">{selectedIdsArray.join(',')}</div>
            <div data-testid="has-selection">{hasSelection.toString()}</div>
          </div>
        )
      }
      
      render(
        <BulkOperationsProvider>
          <TestMemoization />
        </BulkOperationsProvider>
      )
      
      // Initial render
      expect(screen.getByTestId('render-count')).toHaveTextContent('1')
    })

    it('should memoize selection state checkers', () => {
      const TestMemoization = () => {
        const { isAllSelected, isSomeSelected, isRowSelected } = useBulkOperations()
        
        // These should be memoized based on selectedIds
        const allSelected = isAllSelected(['1', '2', '3'])
        const someSelected = isSomeSelected(['1', '2', '3'])
        const rowSelected = isRowSelected('1')
        
        return (
          <div>
            <div data-testid="all-selected">{allSelected.toString()}</div>
            <div data-testid="some-selected">{someSelected.toString()}</div>
            <div data-testid="row-selected">{rowSelected.toString()}</div>
          </div>
        )
      }
      
      render(
        <BulkOperationsProvider>
          <TestMemoization />
        </BulkOperationsProvider>
      )
      
      expect(screen.getByTestId('all-selected')).toHaveTextContent('false')
      expect(screen.getByTestId('some-selected')).toHaveTextContent('false')
      expect(screen.getByTestId('row-selected')).toHaveTextContent('false')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid selection changes', async () => {
      renderWithProvider()
      
      // Rapidly select and deselect
      await act(async () => {
        screen.getByTestId('select-1').click()
        screen.getByTestId('select-2').click()
        screen.getByTestId('select-1').click() // deselect
        screen.getByTestId('select-2').click() // deselect
        screen.getByTestId('select-1').click() // select again
      })
      
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('true')
      expect(screen.getByTestId('is-row-2-selected')).toHaveTextContent('false')
    })

    it('should handle selection with duplicate IDs', async () => {
      const TestDuplicates = () => {
        const { selectMultiple, selectedCount } = useBulkOperations()
        
        return (
          <div>
            <div data-testid="selected-count">{selectedCount}</div>
            <button 
              onClick={() => selectMultiple(['1', '1', '2', '2'])} 
              data-testid="select-duplicates"
            >
              Select Duplicates
            </button>
          </div>
        )
      }
      
      render(
        <BulkOperationsProvider>
          <TestDuplicates />
        </BulkOperationsProvider>
      )
      
      await act(async () => {
        screen.getByTestId('select-duplicates').click()
      })
      
      // Should only select unique IDs
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    })
  })
})