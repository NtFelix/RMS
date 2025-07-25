"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { House } from "@/components/house-table"
import { HouseContextMenu } from "@/components/house-context-menu"

export const housesColumns: ColumnDef<House>[] = [
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
      <DataTableColumnHeader column={column} title="Häuser" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "ort",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ort" />
    ),
  },
  {
    accessorKey: "strasse",
    header: "Strasse",
  },
  {
    accessorKey: "plz",
    header: "PLZ",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <HouseContextMenu house={row.original} onEdit={() => {}} onRefresh={() => {}}>
            <button className="p-2">...</button>
          </HouseContextMenu>
        </div>
      );
    },
  },
]
