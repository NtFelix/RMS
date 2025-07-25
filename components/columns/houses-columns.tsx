"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"

export interface House {
  id: string
  name: string
  strasse?: string
  ort: string
  size?: string
  rent?: string
  pricePerSqm?: string
  status?: string
  totalApartments?: number
  freeApartments?: number
}

export const housesColumns: ColumnDef<House>[] = [
  {
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
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Häuser" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "ort",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ort" />
    ),
    cell: ({ row }) => (
      <div>{row.getValue("ort")}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Größe" />
    ),
    cell: ({ row }) => {
      const size = row.getValue("size") as string
      return (
        <div>
          {size ? `${size} m²` : "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const sizeA = parseFloat(rowA.getValue("size") as string) || 0
      const sizeB = parseFloat(rowB.getValue("size") as string) || 0
      return sizeA - sizeB
    },
  },
  {
    accessorKey: "rent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete" />
    ),
    cell: ({ row }) => {
      const rent = row.getValue("rent") as string
      return (
        <div>
          {rent ? `${rent} €` : "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const rentA = parseFloat(rowA.getValue("rent") as string) || 0
      const rentB = parseFloat(rowB.getValue("rent") as string) || 0
      return rentA - rentB
    },
  },
  {
    accessorKey: "pricePerSqm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete pro m²" />
    ),
    cell: ({ row }) => {
      const pricePerSqm = row.getValue("pricePerSqm") as string
      return (
        <div>
          {pricePerSqm ? `${pricePerSqm} €/m²` : "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const priceA = parseFloat(rowA.getValue("pricePerSqm") as string) || 0
      const priceB = parseFloat(rowB.getValue("pricePerSqm") as string) || 0
      return priceA - priceB
    },
  },
  {
    id: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const house = row.original
      const totalApartments = house.totalApartments ?? 0
      const freeApartments = house.freeApartments ?? 0
      const occupiedApartments = totalApartments - freeApartments

      if (totalApartments === 0) {
        return (
          <Badge 
            variant="outline" 
            className="bg-gray-50 text-gray-700 hover:bg-gray-50"
          >
            Keine Wohnungen
          </Badge>
        )
      }

      const isFull = freeApartments === 0
      return (
        <Badge
          variant="outline"
          className={
            isFull
              ? "bg-green-50 text-green-700 hover:bg-green-50"
              : "bg-blue-50 text-blue-700 hover:bg-blue-50"
          }
        >
          {occupiedApartments}/{totalApartments} belegt
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const houseA = rowA.original
      const houseB = rowB.original
      
      const totalA = houseA.totalApartments ?? 0
      const freeA = houseA.freeApartments ?? 0
      const occupancyRateA = totalA > 0 ? (totalA - freeA) / totalA : 0
      
      const totalB = houseB.totalApartments ?? 0
      const freeB = houseB.freeApartments ?? 0
      const occupancyRateB = totalB > 0 ? (totalB - freeB) / totalB : 0
      
      return occupancyRateA - occupancyRateB
    },
    filterFn: (row, id, value) => {
      const house = row.original
      const totalApartments = house.totalApartments ?? 0
      const freeApartments = house.freeApartments ?? 0
      
      if (value === "full") {
        return totalApartments > 0 && freeApartments === 0
      } else if (value === "vacant") {
        return totalApartments > 0 && freeApartments > 0
      } else if (value === "no-apartments") {
        return totalApartments === 0
      }
      
      return true
    },
  },
]