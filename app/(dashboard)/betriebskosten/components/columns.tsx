"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export type OperatingCost = {
    id: string;
    jahr: number;
    haus_id: string;
    kostenart: string;
    betrag: number;
}

export const columns: ColumnDef<OperatingCost>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Alle auswählen"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zeile auswählen"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "jahr",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jahr" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("jahr")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "kostenart",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kostenart" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("kostenart")}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "betrag",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Betrag" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("betrag")}
          </span>
        </div>
      )
    },
  },
]
