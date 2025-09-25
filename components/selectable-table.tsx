'use client'

import React, { useEffect, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'
import { AccessibleBulkOperationsWrapper } from '@/components/accessible-bulk-operations-wrapper'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { useBulkOperationsKeyboardNavigation } from '@/hooks/use-bulk-operations-keyboard-navigation'
import { TableType, BulkOperation } from '@/types/bulk-operations'
import { cn } from '@/lib/utils'

interface SelectableTableProps<T extends { id: string }> {
  data: T[]
  tableType: TableType
  children: React.ReactNode
  onSelectionChange?: (selectedIds: string[]) => void
  bulkOperations?: BulkOperation[]
  className?: string
  // Pagination props
  currentPage?: number
  onPageChange?: (page: number) => void
  // Filter props - when these change, selections should be cleared
  filterDependencies?: any[]
  // Accessibility props
  ariaLabel?: string
  tableDescription?: string
  enableKeyboardNavigation?: boolean
}

interface SelectableTableContextValue {
  isRowSelected: (id: string) => boolean
  selectedIds: Set<string>
  currentPageIds: string[]
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
  className,
  currentPage,
  onPageChange,
  filterDependencies = [],
  ariaLabel,
  tableDescription,
  enableKeyboardNavigation = true
}: SelectableTableProps<T>) {
  const { state, setTableType, clearSelection, clearSelectionOnPageChange, clearSelectionOnFilterChange, selectAll } = useBulkOperations()
  
  // Set table type when component mounts or tableType changes
  useEffect(() => {
    setTableType(tableType)
  }, [tableType, setTableType])
  
  // Clear selections when component unmounts
  useEffect(() => {
    return () => {
      clearSelection()
    }
  }, [])

  // Clear selections when page changes
  useEffect(() => {
    if (currentPage !== undefined) {
      clearSelectionOnPageChange()
    }
  }, [currentPage, clearSelectionOnPageChange])

  // Clear selections when filter dependencies change
  useEffect(() => {
    if (filterDependencies.length > 0) {
      clearSelectionOnFilterChange()
    }
  }, filterDependencies)
  
  // Extract all IDs from data
  const allIds = useMemo(() => data.map(item => item.id), [data])
  
  // Call onSelectionChange when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedIdsArray = Array.from(state.selectedIds)
      onSelectionChange(selectedIdsArray)
    }
  }, [state.selectedIds, onSelectionChange])
  
  // Set up keyboard navigation
  const { handleCheckboxKeyDown } = useBulkOperationsKeyboardNavigation({
    enabled: enableKeyboardNavigation,
    onSelectAll: (ids) => selectAll(ids),
    allIds
  })

  // Create context value for child components
  const contextValue: SelectableTableContextValue = useMemo(() => ({
    isRowSelected: (id: string) => state.selectedIds.has(id),
    selectedIds: state.selectedIds,
    currentPageIds: allIds
  }), [state.selectedIds, allIds])

  // Generate table type label for accessibility
  const tableTypeLabel = useMemo(() => {
    switch (tableType) {
      case 'wohnungen': return 'Wohnungen'
      case 'finanzen': return 'Finanzen'
      case 'mieter': return 'Mieter'
      case 'haeuser': return 'Häuser'
      case 'betriebskosten': return 'Betriebskosten'
      default: return 'Tabelle'
    }
  }, [tableType])
  
  return (
    <SelectableTableContext.Provider value={contextValue}>
      <AccessibleBulkOperationsWrapper
        tableType={tableTypeLabel}
        allIds={allIds}
        className={cn("relative", className)}
        ariaLabel={ariaLabel}
        announceSelectionChanges={enableKeyboardNavigation}
      >
        {children}
      </AccessibleBulkOperationsWrapper>
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
  rowLabel?: string // Human-readable label for accessibility
  [key: string]: any
}

export function SelectableTableRow({ 
  id, 
  isSelected, 
  children, 
  className, 
  onClick,
  rowLabel,
  ...props 
}: SelectableTableRowProps) {
  const { state, selectRow } = useBulkOperations()
  const selected = isSelected ?? state.selectedIds.has(id)
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Space key for row selection
    if (event.key === ' ' && !state.isLoading) {
      event.preventDefault()
      event.stopPropagation()
      selectRow(id)
    }
  }
  
  return (
    <TableRow
      className={cn(
        "hover:bg-gray-50 cursor-pointer transition-colors",
        "focus-within:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        selected && "bg-blue-50 border-blue-200",
        className
      )}
      data-selected={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-selected={selected}
      aria-label={rowLabel ? `Zeile: ${rowLabel}` : `Zeile ${id}`}
      {...props}
    >
      <TableCell className="w-12" role="gridcell">
        <RowSelectionCheckbox
          rowId={id}
          disabled={state.isLoading}
          rowLabel={rowLabel}
        />
      </TableCell>
      {children}
    </TableRow>
  )
}

// Enhanced table header component that includes select all checkbox
interface SelectableTableHeaderProps {
  allIds?: string[] // Optional - will use current page data if not provided
  children: React.ReactNode
  className?: string
  tableType?: string // For better accessibility labels
}

export function SelectableTableHeader({ 
  allIds, 
  children, 
  className,
  tableType = 'Zeilen'
}: SelectableTableHeaderProps) {
  const { state } = useBulkOperations()
  const context = useSelectableTable()
  
  // Use provided allIds or fall back to current page data from context
  const currentPageIds = allIds || context.currentPageIds
  
  return (
    <TableRow className={className} role="row">
      <TableHead className="w-12" role="columnheader">
        <SelectAllCheckbox
          allIds={currentPageIds}
          selectedIds={state.selectedIds}
          disabled={state.isLoading}
          tableType={tableType}
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