'use client'

import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { useDebounce } from '@/hooks/use-debounce'

interface DebouncedBulkOperationsOptions {
  selectionDebounceMs?: number
  validationDebounceMs?: number
  enableBatching?: boolean
  maxBatchSize?: number
  enablePerformanceMonitoring?: boolean
}

interface PerformanceMetrics {
  selectedCount: number
  debouncedSelectedCount: number
  hasPendingSelections: boolean
  pendingSelectionsCount: number
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  batchProcessingTime: number
}

/**
 * Performance-optimized hook for bulk operations with debouncing and batching
 * Optimized for handling large datasets (1000+ rows) efficiently
 */
export function useDebouncedBulkOperations(options: DebouncedBulkOperationsOptions = {}) {
  const {
    selectionDebounceMs = 50, // Reduced for better responsiveness
    validationDebounceMs = 300,
    enableBatching = true,
    maxBatchSize = 100, // Prevent memory issues with very large selections
    enablePerformanceMonitoring = process.env.NODE_ENV === 'development'
  } = options

  const bulkOps = useBulkOperations()
  
  // Performance monitoring
  const renderCountRef = useRef(0)
  const renderTimesRef = useRef<number[]>([])
  const lastRenderTimeRef = useRef(0)
  const batchProcessingTimeRef = useRef(0)
  
  // Debounce selection changes to prevent excessive re-renders
  const debouncedSelectedIds = useDebounce(
    Array.from(bulkOps.state.selectedIds), 
    selectionDebounceMs
  )
  
  // Batch selection operations with size limits
  const pendingSelections = useRef<Map<string, boolean>>(new Map()) // Track add/remove operations
  const selectionBatchTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Track render performance
  const trackRender = useCallback(() => {
    if (!enablePerformanceMonitoring) return
    
    const now = performance.now()
    const renderTime = now - lastRenderTimeRef.current
    
    renderCountRef.current++
    renderTimesRef.current.push(renderTime)
    
    // Keep only last 100 render times for average calculation
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift()
    }
    
    lastRenderTimeRef.current = now
    
    // Warn about performance issues
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow bulk operations render: ${renderTime.toFixed(2)}ms`)
    }
  }, [enablePerformanceMonitoring])
  
  // Optimized debounced selection handler with batching
  const debouncedSelectRow = useCallback((id: string) => {
    const startTime = performance.now()
    
    if (!enableBatching) {
      bulkOps.selectRow(id)
      trackRender()
      return
    }
    
    // Check batch size limit
    if (pendingSelections.current.size >= maxBatchSize) {
      console.warn(`Batch size limit reached (${maxBatchSize}). Processing current batch.`)
      // Process current batch immediately
      if (selectionBatchTimer.current) {
        clearTimeout(selectionBatchTimer.current)
        processBatch()
      }
    }
    
    // Toggle selection state in pending batch
    const currentlySelected = bulkOps.state.selectedIds.has(id)
    pendingSelections.current.set(id, !currentlySelected)
    
    // Clear existing timer
    if (selectionBatchTimer.current) {
      clearTimeout(selectionBatchTimer.current)
    }
    
    // Set new timer to process batch
    selectionBatchTimer.current = setTimeout(() => {
      processBatch()
    }, selectionDebounceMs)
    
    const processingTime = performance.now() - startTime
    batchProcessingTimeRef.current = processingTime
    
    trackRender()
  }, [bulkOps.selectRow, bulkOps.state.selectedIds, enableBatching, selectionDebounceMs, maxBatchSize, trackRender])
  
  // Process batched selections efficiently
  const processBatch = useCallback(() => {
    const batchStartTime = performance.now()
    
    // Process all pending selections
    const pendingEntries = Array.from(pendingSelections.current.entries())
    pendingSelections.current.clear()
    
    // Group operations to minimize state updates
    const toSelect: string[] = []
    const toDeselect: string[] = []
    
    pendingEntries.forEach(([id, shouldSelect]) => {
      const currentlySelected = bulkOps.state.selectedIds.has(id)
      
      if (shouldSelect && !currentlySelected) {
        toSelect.push(id)
      } else if (!shouldSelect && currentlySelected) {
        toDeselect.push(id)
      }
    })
    
    // Apply selections in batches to prevent blocking
    const applySelections = (ids: string[], batchSize = 50) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        // Use requestAnimationFrame to prevent blocking the UI
        requestAnimationFrame(() => {
          batch.forEach(id => bulkOps.selectRow(id))
        })
      }
    }
    
    if (toSelect.length > 0) {
      applySelections(toSelect)
    }
    if (toDeselect.length > 0) {
      applySelections(toDeselect)
    }
    
    selectionBatchTimer.current = null
    
    const batchTime = performance.now() - batchStartTime
    batchProcessingTimeRef.current = batchTime
    
    if (enablePerformanceMonitoring && batchTime > 10) {
      console.warn(`Slow batch processing: ${batchTime.toFixed(2)}ms for ${pendingEntries.length} items`)
    }
  }, [bulkOps.selectRow, bulkOps.state.selectedIds, enablePerformanceMonitoring])
  
  // Memoized and optimized selection state checkers
  const selectionCheckers = useMemo(() => {
    const selectedIdsSet = new Set(debouncedSelectedIds)
    
    // Cache frequently used calculations
    const selectionCache = new Map<string, boolean>()
    const allSelectedCache = new Map<string, boolean>()
    
    return {
      isRowSelected: (id: string) => {
        if (!selectionCache.has(id)) {
          selectionCache.set(id, selectedIdsSet.has(id))
        }
        return selectionCache.get(id)!
      },
      
      isAllSelected: (allIds: string[]) => {
        if (allIds.length === 0) return false
        
        const cacheKey = allIds.join(',')
        if (!allSelectedCache.has(cacheKey)) {
          const result = allIds.every(id => selectedIdsSet.has(id))
          allSelectedCache.set(cacheKey, result)
        }
        return allSelectedCache.get(cacheKey)!
      },
      
      isSomeSelected: (allIds: string[]) => {
        if (allIds.length === 0) return false
        
        const selectedCount = allIds.filter(id => selectedIdsSet.has(id)).length
        return selectedCount > 0 && selectedCount < allIds.length
      },
      
      getSelectedCount: () => selectedIdsSet.size,
      getSelectedIds: () => Array.from(selectedIdsSet),
      
      // Optimized for large datasets
      getSelectedCountInRange: (startIndex: number, endIndex: number, allIds: string[]) => {
        const rangeIds = allIds.slice(startIndex, endIndex)
        return rangeIds.filter(id => selectedIdsSet.has(id)).length
      }
    }
  }, [debouncedSelectedIds])
  
  // Enhanced cleanup with performance monitoring
  const cleanup = useCallback(() => {
    if (selectionBatchTimer.current) {
      clearTimeout(selectionBatchTimer.current)
      selectionBatchTimer.current = null
    }
    pendingSelections.current.clear()
    
    if (enablePerformanceMonitoring) {
      console.log('Bulk operations cleanup - Performance summary:', {
        totalRenders: renderCountRef.current,
        averageRenderTime: renderTimesRef.current.length > 0 
          ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
          : 0
      })
    }
  }, [enablePerformanceMonitoring])
  
  // Enhanced performance metrics
  const performanceMetrics: PerformanceMetrics = useMemo(() => {
    const averageRenderTime = renderTimesRef.current.length > 0 
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
      : 0
    
    return {
      selectedCount: bulkOps.state.selectedIds.size,
      debouncedSelectedCount: debouncedSelectedIds.length,
      hasPendingSelections: pendingSelections.current.size > 0,
      pendingSelectionsCount: pendingSelections.current.size,
      renderCount: renderCountRef.current,
      averageRenderTime,
      lastRenderTime: lastRenderTimeRef.current,
      batchProcessingTime: batchProcessingTimeRef.current
    }
  }, [bulkOps.state.selectedIds.size, debouncedSelectedIds.length])
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])
  
  return {
    // Original bulk operations (for non-performance-critical operations)
    ...bulkOps,
    
    // Optimized selection operations
    selectRow: debouncedSelectRow,
    
    // Optimized selection state checkers
    ...selectionCheckers,
    
    // Debounced state
    debouncedSelectedIds,
    
    // Performance utilities
    cleanup,
    performanceMetrics,
    
    // Batch operations
    flushPendingSelections: useCallback(() => {
      if (selectionBatchTimer.current) {
        clearTimeout(selectionBatchTimer.current)
        processBatch()
      }
    }, [processBatch]),
    
    // Performance monitoring
    resetPerformanceMetrics: useCallback(() => {
      renderCountRef.current = 0
      renderTimesRef.current = []
      lastRenderTimeRef.current = performance.now()
      batchProcessingTimeRef.current = 0
    }, [])
  }
}

/**
 * Hook for optimizing table rendering with large datasets
 * Includes virtual scrolling support and intelligent row memoization
 */
export function useOptimizedTableRendering<T extends { id: string }>(
  data: T[],
  options: {
    pageSize?: number
    enableVirtualization?: boolean
    memoizeRows?: boolean
    virtualScrollHeight?: number
    itemHeight?: number
    overscan?: number
  } = {}
) {
  const { 
    pageSize = 100, // Increased for better performance with large datasets
    enableVirtualization = data.length > 500, // Auto-enable for large datasets
    memoizeRows = true,
    virtualScrollHeight = 400,
    itemHeight = 40,
    overscan = 5
  } = options
  
  // Memoize data processing to prevent recalculation
  const processedData = useMemo(() => {
    if (!enableVirtualization) {
      return data
    }
    
    // For virtual scrolling, we need to maintain the full dataset
    // but only render visible items
    return data
  }, [data, enableVirtualization])
  
  // Virtual scrolling calculations
  const virtualScrollData = useMemo(() => {
    if (!enableVirtualization) {
      return null
    }
    
    const totalHeight = data.length * itemHeight
    const visibleCount = Math.ceil(virtualScrollHeight / itemHeight)
    const totalCount = data.length
    
    return {
      totalHeight,
      visibleCount,
      totalCount,
      itemHeight,
      overscan,
      
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight)
        const endIndex = Math.min(
          startIndex + visibleCount + overscan * 2,
          totalCount
        )
        const adjustedStartIndex = Math.max(0, startIndex - overscan)
        
        return {
          startIndex: adjustedStartIndex,
          endIndex,
          offsetY: adjustedStartIndex * itemHeight
        }
      },
      
      getVisibleItems: (scrollTop: number) => {
        if (!virtualScrollData) {
          return {
            items: data,
            startIndex: 0,
            endIndex: data.length,
            offsetY: 0
          }
        }
        const { startIndex, endIndex, offsetY } = virtualScrollData.getVisibleRange(scrollTop)
        return {
          items: data.slice(startIndex, endIndex),
          startIndex,
          endIndex,
          offsetY
        }
      }
    }
  }, [data, enableVirtualization, itemHeight, virtualScrollHeight, overscan])
  
  // Memoize row keys for React optimization
  const rowKeys = useMemo(() => {
    return processedData.map(item => item.id)
  }, [processedData])
  
  // Memoized row data for preventing unnecessary re-renders
  const memoizedRowData = useMemo(() => {
    if (!memoizeRows) return processedData
    
    // Create a map for O(1) lookups
    const dataMap = new Map(processedData.map(item => [item.id, item]))
    
    return {
      dataMap,
      getItem: (id: string) => dataMap.get(id),
      hasItem: (id: string) => dataMap.has(id)
    }
  }, [processedData, memoizeRows])
  
  // Performance monitoring for rendering
  const renderingMetrics = useMemo(() => {
    const visibleItems = enableVirtualization && virtualScrollData 
      ? virtualScrollData.visibleCount + virtualScrollData.overscan * 2
      : processedData.length
    
    return {
      totalItems: data.length,
      renderedItems: Math.min(visibleItems, data.length),
      isVirtualized: enableVirtualization,
      pageSize,
      memoryUsage: enableVirtualization ? 'Low' : data.length > 1000 ? 'High' : 'Medium',
      renderingStrategy: enableVirtualization ? 'Virtual' : 'Full'
    }
  }, [data.length, processedData.length, enableVirtualization, pageSize, virtualScrollData])
  
  // Optimized item renderer for virtual scrolling
  const createItemRenderer = useCallback((
    renderItem: (item: T, index: number) => React.ReactNode
  ) => {
    return (scrollTop: number) => {
      if (!enableVirtualization || !virtualScrollData) {
        return processedData.map(renderItem)
      }
      
      const { items, startIndex, offsetY } = virtualScrollData.getVisibleItems(scrollTop)
      
      return {
        items: items.map((item, index) => renderItem(item, startIndex + index)),
        offsetY,
        startIndex,
        endIndex: startIndex + items.length
      }
    }
  }, [enableVirtualization, virtualScrollData, processedData])
  
  return {
    data: processedData,
    rowKeys,
    memoizedRowData,
    virtualScrollData,
    renderingMetrics,
    createItemRenderer,
    
    // Helper for checking if item should be rendered
    shouldRenderItem: useCallback((index: number, scrollTop?: number) => {
      if (!enableVirtualization || !virtualScrollData || scrollTop === undefined) {
        return true
      }
      
      const { startIndex, endIndex } = virtualScrollData.getVisibleRange(scrollTop)
      return index >= startIndex && index < endIndex
    }, [enableVirtualization, virtualScrollData]),
    
    // Performance optimization helpers
    isLargeDataset: data.length > 1000,
    recommendVirtualization: data.length > 500,
    estimatedMemoryUsage: data.length * 0.1 // Rough estimate in KB
  }
}