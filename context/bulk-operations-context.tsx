'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { 
  BulkOperationsState, 
  BulkOperationsContext, 
  BulkOperation, 
  TableType,
  ValidationResult 
} from '@/types/bulk-operations'
import { validationService } from '@/lib/bulk-operations-validation'

// Initial state
const initialState: BulkOperationsState = {
  selectedIds: new Set<string>(),
  tableType: null,
  isLoading: false,
  error: null,
  validationResult: null,
}

// Action types
type BulkOperationsAction =
  | { type: 'SELECT_ROW'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_TABLE_TYPE'; payload: TableType }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATION_RESULT'; payload: ValidationResult | null }
  | { type: 'CLEAR_SELECTION_ON_PAGE_CHANGE' }
  | { type: 'CLEAR_SELECTION_ON_FILTER_CHANGE' }

// Reducer
function bulkOperationsReducer(
  state: BulkOperationsState,
  action: BulkOperationsAction
): BulkOperationsState {
  switch (action.type) {
    case 'SELECT_ROW': {
      const newSelectedIds = new Set(state.selectedIds)
      if (newSelectedIds.has(action.payload)) {
        newSelectedIds.delete(action.payload)
      } else {
        newSelectedIds.add(action.payload)
      }
      return {
        ...state,
        selectedIds: newSelectedIds,
        error: null,
      }
    }
    case 'SELECT_ALL': {
      const currentSelectedIds = state.selectedIds
      const allIds = new Set(action.payload)
      
      // If all provided IDs are already selected, deselect all
      const allSelected = action.payload.every(id => currentSelectedIds.has(id))
      
      return {
        ...state,
        selectedIds: allSelected ? new Set<string>() : allIds,
        error: null,
      }
    }
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedIds: new Set<string>(),
        error: null,
      }
    case 'SET_TABLE_TYPE':
      return {
        ...state,
        tableType: action.payload,
        selectedIds: new Set<string>(), // Clear selections when changing table type
        error: null,
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      }
    case 'SET_VALIDATION_RESULT':
      return {
        ...state,
        validationResult: action.payload,
      }
    case 'CLEAR_SELECTION_ON_PAGE_CHANGE':
      return {
        ...state,
        selectedIds: new Set<string>(),
        error: null,
        validationResult: null,
      }
    case 'CLEAR_SELECTION_ON_FILTER_CHANGE':
      return {
        ...state,
        selectedIds: new Set<string>(),
        error: null,
        validationResult: null,
      }
    default:
      return state
  }
}

// Context
const BulkOperationsContextValue = createContext<BulkOperationsContext | undefined>(undefined)

// Provider component
interface BulkOperationsProviderProps {
  children: React.ReactNode
}

export function BulkOperationsProvider({ children }: BulkOperationsProviderProps) {
  const [state, dispatch] = useReducer(bulkOperationsReducer, initialState)

  const selectRow = useCallback((id: string) => {
    dispatch({ type: 'SELECT_ROW', payload: id })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_ALL', payload: ids })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])

  const clearSelectionOnPageChange = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION_ON_PAGE_CHANGE' })
  }, [])

  const clearSelectionOnFilterChange = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION_ON_FILTER_CHANGE' })
  }, [])

  const setTableType = useCallback((tableType: TableType) => {
    dispatch({ type: 'SET_TABLE_TYPE', payload: tableType })
  }, [])

  const validateOperation = useCallback(async (operation: BulkOperation, data?: any) => {
    if (state.selectedIds.size === 0 || !state.tableType) {
      dispatch({ type: 'SET_VALIDATION_RESULT', payload: null })
      return null
    }

    try {
      const selectedIdsArray = Array.from(state.selectedIds)
      const result = await validationService.validateBulkOperation(
        operation,
        selectedIdsArray,
        state.tableType,
        data
      )
      
      dispatch({ type: 'SET_VALIDATION_RESULT', payload: result })
      return result
    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        validIds: [],
        invalidIds: Array.from(state.selectedIds),
        errors: [{
          id: 'general',
          field: 'general',
          message: error instanceof Error ? error.message : 'Validation failed'
        }]
      }
      dispatch({ type: 'SET_VALIDATION_RESULT', payload: errorResult })
      return errorResult
    }
  }, [state.selectedIds, state.tableType])

  const performBulkOperation = useCallback(async (operation: BulkOperation, data: any, options?: { skipValidation?: boolean }) => {
    if (state.selectedIds.size === 0) {
      dispatch({ type: 'SET_ERROR', payload: 'No rows selected' })
      return
    }

    if (!state.tableType) {
      dispatch({ type: 'SET_ERROR', payload: 'No table type set' })
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const selectedIdsArray = Array.from(state.selectedIds)
      
      // Validate before performing operation (unless skipped)
      let validationResult = state.validationResult
      if (!options?.skipValidation) {
        validationResult = await validationService.validateBulkOperation(
          operation,
          selectedIdsArray,
          state.tableType,
          data
        )
        dispatch({ type: 'SET_VALIDATION_RESULT', payload: validationResult })
      }

      // Check if we can proceed with the operation
      if (validationResult && !validationService.getValidationSummary(validationResult).canProceed) {
        throw new Error('Validation failed. No records can be updated.')
      }

      // Use only valid IDs for the operation if we have validation results
      const idsToUpdate = validationResult && validationResult.validIds.length > 0 
        ? validationResult.validIds 
        : selectedIdsArray

      const response = await fetch('/api/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: operation.id,
          tableType: state.tableType,
          selectedIds: idsToUpdate,
          data,
          validationResult, // Include validation result for server-side reference
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk operation failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Bulk operation failed')
      }

      // Show success message if there were updates
      if (result.updatedCount > 0) {
        // Success will be handled by the component that called this function
        // Clear selection after successful operation
        dispatch({ type: 'CLEAR_SELECTION' })
        dispatch({ type: 'SET_VALIDATION_RESULT', payload: null })
      }

      // Show warnings for failed items if any
      if (result.failedIds && result.failedIds.length > 0) {
        const failedCount = result.failedIds.length
        const successCount = result.updatedCount
        const skippedCount = validationResult ? validationResult.invalidIds.length : 0
        
        let message = `${successCount} Einträge erfolgreich aktualisiert`
        if (failedCount > 0) {
          message += `, ${failedCount} fehlgeschlagen`
        }
        if (skippedCount > 0) {
          message += `, ${skippedCount} übersprungen`
        }
        message += '.'
        
        dispatch({ 
          type: 'SET_ERROR', 
          payload: message
        })
      }

      dispatch({ type: 'SET_LOADING', payload: false })
      
      return result
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Ein Fehler ist bei der Bulk-Operation aufgetreten' 
      })
      throw error
    }
  }, [state.selectedIds, state.tableType, state.validationResult])

  const contextValue: BulkOperationsContext = {
    state,
    selectRow,
    selectAll,
    clearSelection,
    clearSelectionOnPageChange,
    clearSelectionOnFilterChange,
    setTableType,
    performBulkOperation,
    validateOperation,
  }

  return (
    <BulkOperationsContextValue.Provider value={contextValue}>
      {children}
    </BulkOperationsContextValue.Provider>
  )
}

// Hook to use the context
export function useBulkOperations(): BulkOperationsContext {
  const context = useContext(BulkOperationsContextValue)
  if (context === undefined) {
    throw new Error('useBulkOperations must be used within a BulkOperationsProvider')
  }
  return context
}