"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export type Finance = {
    id: string;
    datum: string;
    beschreibung: string;
    betrag: number;
    kategorie: string;
}

export const columns: ColumnDef<Finance>[] = [
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
    accessorKey: "datum",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Datum" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("datum")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "beschreibung",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Beschreibung" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("beschreibung")}
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
    {
        accessorKey: "kategorie",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Kategorie" />
        ),
        cell: ({ row }) => {
            return (
                <div className="flex space-x-2">
                    <span className="max-w-[500px] truncate font-medium">
                        {row.getValue("kategorie")}
                    </span>
                </div>
            )
        },
    },
]
