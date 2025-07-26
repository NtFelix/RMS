"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableSkeletonProps {
  columnCount?: number
  rowCount?: number
  showToolbar?: boolean
  showPagination?: boolean
  showSelection?: boolean
  className?: string
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 5,
  showToolbar = true,
  showPagination = true,
  showSelection = false,
  className,
}: DataTableSkeletonProps) {
  const actualColumnCount = showSelection ? columnCount + 1 : columnCount

  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Tabelle wird geladen">
      {/* Toolbar Skeleton */}
      {showToolbar && (
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            {/* Search input skeleton */}
            <div className="relative">
              <Skeleton className="h-8 w-[250px]" />
            </div>
            {/* Filter dropdowns skeleton */}
            <Skeleton className="h-8 w-[180px]" />
            <Skeleton className="h-8 w-[120px]" />
          </div>
          <div className="flex items-center space-x-2">
            {/* Export and column visibility buttons */}
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-8 w-[100px]" />
          </div>
        </div>
      )}

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: actualColumnCount }).map((_, i) => (
                <TableHead key={i} className="h-12">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                    {/* Sort indicator skeleton */}
                    <Skeleton className="h-3 w-3 rounded-sm" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: actualColumnCount }).map((_, j) => (
                  <TableCell key={j} className="h-12">
                    {j === 0 && showSelection ? (
                      // Checkbox skeleton for selection column
                      <Skeleton className="h-4 w-4 rounded-sm" />
                    ) : (
                      // Regular cell content skeleton with varying widths
                      <Skeleton 
                        className={cn(
                          "h-4",
                          // Vary skeleton widths to look more realistic
                          j % 3 === 0 ? "w-full max-w-[100px]" :
                          j % 3 === 1 ? "w-full max-w-[80px]" :
                          "w-full max-w-[60px]"
                        )} 
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-[100px]" />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Tabellendaten werden geladen...
      </div>
    </div>
  )
}

// Specialized skeletons for different table types
export function HousesTableSkeleton({ className }: { className?: string }) {
  return (
    <DataTableSkeleton
      columnCount={6}
      rowCount={4}
      showSelection={true}
      className={className}
    />
  )
}

export function ApartmentsTableSkeleton({ className }: { className?: string }) {
  return (
    <DataTableSkeleton
      columnCount={7}
      rowCount={6}
      showSelection={true}
      className={className}
    />
  )
}

export function TenantsTableSkeleton({ className }: { className?: string }) {
  return (
    <DataTableSkeleton
      columnCount={6}
      rowCount={5}
      showSelection={true}
      className={className}
    />
  )
}

export function FinancesTableSkeleton({ className }: { className?: string }) {
  return (
    <DataTableSkeleton
      columnCount={5}
      rowCount={8}
      showSelection={true}
      className={className}
    />
  )
}

export function OperatingCostsTableSkeleton({ className }: { className?: string }) {
  return (
    <DataTableSkeleton
      columnCount={6}
      rowCount={4}
      showSelection={false}
      className={className}
    />
  )
}

// Mobile-optimized skeleton
export function MobileDataTableSkeleton({
  cardCount = 5,
  className,
}: {
  cardCount?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Mobile Tabelle wird geladen">
      {/* Mobile toolbar skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-8 flex-1" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Mobile card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-[120px]" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Mobile pagination skeleton */}
      <div className="flex items-center justify-center space-x-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-8 w-8" />
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Mobile Tabellendaten werden geladen...
      </div>
    </div>
  )
}