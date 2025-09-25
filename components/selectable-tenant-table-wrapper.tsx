'use client'

import React, { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TenantContextMenu } from '@/components/tenant-context-menu'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { SelectableTable, SelectableTableRow, SelectableTableHeader } from '@/components/selectable-table'
import { PaginatedSelectableTable } from '@/components/paginated-selectable-table'
import { getBulkOperations } from '@/lib/bulk-operations-config'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { Tenant, NebenkostenEntry } from '@/types/Tenant'

// Define sortable fields for tenant table
type TenantSortKey = "name" | "email" | "telefonnummer" | "wohnung" | "nebenkosten"
type SortDirection = "asc" | "desc"

interface SelectableTenantTableProps {
  tenants: Tenant[]
  wohnungen: { id: string; name: string }[]
  filter: string
  searchQuery: string
  onEdit?: (t: Tenant) => void
  onDelete?: (id: string) => void
  // Pagination props
  pageSize?: number
  showPagination?: boolean
}

export function SelectableTenantTable({ 
  tenants, 
  wohnungen, 
  filter, 
  searchQuery, 
  onEdit, 
  onDelete,
  pageSize,
  showPagination = true
}: SelectableTenantTableProps) {
  const router = useRouter()
  const { state } = useBulkOperations()
  const [sortKey, setSortKey] = useState<TenantSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Map wohnung_id to wohnung name
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  // Sorting, filtering and search logic
  const sortedAndFilteredData = useMemo(() => {
    let result = [...tenants]

    // Apply filters
    if (filter === "current") result = result.filter(t => !t.auszug)
    else if (filter === "previous") result = result.filter(t => !!t.auszug)

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.telefonnummer && t.telefonnummer.toLowerCase().includes(q)) ||
        (t.wohnung_id && t.wohnung_id.toLowerCase().includes(q))
      )
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'wohnung') {
          valA = a.wohnung_id ? wohnungsMap[a.wohnung_id] || '' : ''
          valB = b.wohnung_id ? wohnungsMap[b.wohnung_id] || '' : ''
        } else if (sortKey === 'nebenkosten') {
          // Calculate total utility costs for sorting
          const totalA = a.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
          const totalB = b.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
          valA = totalA
          valB = totalB
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        // Convert to number if it's a numeric value for proper sorting
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [tenants, filter, searchQuery, sortKey, sortDirection, wohnungsMap])

  const handleSort = (key: TenantSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: TenantSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: TenantSortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2"
      >
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  const bulkOperations = getBulkOperations('mieter')
  const allIds = sortedAndFilteredData.map(tenant => tenant.id)

  const getAffectedItemsPreview = (selectedIds: string[]) => {
    return selectedIds.map(id => {
      const tenant = sortedAndFilteredData.find(t => t.id === id)
      return tenant ? tenant.name : id
    })
  }

  // Filter dependencies for clearing selections when filters change
  const filterDependencies = [filter, searchQuery, sortKey, sortDirection]

  return (
    <PaginatedSelectableTable
      data={sortedAndFilteredData}
      tableType="mieter"
      bulkOperations={bulkOperations}
      pageSize={pageSize}
      showPagination={showPagination}
      filterDependencies={filterDependencies}
    >
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <SelectableTableHeader>
              <TableHeaderCell sortKey="name" className="w-[250px]">Name</TableHeaderCell>
              <TableHeaderCell sortKey="email">E-Mail</TableHeaderCell>
              <TableHeaderCell sortKey="telefonnummer">Telefon</TableHeaderCell>
              <TableHeaderCell sortKey="wohnung">Wohnung</TableHeaderCell>
              <TableHeaderCell sortKey="nebenkosten">Nebenkosten</TableHeaderCell>
            </SelectableTableHeader>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Keine Mieter gefunden.
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((tenant) => (
                <TenantContextMenu
                  key={tenant.id}
                  tenant={tenant}
                  onEdit={() => onEdit?.(tenant)}
                  onRefresh={() => router.refresh()}
                >
                  <SelectableTableRow
                    id={tenant.id}
                    onClick={() => onEdit?.(tenant)}
                  >
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>{tenant.telefonnummer}</TableCell>
                    <TableCell>{tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}</TableCell>
                    <TableCell>
                      {tenant.nebenkosten && tenant.nebenkosten.length > 0
                        ? tenant.nebenkosten
                            .slice(0, 3)
                            .map(n => `${n.amount} €`)
                            .join(', ') + (tenant.nebenkosten.length > 3 ? '...' : '')
                        : '-'}
                    </TableCell>
                  </SelectableTableRow>
                </TenantContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <BulkActionBar
        operations={bulkOperations}
        getAffectedItemsPreview={getAffectedItemsPreview}
      />
    </PaginatedSelectableTable>
  )
}