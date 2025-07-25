"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"

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
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "groesse",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Größe" />
    ),
    cell: ({ row }) => {
      const groesse = row.getValue("groesse") as number
      return (
        <div>{groesse} m²</div>
      )
    },
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
      <DataTableColumnHeader column={column} title="Miete" />
    ),
    cell: ({ row }) => {
      const miete = row.getValue("miete") as number
      return (
        <div>{miete} €</div>
      )
    },
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
    cell: ({ row }) => {
      const apartment = row.original
      const pricePerSqm = apartment.miete / apartment.groesse
      return (
        <div>{pricePerSqm.toFixed(2)} €/m²</div>
      )
    },
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
      <DataTableColumnHeader column={column} title="Haus" />
    ),
    cell: ({ row }) => {
      const apartment = row.original
      return (
        <div>{apartment.Haeuser?.name || '-'}</div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "tenant",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mieter" />
    ),
    cell: ({ row }) => {
      const apartment = row.original
      if (apartment.status === 'vermietet' && apartment.tenant) {
        return (
          <div className="space-y-1">
            <div className="font-medium">{apartment.tenant.name}</div>
            {apartment.tenant.einzug && (
              <div className="text-sm text-muted-foreground">
                Einzug: {new Date(apartment.tenant.einzug).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
        )
      }
      return <div className="text-muted-foreground">-</div>
    },
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
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant="outline"
          className={
            status === 'vermietet'
              ? "bg-green-50 text-green-700 hover:bg-green-50"
              : "bg-blue-50 text-blue-700 hover:bg-blue-50"
          }
        >
          {status}
        </Badge>
      )
    },
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