import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { useBulkOperations } from '@/hooks/use-bulk-operations'

// Test component to interact with the hook
function TestComponent() {
  const {
    selectedCount,
    selectedIdsArray,
    hasSelection,
    isRowSelected,
    isAllSelected,
    isSomeSelected,
    selectRow,
    selectAll,
    clearSelection,
    setTableType,
    tableType,
    isLoading,
    error
  } = useBulkOperations()

  return (
    <div>
      <div data-testid="selected-count">{selectedCount}</div>
      <div data-testid="has-selection">{hasSelection.toString()}</div>
      <div data-testid="table-type">{tableType || 'none'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'none'}</div>
      <div data-testid="selected-ids">{selectedIdsArray.join(',')}</div>
      
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
      <button onClick={() => setTableType('wohnungen')} data-testid="set-table-type">
        Set Table Type
      </button>
      
      <div data-testid="is-row-1-selected">{isRowSelected('1').toString()}</div>
      <div data-testid="is-all-selected">{isAllSelected(['1', '2', '3']).toString()}</div>
      <div data-testid="is-some-selected">{isSomeSelected(['1', '2', '3']).toString()}</div>
    </div>
  )
}

describe('Bulk Operations Infrastructure', () => {
  const renderWithProvider = () => {
    return render(
      <BulkOperationsProvider>
        <TestComponent />
      </BulkOperationsProvider>
    )
  }

  it('should initialize with empty state', () => {
    renderWithProvider()
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    expect(screen.getByTestId('has-selection')).toHaveTextContent('false')
    expect(screen.getByTestId('table-type')).toHaveTextContent('none')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('error')).toHaveTextContent('none')
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('')
  })

  it('should select and deselect individual rows', async () => {
    renderWithProvider()
    
    // Select row 1
    await act(async () => {
      screen.getByTestId('select-1').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
    expect(screen.getByTestId('has-selection')).toHaveTextContent('true')
    expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('true')
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('1')
    
    // Select row 2
    await act(async () => {
      screen.getByTestId('select-2').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('1,2')
    
    // Deselect row 1
    await act(async () => {
      screen.getByTestId('select-1').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
    expect(screen.getByTestId('is-row-1-selected')).toHaveTextContent('false')
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('2')
  })

  it('should handle select all functionality', async () => {
    renderWithProvider()
    
    // Select all
    await act(async () => {
      screen.getByTestId('select-all').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('3')
    expect(screen.getByTestId('is-all-selected')).toHaveTextContent('true')
    expect(screen.getByTestId('is-some-selected')).toHaveTextContent('false')
    
    // Select all again should deselect all
    await act(async () => {
      screen.getByTestId('select-all').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
    expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false')
  })

  it('should clear selection', async () => {
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
    expect(screen.getByTestId('has-selection')).toHaveTextContent('false')
  })

  it('should handle table type changes and clear selection', async () => {
    renderWithProvider()
    
    // Select some rows first
    await act(async () => {
      screen.getByTestId('select-1').click()
      screen.getByTestId('select-2').click()
    })
    
    expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
    
    // Change table type
    await act(async () => {
      screen.getByTestId('set-table-type').click()
    })
    
    expect(screen.getByTestId('table-type')).toHaveTextContent('wohnungen')
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0') // Should clear selection
  })

  it('should handle some selected state correctly', async () => {
    renderWithProvider()
    
    // Select only one row
    await act(async () => {
      screen.getByTestId('select-1').click()
    })
    
    expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false')
    expect(screen.getByTestId('is-some-selected')).toHaveTextContent('true')
  })
})

describe('useBulkOperations hook error handling', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useBulkOperations must be used within a BulkOperationsProvider')
    
    consoleSpy.mockRestore()
  })
})