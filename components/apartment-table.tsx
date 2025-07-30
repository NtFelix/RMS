"use client"

import { useMemo, useCallback } from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"
import { DataTable } from "@/components/data-table"
import type { Wohnung } from "@/types/Wohnung"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null;
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  initialApartments?: Apartment[]
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void>
}

export function ApartmentTable({ filter, searchQuery, initialApartments, onEdit, onTableRefresh }: ApartmentTableProps) {
  const apartments = useMemo(() => initialApartments ?? [], [initialApartments])

  const filteredData = useMemo(() => {
    let result = apartments
    if (filter === 'free') {
      result = result.filter(apt => apt.status === 'frei')
    } else if (filter === 'rented') {
      result = result.filter(apt => apt.status === 'vermietet')
    }
    return result
  }, [apartments, filter])

  const columns = useMemo(() => [
    { key: "name", header: "Wohnung", className: "w-[250px]" },
    { key: "groesse", header: "Größe (m²)" },
    { key: "miete", header: "Miete (€)" },
    { key: "Haeuser", header: "Haus" },
    { key: "status", header: "Status" },
  ], [])

  const renderRow = useCallback((apt: Apartment) => (
    <ApartmentContextMenu
      key={apt.id}
      apartment={apt}
      onEdit={() => onEdit?.(apt)}
      onRefresh={async () => {
        if (onTableRefresh) {
          await onTableRefresh()
        }
      }}
    >
      <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(apt)}>
        <TableCell className="font-medium">{apt.name}</TableCell>
        <TableCell>{apt.groesse} m²</TableCell>
        <TableCell>{apt.miete} €</TableCell>
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
  ), [onEdit, onTableRefresh])

  return (
    <DataTable
      data={filteredData}
      columns={columns as any}
      searchQuery={searchQuery}
      filter={filter}
      renderRow={renderRow}
      onEdit={(item) => onEdit?.(item as Apartment)}
      onDelete={() => {}} // No delete functionality for apartments in this table
    />
  )
}
