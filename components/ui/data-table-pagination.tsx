import * as React from "react"
import { Table } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
  showSelectedCount?: boolean
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showSelectedCount = true,
}: DataTablePaginationProps<TData>) {
  const isMobile = useIsMobile()
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length
  const totalRowCount = table.getFilteredRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const pageSize = table.getState().pagination.pageSize

  if (isMobile) {
    return (
      <div className="space-y-3 px-2">
        {/* Mobile: Selection count */}
        {showSelectedCount && selectedRowCount > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            {selectedRowCount} von {totalRowCount} Zeile(n) ausgewählt
          </div>
        )}
        
        {/* Mobile: Page size and info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Pro Seite</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[60px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm font-medium">
            {currentPage} / {totalPages}
          </div>
        </div>
        
        {/* Mobile: Navigation buttons */}
        <div className="flex items-center justify-center space-x-1">
          <Button
            variant="outline"
            className="h-9 w-9 p-0 mobile-table-button"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur ersten Seite"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-9 w-9 p-0 mobile-table-button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur vorherigen Seite"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-9 w-9 p-0 mobile-table-button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Zur nächsten Seite"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-9 w-9 p-0 mobile-table-button"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Zur letzten Seite"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {showSelectedCount && selectedRowCount > 0 && (
          <span>
            {selectedRowCount} von {totalRowCount} Zeile(n) ausgewählt.
          </span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Zeilen pro Seite</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Seite {currentPage} von {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur ersten Seite"
          >
            <span className="sr-only">Zur ersten Seite</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur vorherigen Seite"
          >
            <span className="sr-only">Zur vorherigen Seite</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Zur nächsten Seite"
          >
            <span className="sr-only">Zur nächsten Seite</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Zur letzten Seite"
          >
            <span className="sr-only">Zur letzten Seite</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}