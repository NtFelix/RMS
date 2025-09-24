'use client'

import { useBulkOperations as useBulkOperationsContext } from '@/context/bulk-operations-context'
import { useCallback, useMemo } from 'react'
import { TableType } from '@/types/bulk-operations'

/**
 * Custom hook that provides bulk operations functionality
 * This hook wraps the context and provides additional utility methods
 */
export function useBulkOperations() {
  const context = useBulkOperationsContext()

  // Memoized computed values
  const selectedCount = useMemo(() => context.state.selectedIds.size, [context.state.selectedIds])
  
  const selectedIdsArray = useMemo(() => 
    Array.from(context.state.selectedIds), 
    [context.state.selectedIds]
  )

  const hasSelection = useMemo(() => selectedCount > 0, [selectedCount])

  const isAllSelected = useCallback((allIds: string[]) => {
    if (allIds.length === 0) return false
    return allIds.every(id => context.state.selectedIds.has(id))
  }, [context.state.selectedIds])

  const isSomeSelected = useCallback((allIds: string[]) => {
    if (allIds.length === 0) return false
    return allIds.some(id => context.state.selectedIds.has(id)) && !isAllSelected(allIds)
  }, [context.state.selectedIds, isAllSelected])

  const isRowSelected = useCallback((id: string) => {
    return context.state.selectedIds.has(id)
  }, [context.state.selectedIds])

  // Enhanced selection methods
  const toggleRowSelection = useCallback((id: string) => {
    context.selectRow(id)
  }, [context.selectRow])

  const selectMultiple = useCallback((ids: string[]) => {
    ids.forEach(id => {
      if (!context.state.selectedIds.has(id)) {
        context.selectRow(id)
      }
    })
  }, [context.selectRow, context.state.selectedIds])

  const deselectMultiple = useCallback((ids: string[]) => {
    ids.forEach(id => {
      if (context.state.selectedIds.has(id)) {
        context.selectRow(id)
      }
    })
  }, [context.selectRow, context.state.selectedIds])

  // Table type management
  const initializeTable = useCallback((tableType: TableType) => {
    if (context.state.tableType !== tableType) {
      context.setTableType(tableType)
    }
  }, [context.setTableType, context.state.tableType])

  return {
    // State
    ...context.state,
    
    // Computed values
    selectedCount,
    selectedIdsArray,
    hasSelection,
    
    // Selection state checkers
    isAllSelected,
    isSomeSelected,
    isRowSelected,
    
    // Selection actions
    selectRow: context.selectRow,
    selectAll: context.selectAll,
    clearSelection: context.clearSelection,
    toggleRowSelection,
    selectMultiple,
    deselectMultiple,
    
    // Table management
    setTableType: context.setTableType,
    initializeTable,
    
    // Operations
    performBulkOperation: context.performBulkOperation,
  }
}