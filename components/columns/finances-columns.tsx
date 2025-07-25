"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Finanzen } from "@/lib/data-fetching"
import { FinanceContextMenu } from "@/components/finance-context-menu"

export const financesColumns: ColumnDef<Finanzen>[] = [
  {
    accessorKey: "name",
    header: "Bezeichnung",
  },
  {
    accessorKey: "Wohnungen.name",
    header: "Wohnung",
  },
  {
    accessorKey: "datum",
    header: "Datum",
  },
  {
    accessorKey: "betrag",
    header: "Betrag",
  },
  {
    accessorKey: "ist_einnahmen",
    header: "Typ",
  },
]
