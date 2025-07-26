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
  formatGermanDate,
  DATA_TABLE_TEXTS 
} from "@/lib/data-table-localization"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

// Memoized cell components for better performance
const ApartmentNameCell = React.memo(({ value }: { value: string }) => (
  <div className="font-medium">{value}</div>
))
ApartmentNameCell.displayName = "ApartmentNameCell"

const ApartmentSizeCell = React.memo(({ value }: { value: number }) => (
  <div>{formatGermanArea(value)}</div>
))
ApartmentSizeCell.displayName = "ApartmentSizeCell"

const ApartmentRentCell = React.memo(({ value }: { value: number }) => (
  <div>{formatGermanCurrency(value)}</div>
))
ApartmentRentCell.displayName = "ApartmentRentCell"

const ApartmentPricePerSqmCell = React.memo(({ apartment }: { apartment: Apartment }) => {
  const pricePerSqm = apartment.miete / apartment.groesse
  return <div>{formatGermanPricePerSqm(pricePerSqm)}</div>
})
ApartmentPricePerSqmCell.displayName = "ApartmentPricePerSqmCell"

const ApartmentHouseCell = React.memo(({ value }: { value: string | undefined }) => (
  <div>{value || '-'}</div>
))
ApartmentHouseCell.displayName = "ApartmentHouseCell"

const ApartmentTenantCell = React.memo(({ apartment }: { apartment: Apartment }) => {
  if (apartment.status === 'vermietet' && apartment.tenant) {
    return (
      <div className="space-y-1">
        <div className="font-medium">{apartment.tenant.name}</div>
        {apartment.tenant.einzug && (
          <div className="text-sm text-muted-foreground">
            {DATA_TABLE_TEXTS.moveIn}: {formatGermanDate(apartment.tenant.einzug)}
          </div>
        )}
      </div>
    )
  }
  return <div className="text-muted-foreground">-</div>
})
ApartmentTenantCell.displayName = "ApartmentTenantCell"

const ApartmentStatusCell = React.memo(({ status }: { status: string }) => (
  <Badge
    variant="outline"
    className={
      status === 'vermietet'
        ? "bg-green-50 text-green-700 hover:bg-green-50"
        : "bg-blue-50 text-blue-700 hover:bg-blue-50"
    }
  >
    {status === 'vermietet' ? DATA_TABLE_TEXTS.rented : DATA_TABLE_TEXTS.free}
  </Badge>
))
ApartmentStatusCell.displayName = "ApartmentStatusCell"

export const apartmentsColumns: ColumnDef<Apartment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={DATA_TABLE_TEXTS.selectAll}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={DATA_TABLE_TEXTS.selectRow}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.apartment} />
    ),
    cell: ({ row }) => <ApartmentNameCell value={row.getValue("name")} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "groesse",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.size} />
    ),
    cell: ({ row }) => <ApartmentSizeCell value={row.getValue("groesse")} />,
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const groesseA = rowA.getValue("groesse") as number
      const groesseB = rowB.getValue("groesse") as number
      return groesseA - groesseB
    },
  },
  {
    accessorKey: "miete",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.rent} />
    ),
    cell: ({ row }) => <ApartmentRentCell value={row.getValue("miete")} />,
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const mieteA = rowA.getValue("miete") as number
      const mieteB = rowB.getValue("miete") as number
      return mieteA - mieteB
    },
  },
  {
    id: "pricePerSqm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete pro m²" />
    ),
    cell: ({ row }) => <ApartmentPricePerSqmCell apartment={row.original} />,
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const apartmentA = rowA.original
      const apartmentB = rowB.original
      const priceA = apartmentA.miete / apartmentA.groesse
      const priceB = apartmentB.miete / apartmentB.groesse
      return priceA - priceB
    },
  },
  {
    accessorKey: "Haeuser.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.house} />
    ),
    cell: ({ row }) => <ApartmentHouseCell value={row.original.Haeuser?.name} />,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "tenant",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.tenant} />
    ),
    cell: ({ row }) => <ApartmentTenantCell apartment={row.original} />,
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const tenantA = rowA.original.tenant?.name || ''
      const tenantB = rowB.original.tenant?.name || ''
      return tenantA.localeCompare(tenantB, 'de')
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={DATA_TABLE_TEXTS.status} />
    ),
    cell: ({ row }) => <ApartmentStatusCell status={row.getValue("status")} />,
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      const status = row.getValue("status") as string
      if (value === "free") {
        return status === 'frei'
      } else if (value === "rented") {
        return status === 'vermietet'
      }
      return true
    },
  },
]