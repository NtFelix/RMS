"use client"

import { useState, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { MobileFilterButton, FilterOption } from "@/components/mobile/mobile-filter-button"
import { MobileSearchBar } from "@/components/mobile/mobile-search-bar"
import { useIsMobile } from "@/hooks/use-mobile"

import { Tenant, NebenkostenEntry } from "@/types/Tenant";

// Define sortable fields for tenant table
type TenantSortKey = "name" | "email" | "telefonnummer" | "wohnung" | "nebenkosten"
type SortDirection = "asc" | "desc"

interface TenantTableProps {
  tenants: Tenant[];
  wohnungen: { id: string; name: string }[];
  filter: string;
  searchQuery: string;
  onEdit?: (t: Tenant) => void;
  onDelete?: (id: string) => void;
  onFilterChange?: (filter: string) => void;
  onSearchChange?: (search: string) => void;
}



export function TenantTable({ tenants, wohnungen, filter, searchQuery, onEdit, onDelete, onFilterChange, onSearchChange }: TenantTableProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<TenantSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const isMobile = useIsMobile()

  // Map wohnung_id to wohnung name
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  // Mobile filter options
  const filterOptions: FilterOption[] = useMemo(() => {
    const totalTenants = tenants.length
    const currentTenants = tenants.filter(tenant => !tenant.auszug).length
    const previousTenants = tenants.filter(tenant => !!tenant.auszug).length

    return [
      { id: 'all', label: 'Alle', count: totalTenants },
      { id: 'current', label: 'Aktuell', count: currentTenants },
      { id: 'previous', label: 'Vorherige', count: previousTenants }
    ]
  }, [tenants])

  // Mobile filter handlers
  const handleMobileFilterChange = useCallback((filters: string[]) => {
    // For tenant filters, we only allow one filter at a time
    const newFilter = filters.length > 0 ? filters[filters.length - 1] : 'all'
    onFilterChange?.(newFilter)
  }, [onFilterChange])

  const handleMobileSearchChange = useCallback((search: string) => {
    onSearchChange?.(search)
  }, [onSearchChange])

  // Get active filters for mobile filter button
  const activeFilters = useMemo(() => {
    return filter === 'all' ? [] : [filter]
  }, [filter])

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

  return (
    <div className="rounded-md border">
      {/* Mobile Filter and Search Bar */}
      {isMobile && (onFilterChange || onSearchChange) && (
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50/50">
          {onFilterChange && (
            <MobileFilterButton
              filters={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={handleMobileFilterChange}
            />
          )}
          {onSearchChange && (
            <MobileSearchBar
              value={searchQuery}
              onChange={handleMobileSearchChange}
              placeholder="Mieter suchen..."
            />
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell sortKey="name" className="w-[250px]">Name</TableHeaderCell>
            <TableHeaderCell sortKey="email">E-Mail</TableHeaderCell>
            <TableHeaderCell sortKey="telefonnummer">Telefon</TableHeaderCell>
            <TableHeaderCell sortKey="wohnung">Wohnung</TableHeaderCell>
            <TableHeaderCell sortKey="nebenkosten">Nebenkosten</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
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
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(tenant)}>
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
                </TableRow>
              </TenantContextMenu>
            ))
          )}
        </TableBody>
      </Table>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Der Mieter "{tenantToDelete?.name}" wird gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!tenantToDelete) return
              setIsDeleting(true)
              if (onDelete) await onDelete(tenantToDelete.id)
              setIsDeleting(false)
              setShowDeleteConfirm(false)
            }} className="bg-red-600 hover:bg-red-700">{isDeleting ? "Lösche..." : "Löschen"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
