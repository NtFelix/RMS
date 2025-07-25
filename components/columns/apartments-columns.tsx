"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Apartment } from "@/components/apartment-table"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"

export const apartmentsColumns: ColumnDef<Apartment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
  },
  {
    accessorKey: "miete",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete" />
    ),
  },
  {
    accessorKey: "groesse",
    header: "Größe (m²)",
  },
  {
    accessorKey: "zimmer",
    header: "Zimmer",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <ApartmentContextMenu apartment={row.original} onEdit={() => {}} onRefresh={() => {}}>
            <button className="p-2">...</button>
          </ApartmentContextMenu>
        </div>
      );
    },
  },
]
