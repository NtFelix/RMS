'use client'

import React, { useEffect, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { TableType, BulkOperation } from '@/types/bulk-operations'
import { cn } from '@/lib/utils'

interface SelectableTableProps<T extends { id: string }> {
  data: T[]
  tableType: TableType
  children: React.ReactNode
  onSelectionChange?: (selectedIds: string[]) => void
  bulkOperations?: BulkOperation[]
  className?: string
}

interface SelectableTableContextValue {
  isRowSelected: (id: string) => boolean
  selectedIds: Set<string>
}

const SelectableTableContext = React.createContext<SelectableTableContextValue | undefined>(undefined)

export function useSelectableTable() {
  const context = React.useContext(SelectableTableContext)
  if (!context) {
    throw new Error('useSelectableTable must be used within a SelectableTable')
  }
  return context
}

export function SelectableTable<T extends { id: string }>({
  data,
  tableType,
  children,
  onSelectionChange,
  bulkOperations = [],
  className
}: SelectableTableProps<T>) {
  const { state, setTableType, clearSelection } = useBulkOperations()
  
  // Set table type when component mounts or tableType changes
  useEffect(() => {
    setTableType(tableType)
    
    // Clear selections when component unmounts or table type changes
    return () => {
      clearSelection()
    }
  }, [tableType, setTableType, clearSelection])
  
  // Extract all IDs from data
  const allIds = useMemo(() => data.map(item => item.id), [data])
  
  // Call onSelectionChange when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(state.selectedIds))
    }
  }, [state.selectedIds, onSelectionChange])
  
  // Create context value for child components
  const contextValue: SelectableTableContextValue = useMemo(() => ({
    isRowSelected: (id: string) => state.selectedIds.has(id),
    selectedIds: state.selectedIds
  }), [state.selectedIds])
  
  return (
    <SelectableTableContext.Provider value={contextValue}>
      <div className={cn("relative", className)}>
        {children}
      </div>
    </SelectableTableContext.Provider>
  )
}

// Enhanced table row component that includes selection checkbox
interface SelectableTableRowProps {
  id: string
  isSelected?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
  [key: string]: any
}

export function SelectableTableRow({ 
  id, 
  isSelected, 
  children, 
  className, 
  onClick,
  ...props 
}: SelectableTableRowProps) {
  const { state } = useBulkOperations()
  const selected = isSelected ?? state.selectedIds.has(id)
  
  return (
    <TableRow
      className={cn(
        "hover:bg-gray-50 cursor-pointer transition-colors",
        selected && "bg-blue-50 border-blue-200",
        className
      )}
      data-selected={selected}
      onClick={onClick}
      {...props}
    >
      <TableCell className="w-12">
        <RowSelectionCheckbox
          rowId={id}
          disabled={state.isLoading}
        />
      </TableCell>
      {children}
    </TableRow>
  )
}

// Enhanced table header component that includes select all checkbox
interface SelectableTableHeaderProps {
  allIds: string[]
  children: React.ReactNode
  className?: string
}

export function SelectableTableHeader({ 
  allIds, 
  children, 
  className 
}: SelectableTableHeaderProps) {
  const { state } = useBulkOperations()
  
  return (
    <TableRow className={className}>
      <TableHead className="w-12">
        <SelectAllCheckbox
          allIds={allIds}
          selectedIds={state.selectedIds}
          disabled={state.isLoading}
        />
      </TableHead>
      {children}
    </TableRow>
  )
}

// Higher-Order Component version for easier integration with existing tables
export function withSelectableTable<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tableType: TableType,
  bulkOperations?: BulkOperation[]
) {
  const SelectableTableHOC = (props: P & { data?: any[] }) => {
    const { data = [], ...restProps } = props
    
    return (
      <SelectableTable
        data={data}
        tableType={tableType}
        bulkOperations={bulkOperations}
      >
        <WrappedComponent {...(restProps as P)} data={data} />
      </SelectableTable>
    )
  }
  
  SelectableTableHOC.displayName = `withSelectableTable(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return SelectableTableHOC
}