"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Betriebskosten } from "@/types/supabase"
import { OperatingCostsContextMenu } from "@/components/operating-costs-context-menu"

export const operatingCostsColumns: ColumnDef<Betriebskosten>[] = [
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
    accessorKey: "jahr",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jahr" />
    ),
  },
  {
    accessorKey: "kostenart",
    header: "Kostenart",
  },
  {
    accessorKey: "betrag",
    header: "Betrag",
  },
  {
    id: "actions",
    cell: ({ row }) => <OperatingCostsContextMenu row={row} />,
  },
]
