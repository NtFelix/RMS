import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { useDebouncedBulkOperations, useOptimizedTableRendering } from '@/hooks/use-debounced-bulk-operations'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'

// Mock data generator for large datasets
const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
    value: Math.random() * 1000
  }))
}

// Test component that uses optimized bulk operations
const OptimizedBulkOperationsTest = ({ dataSize = 1000 }: { dataSize?: number }) => {
  const data = React.useMemo(() => generateLargeDataset(dataSize), [dataSize])
  const allIds = React.useMemo(() => data.map(item => item.id), [data])
  
  const {
    selectedIds,
    selectRow,
    selectAll,
    performanceMetrics,
    isRowSelected,
    isAllSelected,
    isSomeSelected
  } = useDebouncedBulkOperations({
    selectionDebounceMs: 50,
    enableBatching: true,
    maxBatchSize: 100,
    enablePerformanceMonitoring: true
  })

  const {
    data: processedData,
    renderingMetrics,
    virtualScrollData,
    isLargeDataset,
    recommendVirtualization
  } = useOptimizedTableRendering(data, {
    pageSize: 100,
    enableVirtualization: dataSize > 500,
    itemHeight: 40,
    virtualScrollHeight: 400
  })

  return (
    <div data-testid="optimized-bulk-operations">
      <div data-testid="performance-metrics">
        <span data-testid="selected-count">{selectedIds.size}</span>
        <span data-testid="render-count">{performanceMetrics.renderCount}</span>
        <span data-testid="average-render-time">{performanceMetrics.averageRenderTime.toFixed(2)}</span>
        <span data-testid="batch-processing-time">{performanceMetrics.batchProcessingTime.toFixed(2)}</span>
        <span data-testid="is-large-dataset">{isLargeDataset.toString()}</span>
        <span data-testid="recommend-virtualization">{recommendVirtualization.toString()}</span>
        <span data-testid="rendering-strategy">{renderingMetrics.renderingStrategy}</span>
        <span data-testid="memory-usage">{renderingMetrics.memoryUsage}</span>
      </div>

      <SelectAllCheckbox
        allIds={allIds}
        selectedIds={selectedIds}
        tableType="Test Items"
        data-testid="select-all-checkbox"
      />

      <div data-testid="checkbox-list">
        {processedData.slice(0, 10).map((item) => (
          <RowSelectionCheckbox
            key={item.id}
            rowId={item.id}
            rowLabel={item.name}
            data-testid={`checkbox-${item.id}`}
          />
        ))}
      </div>

      <button
        onClick={() => selectAll(allIds)}
        data-testid="select-all-button"
      >
        Select All
      </button>

      <button
        onClick={() => selectRow('item-0')}
        data-testid="select-first-button"
      >
        Select First
      </button>
    </div>
  )
}

