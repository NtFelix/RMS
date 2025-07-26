"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  formatGermanArea, 
  formatGermanCurrency, 
  formatGermanPricePerSqm,
  DATA_TABLE_TEXTS 
} from "@/lib/data-table-localization"

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

// Memoized cell components for better performance
const HouseNameCell = React.memo(({ value }: { value: string }) => (
  <div className="font-medium">{value}</div>
))
HouseNameCell.displayName = "HouseNameCell"

const HouseOrtCell = React.memo(({ value }: { value: string }) => (
  <div>{value}</div>
))
HouseOrtCell.displayName = "HouseOrtCell"

const HouseSizeCell = React.memo(({ value }: { value: string }) => (
  <div>{value ? formatGermanArea(value) : "-"}</div>
))
HouseSizeCell.displayName = "HouseSizeCell"

const HouseRentCell = React.memo(({ value }: { value: string }) => (
  <div>{value ? formatGermanCurrency(value) : "-"}</div>
))
HouseRentCell.displayName = "HouseRentCell"

const HousePricePerSqmCell = React.memo(({ value }: { value: string }) => (
  <div>{value ? formatGermanPricePerSqm(value) : "-"}</div>
))
HousePricePerSqmCell.displayName = "HousePricePerSqmCell"

const HouseStatusCell = React.memo(({ house }: { house: House }) => {
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
})
HouseStatusCell.displayName = "HouseStatusCell"

export const housesColumns: ColumnDef<House>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.houses} />
    ),
    cell: ({ row }) => <HouseNameCell value={row.getValue("name")} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "ort",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.location} />
    ),
    cell: ({ row }) => <HouseOrtCell value={row.getValue("ort")} />,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.size} />
    ),
    cell: ({ row }) => <HouseSizeCell value={row.getValue("size")} />,
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
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.rent} />
    ),
    cell: ({ row }) => <HouseRentCell value={row.getValue("rent")} />,
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
    cell: ({ row }) => <HousePricePerSqmCell value={row.getValue("pricePerSqm")} />,
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
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.status} />
    ),
    cell: ({ row }) => <HouseStatusCell house={row.original} />,
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