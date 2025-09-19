"use client"

import { useState, useEffect, useMemo, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { formatNumber } from "@/utils/format"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null; // Allow null here
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

// Define sortable fields for apartments
type ApartmentSortKey = "name" | "groesse" | "miete" | "pricePerSqm" | "haus" | "status"
type SortDirection = "asc" | "desc"

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null> // This could potentially be removed if onTableRefresh is sufficient
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void> // New prop for requesting data refresh from parent
  // optional initial apartments loaded server-side
  initialApartments?: Apartment[]
}

export function ApartmentTable({ filter, searchQuery, reloadRef, onEdit, onTableRefresh, initialApartments }: ApartmentTableProps) {
  // initialApartments prop will be the direct source of truth for apartments data
  const [sortKey, setSortKey] = useState<ApartmentSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Removed internal fetchApartments. Refresh is handled by onTableRefresh prop.

  const sortedAndFilteredData = useMemo(() => {
    let result = [...(initialApartments ?? [])] // Use initialApartments directly
    
    // Filter by status
    if (filter === 'free') {
      result = result.filter(apt => apt.status === 'frei')
    } else if (filter === 'rented') {
      result = result.filter(apt => apt.status === 'vermietet')
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (apt) =>
          apt.name.toLowerCase().includes(query) ||
          apt.groesse.toString().includes(query) ||
          apt.miete.toString().includes(query) ||
          (apt.Haeuser?.name && apt.Haeuser.name.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'pricePerSqm') {
          valA = a.miete / a.groesse
          valB = b.miete / b.groesse
        } else if (sortKey === 'haus') {
          valA = a.Haeuser?.name || ''
          valB = b.Haeuser?.name || ''
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        // Convert to number if it's a numeric string for proper sorting
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
  }, [initialApartments, filter, searchQuery, sortKey, sortDirection]) // Depend on initialApartments and sort state

  const handleSort = (key: ApartmentSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: ApartmentSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: ApartmentSortKey, children: React.ReactNode, className?: string }) => (
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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell sortKey="name" className="w-[250px]">Wohnung</TableHeaderCell>
            <TableHeaderCell sortKey="groesse">Größe (m²)</TableHeaderCell>
            <TableHeaderCell sortKey="miete">Miete (€)</TableHeaderCell>
            <TableHeaderCell sortKey="pricePerSqm">Miete pro m²</TableHeaderCell>
            <TableHeaderCell sortKey="haus">Haus</TableHeaderCell>
            <TableHeaderCell sortKey="status">Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                Keine Wohnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedAndFilteredData.map((apt) => (
              <ApartmentContextMenu
                key={apt.id}
                apartment={apt}
                onEdit={() => onEdit?.(apt)}
                onRefresh={async () => { // Changed to call onTableRefresh
                  if (onTableRefresh) {
                    await onTableRefresh();
                  }
                }}
              >
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(apt)}>
                  <TableCell className="font-medium">{apt.name}</TableCell>
                  <TableCell>{formatNumber(apt.groesse)} m²</TableCell>
                  <TableCell>{formatNumber(apt.miete)} €</TableCell>
                  <TableCell>{formatNumber(apt.miete / apt.groesse)} €/m²</TableCell>
                  <TableCell>{apt.Haeuser?.name || '-'}</TableCell>
                  <TableCell>
                    {apt.status === 'vermietet' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        vermietet
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        frei
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              </ApartmentContextMenu>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