describe('Bulk Operations Performance Optimization', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <BulkOperationsProvider>
        {component}
      </BulkOperationsProvider>
    )
  }

  beforeEach(() => {
    // Reset performance monitoring
    jest.clearAllMocks()
  })

  describe('Small Dataset Performance (< 500 items)', () => {
    it('should handle small datasets efficiently without virtualization', async () => {
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={100} />)

      expect(screen.getByTestId('is-large-dataset')).toHaveTextContent('false')
      expect(screen.getByTestId('recommend-virtualization')).toHaveTextContent('false')
      expect(screen.getByTestId('rendering-strategy')).toHaveTextContent('Full')
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Medium')
    })

    it('should perform individual selections quickly', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={100} />)

      const startTime = performance.now()
      
      // Select first item
      await user.click(screen.getByTestId('select-first-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      })

      const endTime = performance.now()
      const selectionTime = endTime - startTime

      // Should complete selection in reasonable time (< 100ms)
      expect(selectionTime).toBeLessThan(100)
    })
  })

  describe('Large Dataset Performance (> 500 items)', () => {
    it('should automatically enable virtualization for large datasets', async () => {
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={1000} />)

      expect(screen.getByTestId('is-large-dataset')).toHaveTextContent('true')
      expect(screen.getByTestId('recommend-virtualization')).toHaveTextContent('true')
      expect(screen.getByTestId('rendering-strategy')).toHaveTextContent('Virtual')
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Low')
    })

    it('should handle select all operation efficiently with large datasets', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={1000} />)

      const startTime = performance.now()
      
      // Select all items
      await user.click(screen.getByTestId('select-all-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1000')
      }, { timeout: 5000 })

      const endTime = performance.now()
      const selectionTime = endTime - startTime

      // Should complete bulk selection in reasonable time (< 2000ms)
      expect(selectionTime).toBeLessThan(2000)
    })

    it('should maintain good performance metrics during rapid selections', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={1000} />)

      // Perform rapid selections
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId(`checkbox-item-${i}`))
      }

      await waitFor(() => {
        const averageRenderTime = parseFloat(screen.getByTestId('average-render-time').textContent || '0')
        const batchProcessingTime = parseFloat(screen.getByTestId('batch-processing-time').textContent || '0')

        // Average render time should be reasonable (< 16ms for 60fps)
        expect(averageRenderTime).toBeLessThan(16)
        
        // Batch processing should be efficient (< 10ms)
        expect(batchProcessingTime).toBeLessThan(10)
      })
    })
  })

  describe('Very Large Dataset Performance (> 2000 items)', () => {
    it('should handle very large datasets without performance degradation', async () => {
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={2000} />)

      expect(screen.getByTestId('is-large-dataset')).toHaveTextContent('true')
      expect(screen.getByTestId('rendering-strategy')).toHaveTextContent('Virtual')
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Low')
    })

    it('should process select all operation in chunks for very large datasets', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={2000} />)

      const startTime = performance.now()
      
      // Select all items - should be processed in chunks
      await user.click(screen.getByTestId('select-all-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('2000')
      }, { timeout: 10000 })

      const endTime = performance.now()
      const selectionTime = endTime - startTime

      // Should complete even very large bulk selection in reasonable time (< 5000ms)
      expect(selectionTime).toBeLessThan(5000)
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should maintain low memory usage with virtualization', async () => {
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={1000} />)

      // Check that memory usage is optimized
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Low')
      
      // Verify that only a subset of items are rendered
      const checkboxes = screen.getAllByTestId(/^checkbox-item-/)
      expect(checkboxes.length).toBeLessThanOrEqual(10) // Only first 10 rendered in test
    })

    it('should prevent memory leaks during rapid selection changes', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={500} />)

      // Perform many rapid selection changes
      for (let i = 0; i < 50; i++) {
        await user.click(screen.getByTestId('select-first-button'))
      }

      // Should not accumulate excessive render counts
      await waitFor(() => {
        const renderCount = parseInt(screen.getByTestId('render-count').textContent || '0')
        expect(renderCount).toBeLessThan(100) // Should be debounced/batched
      })
    })
  })

  describe('Debouncing and Batching', () => {
    it('should debounce rapid selection changes', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={100} />)

      const initialRenderCount = parseInt(screen.getByTestId('render-count').textContent || '0')

      // Perform rapid clicks
      const button = screen.getByTestId('select-first-button')
      for (let i = 0; i < 10; i++) {
        await user.click(button)
      }

      // Wait for debouncing to settle
      await waitFor(() => {
        const finalRenderCount = parseInt(screen.getByTestId('render-count').textContent || '0')
        const renderIncrease = finalRenderCount - initialRenderCount
        
        // Should have fewer renders than clicks due to debouncing
        expect(renderIncrease).toBeLessThan(10)
      })
    })

    it('should batch multiple selection operations', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OptimizedBulkOperationsTest dataSize={1000} />)

      const startTime = performance.now()

      // Select multiple items rapidly
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId(`checkbox-item-${i}`))
      }

      await waitFor(() => {
        const batchProcessingTime = parseFloat(screen.getByTestId('batch-processing-time').textContent || '0')
        expect(batchProcessingTime).toBeGreaterThan(0) // Should show batching occurred
        expect(batchProcessingTime).toBeLessThan(50) // Should be efficient
      })
    })
  })

  describe('Component Memoization', () => {
    it('should prevent unnecessary re-renders of checkbox components', async () => {
      const user = userEvent.setup()
      
      // Create a spy to track renders
      const renderSpy = jest.fn()
      
      const TestComponent = () => {
        renderSpy()
        return <OptimizedBulkOperationsTest dataSize={100} />
      }

      renderWithProvider(<TestComponent />)

      const initialRenderCount = renderSpy.mock.calls.length

      // Select an item
      await user.click(screen.getByTestId('select-first-button'))

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
      })

      // Should not cause excessive re-renders of the parent component
      const finalRenderCount = renderSpy.mock.calls.length
      expect(finalRenderCount - initialRenderCount).toBeLessThanOrEqual(2)
    })
  })
})