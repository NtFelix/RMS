"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Apartment } from "./apartment-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Apartment>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Wohnung
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "groesse",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Größe (m²)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    cell: ({ row }) => `${row.original.groesse} m²`,
  },
  {
    accessorKey: "miete",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Miete (€)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
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
      row.original.status === "vermietet" ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
          vermietet
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
          frei
        </Badge>
      ),
  },
]
