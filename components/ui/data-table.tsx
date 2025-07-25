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
import { DataTableToolbar, FilterConfig } from "@/components/ui/data-table-toolbar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { exportTableData, ExportOptions } from "@/lib/data-export"
import { toast } from "@/hooks/use-toast"

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
}: DataTableProps<TData, TValue>) {
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

  // Handle row click
  const handleRowClick = React.useCallback(
    (row: TData, event: React.MouseEvent | React.KeyboardEvent) => {
      // Don't trigger row click if clicking on checkbox or other interactive elements
      const target = event.target as HTMLElement
      if (target.closest('[role="checkbox"]') || target.closest('button')) {
        return
      }
      
      onRowClick?.(row)
    },
    [onRowClick]
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
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="h-8 w-[250px] animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-[180px] animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-[100px] animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-[100px] animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: columns.length }).map((_, i) => (
                  <TableHead key={i}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns.length }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
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
        onExport(format)
        return
      }

      // Use built-in export functionality
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
    <div className={cn("space-y-4", className)}>
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
      <div className="rounded-md border">
        <Table role="table" aria-label="Datentabelle">
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
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={(event) => handleRowClick(row.original, event)}
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
                  className="h-24 text-center"
                  role="cell"
                  aria-live="polite"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  )
}