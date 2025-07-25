"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Finanzen } from "@/types/supabase"
import { FinanceContextMenu } from "@/components/finance-context-menu"

export const financesColumns: ColumnDef<Finanzen>[] = [
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
    accessorKey: "datum",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Datum" />
    ),
  },
  {
    accessorKey: "beschreibung",
    header: "Beschreibung",
  },
  {
    accessorKey: "betrag",
    header: "Betrag",
  },
  {
    accessorKey: "kategorie",
    header: "Kategorie",
  },
  {
    id: "actions",
    cell: ({ row }) => <FinanceContextMenu row={row} />,
  },
]
