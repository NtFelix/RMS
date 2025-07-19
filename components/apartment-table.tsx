"use client"

import { useState, useEffect, useMemo, MutableRefObject } from "react"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"
import { Wohnung } from "@/types/Wohnung"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface Apartment extends Wohnung {}

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void>
  initialApartments?: Apartment[]
}

export function ApartmentTable({ filter, searchQuery, onEdit, onTableRefresh, initialApartments }: ApartmentTableProps) {
  const [filteredData, setFilteredData] = useState<Apartment[]>([])

  useEffect(() => {
    let result = initialApartments ?? []
    
    if (filter === 'free') result = result.filter(apt => apt.status === 'frei')
    else if (filter === 'rented') result = result.filter(apt => apt.status === 'vermietet')
    
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
    
    setFilteredData(result)
  }, [initialApartments, filter, searchQuery])

  const columns: ColumnDef<Apartment>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Wohnung <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ApartmentContextMenu
          apartment={row.original}
          onEdit={() => onEdit?.(row.original)}
          onRefresh={async () => { if (onTableRefresh) await onTableRefresh() }}
        >
          <div className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(row.original)}>
            {row.original.name}
          </div>
        </ApartmentContextMenu>
      ),
    },
    {
      accessorKey: "groesse",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Größe (m²) <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `${row.original.groesse} m²`,
    },
    {
      accessorKey: "miete",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Miete (€) <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `${row.original.miete} €`,
    },
    {
      id: "pricePerSqm",
      header: "Miete pro m²",
      cell: ({ row }) => `${(row.original.miete / row.original.groesse).toFixed(2)} €/m²`,
    },
    {
      accessorKey: "Haeuser.name",
      header: "Haus",
      cell: ({ row }) => row.original.Haeuser?.name || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === 'vermietet' ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">vermietet</Badge>
        ) : (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">frei</Badge>
        ),
    },
  ], [onEdit, onTableRefresh]);

  return <DataTable columns={columns} data={filteredData} />
}
