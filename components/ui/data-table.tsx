"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { DataTableErrorBoundary } from "@/components/ui/data-table-error-boundary"
import { DataTableToolbar, FilterConfig } from "@/components/ui/data-table-toolbar"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { DataTableEmptyState } from "@/components/ui/data-table-empty-state"
import { ExportLoadingOverlay } from "@/components/ui/data-table-loading-overlay"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { exportTableData, ExportOptions } from "@/lib/data-export"
import { toast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  enableSelection?: boolean
  enablePagination?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
  onRowClick?: (row: TData) => void
  contextMenuComponent?: React.ComponentType<{ row: TData; children: React.ReactNode }>
  filters?: FilterConfig[]
  onExport?: (format: 'csv' | 'pdf') => void
  exportOptions?: ExportOptions
  className?: string
  loading?: boolean
  emptyMessage?: string
  emptyAction?: {
    label: string
    onClick: () => void
    icon?: React.ComponentType<{ className?: string }>
  }
  onRetry?: () => void
  error?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Suchen...",
  enableSelection = false,
  enablePagination = true,
  enableColumnVisibility = true,
  enableExport = false,
  onRowClick,
  contextMenuComponent: ContextMenuComponent,
  filters = [],
  onExport,
  exportOptions = {},
  className,
  loading = false,
  emptyMessage = "Keine Daten verfügbar.",
  emptyAction,
  onRetry,
  error,
}: DataTableProps<TData, TValue>) {
  const isMobile = useIsMobile()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isExporting, setIsExporting] = React.useState(false)
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'pdf'>('csv')
  
  // Mobile-specific state
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = React.useState<{ x: number; y: number } | null>(null)
  const [isScrolling, setIsScrolling] = React.useState(false)
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  // Add selection column if enabled
  const tableColumns = React.useMemo(() => {
    if (!enableSelection) return columns

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Alle auswählen"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Zeile auswählen"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }

    return [selectionColumn, ...columns]
  }, [columns, enableSelection])

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: enablePagination ? pagination : { pageIndex: 0, pageSize: data.length },
    },
    globalFilterFn: "includesString",
  })

  // Touch gesture handling
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchEnd(null)
    setIsScrolling(false)
  }, [])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
    
    if (touchStart) {
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)
      
      // If horizontal movement is greater than vertical, it's likely a scroll gesture
      if (deltaX > deltaY && deltaX > 10) {
        setIsScrolling(true)
      }
    }
  }, [touchStart])

  const handleTouchEnd = React.useCallback(() => {
    if (!touchStart || !touchEnd || isScrolling) return
    
    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    
    // Detect swipe gestures (minimum 50px movement)
    const minSwipeDistance = 50
    
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe - could be used for pagination or column navigation
      if (deltaX > 0) {
        // Swipe right - previous page
        if (table.getCanPreviousPage()) {
          table.previousPage()
        }
      } else {
        // Swipe left - next page
        if (table.getCanNextPage()) {
          table.nextPage()
        }
      }
    }
    
    setTouchStart(null)
    setTouchEnd(null)
    setIsScrolling(false)
  }, [touchStart, touchEnd, isScrolling, table])


  // Handle row click
  const handleRowClick = React.useCallback(
    (row: TData, event: React.MouseEvent | React.KeyboardEvent | React.TouchEvent) => {
      // Don't trigger row click if clicking on checkbox or other interactive elements
      const target = event.target as HTMLElement
      if (target.closest('[role="checkbox"]') || target.closest('button')) {
        return
      }
      
      // Don't trigger on touch if we were scrolling
      if (event.type === 'touchend' && isScrolling) {
        return
      }
      
      onRowClick?.(row)
    },
    [onRowClick, isScrolling]
  )

  // Enhanced keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent, row: TData) => {
      const target = event.target as HTMLElement
      const currentRow = target.closest('tr')
      
      if (!currentRow) return

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          handleRowClick(row, event)
          break
        case 'ArrowDown':
          event.preventDefault()
          const nextRow = currentRow.nextElementSibling as HTMLTableRowElement
          if (nextRow) {
            nextRow.focus()
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          const prevRow = currentRow.previousElementSibling as HTMLTableRowElement
          if (prevRow) {
            prevRow.focus()
          }
          break
        case 'Home':
          event.preventDefault()
          const firstRow = currentRow.parentElement?.firstElementChild as HTMLTableRowElement
          if (firstRow && firstRow !== currentRow) {
            firstRow.focus()
          }
          break
        case 'End':
          event.preventDefault()
          const lastRow = currentRow.parentElement?.lastElementChild as HTMLTableRowElement
          if (lastRow && lastRow !== currentRow) {
            lastRow.focus()
          }
          break
        case 'Escape':
          event.preventDefault()
          // Remove focus from table row
          if (target.blur) {
            target.blur()
          }
          break
      }
    },
    [handleRowClick]
  )

  // Loading skeleton
  if (loading) {
    return (
      <DataTableErrorBoundary>
        <DataTableSkeleton
          columnCount={columns.length}
          rowCount={5}
          showToolbar={true}
          showPagination={enablePagination}
          showSelection={enableSelection}
          className={className}
        />
      </DataTableErrorBoundary>
    )
  }

  // Screen reader announcements
  const totalRows = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()

  const screenReaderStatus = React.useMemo(() => {
    let status = `${totalRows} Zeilen insgesamt`
    
    if (enablePagination && totalPages > 1) {
      status += `, Seite ${currentPage} von ${totalPages}`
    }
    
    if (enableSelection && selectedRows > 0) {
      status += `, ${selectedRows} Zeilen ausgewählt`
    }
    
    if (globalFilter) {
      status += `, gefiltert nach "${globalFilter}"`
    }
    
    return status
  }, [totalRows, selectedRows, currentPage, totalPages, enablePagination, enableSelection, globalFilter])

  // Handle export functionality
  const handleExport = React.useCallback(
    async (format: 'csv' | 'pdf') => {
      if (onExport) {
        // Use custom export handler if provided
        setExportFormat(format)
        setIsExporting(true)
        try {
          onExport(format)
        } finally {
          setIsExporting(false)
        }
        return
      }

      // Use built-in export functionality
      setExportFormat(format)
      setIsExporting(true)
      try {
        await exportTableData(table, format, {
          filename: `export_${new Date().toISOString().split('T')[0]}`,
          includeHeaders: true,
          dateFormat: 'german',
          numberFormat: 'german',
          ...exportOptions,
        })
        
        toast({
          title: "Export erfolgreich",
          description: `Daten wurden als ${format.toUpperCase()} exportiert.`,
        })
      } catch (error) {
        console.error('Export error:', error)
        toast({
          title: "Export fehlgeschlagen",
          description: `Fehler beim Exportieren als ${format.toUpperCase()}.`,
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    },
    [table, onExport, exportOptions]
  )

  return (
    <DataTableErrorBoundary>
      <div className={cn("space-y-4", className)}>
      {/* Export Loading Overlay */}
      <ExportLoadingOverlay
        isVisible={isExporting}
        format={exportFormat}
      />
      
      {/* Screen reader live region */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {screenReaderStatus}
      </div>
      
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        enableColumnVisibility={enableColumnVisibility}
        enableExport={enableExport}
        onExport={handleExport}
        isExporting={isExporting}
      />
      <div 
        ref={tableContainerRef}
        className={cn(
          "rounded-md border",
          isMobile && "overflow-x-auto mobile-data-table"
        )}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <Table 
          role="table" 
          aria-label="Datentabelle"
          className={cn(
            isMobile && "min-w-[600px]" // Ensure minimum width on mobile for horizontal scroll
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      className="h-12"
                      role="columnheader"
                      aria-sort={
                        header.column.getIsSorted() === "asc" 
                          ? "ascending" 
                          : header.column.getIsSorted() === "desc" 
                          ? "descending" 
                          : header.column.getCanSort() 
                          ? "none" 
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody role="rowgroup">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const RowWrapper = ContextMenuComponent
                  ? ({ children }: { children: React.ReactNode }) => (
                      <ContextMenuComponent row={row.original}>
                        {children}
                      </ContextMenuComponent>
                    )
                  : React.Fragment

                return (
                  <RowWrapper key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        onRowClick && "cursor-pointer",
                        isMobile && onRowClick && "mobile-table-row" // Touch feedback
                      )}
                      onClick={(event) => handleRowClick(row.original, event)}
                      onTouchEnd={isMobile && onRowClick ? (event) => handleRowClick(row.original, event) : undefined}
                      onKeyDown={(event) => handleKeyDown(event, row.original)}
                      tabIndex={0}
                      role={onRowClick ? "button" : "row"}
                      aria-label={onRowClick ? "Zeile bearbeiten - Drücken Sie Enter zum Öffnen" : undefined}
                      aria-rowindex={row.index + 2} // +2 because header is row 1
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id}
                          role="cell"
                          aria-describedby={`column-${cell.column.id}`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </RowWrapper>
                )
              })
            ) : (
              <TableRow role="row">
                <TableCell
                  colSpan={tableColumns.length}
                  className="p-0"
                  role="cell"
                >
                  <DataTableEmptyState
                    title={error ? "Fehler beim Laden" : undefined}
                    description={error || emptyMessage}
                    isFiltered={table.getState().columnFilters.length > 0}
                    searchTerm={table.getState().globalFilter}
                    onClearFilters={() => {
                      table.resetColumnFilters()
                      table.setGlobalFilter("")
                    }}
                    onClearSearch={() => table.setGlobalFilter("")}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
    </DataTableErrorBoundary>
  )
}