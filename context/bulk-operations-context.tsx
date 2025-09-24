'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { 
  BulkOperationsState, 
  BulkOperationsContext, 
  BulkOperation, 
  TableType 
} from '@/types/bulk-operations'

// Initial state
const initialState: BulkOperationsState = {
  selectedIds: new Set<string>(),
  tableType: null,
  isLoading: false,
  error: null,
}

// Action types
type BulkOperationsAction =
  | { type: 'SELECT_ROW'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_TABLE_TYPE'; payload: TableType }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }

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

  const setTableType = useCallback((tableType: TableType) => {
    dispatch({ type: 'SET_TABLE_TYPE', payload: tableType })
  }, [])

  const performBulkOperation = useCallback(async (operation: BulkOperation, data: any) => {
    if (state.selectedIds.size === 0) {
      dispatch({ type: 'SET_ERROR', payload: 'No rows selected' })
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // This will be implemented in later tasks when we create the actual bulk operation handlers
      // For now, we just simulate the operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Clear selection after successful operation
      dispatch({ type: 'CLEAR_SELECTION' })
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'An error occurred during bulk operation' 
      })
    }
  }, [state.selectedIds])

  const contextValue: BulkOperationsContext = {
    state,
    selectRow,
    selectAll,
    clearSelection,
    setTableType,
    performBulkOperation,
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