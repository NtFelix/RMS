'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { SelectableTable } from '@/components/selectable-table'
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination'
import { TableType, BulkOperation } from '@/types/bulk-operations'
import { PAGINATION } from '@/constants'

interface PaginatedSelectableTableProps<T extends { id: string }> {
  data: T[]
  tableType: TableType
  children: React.ReactNode
  onSelectionChange?: (selectedIds: string[]) => void
  bulkOperations?: BulkOperation[]
  className?: string
  // Pagination props
  pageSize?: number
  showPagination?: boolean
  // Filter dependencies - when these change, selections should be cleared and pagination reset
  filterDependencies?: any[]
}

export function PaginatedSelectableTable<T extends { id: string }>({
  data,
  tableType,
  children,
  onSelectionChange,
  bulkOperations = [],
  className,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  showPagination = true,
  filterDependencies = []
}: PaginatedSelectableTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to first page when filter dependencies change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterDependencies])

  // Calculate pagination values
  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageData = data.slice(startIndex, endIndex)

  // Generate page numbers for pagination display
  const getPageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page)
      // Selection clearing is handled by the SelectableTable component via currentPage effect
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <div className="space-y-4">
      <SelectableTable
        data={currentPageData}
        tableType={tableType}
        onSelectionChange={onSelectionChange}
        bulkOperations={bulkOperations}
        className={className}
        currentPage={currentPage}
        filterDependencies={filterDependencies}
      >
        {children}
      </SelectableTable>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Zeige {startIndex + 1} bis {Math.min(endIndex, totalItems)} von {totalItems} Einträgen
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={handlePreviousPage}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {getPageNumbers.map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext 
                  onClick={handleNextPage}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}