"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"

export interface Finance {
  id: string
  wohnung_id?: string | null
  name: string
  datum?: string | null
  betrag: number
  ist_einnahmen: boolean
  notiz?: string | null
  Wohnungen?: { name: string } | null
}

// Helper function to format date in German locale (DD.MM.YYYY)
const formatGermanDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Helper function to format currency in German locale
const formatGermanCurrency = (amount: number): string => {
  return amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " €"
}

export const financesColumns: ColumnDef<Finance>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bezeichnung" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "apartment",
    accessorFn: (row) => row.Wohnungen?.name || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
    cell: ({ row }) => {
      const apartmentName = row.original.Wohnungen?.name
      return (
        <div>{apartmentName || "-"}</div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      const apartmentName = row.original.Wohnungen?.name || ""
      if (value === "all" || !value) return true
      return apartmentName === value
    },
  },
  {
    accessorKey: "datum",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Datum" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("datum") as string | null
      return (
        <div>{formatGermanDate(date)}</div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.getValue("datum") as string | null
      const dateB = rowB.getValue("datum") as string | null
      
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    },
  },
  {
    accessorKey: "betrag",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Betrag" className="text-right" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("betrag") as number
      const isIncome = row.original.ist_einnahmen
      
      return (
        <div className={`text-right font-medium ${
          isIncome ? "text-green-600" : "text-red-600"
        }`}>
          {formatGermanCurrency(amount)}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const amountA = rowA.getValue("betrag") as number
      const amountB = rowB.getValue("betrag") as number
      return amountA - amountB
    },
  },
  {
    id: "type",
    accessorFn: (row) => row.ist_einnahmen,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Typ" />
    ),
    cell: ({ row }) => {
      const isIncome = row.original.ist_einnahmen
      
      return (
        <Badge
          variant="outline"
          className={
            isIncome
              ? "bg-green-50 text-green-700 hover:bg-green-50"
              : "bg-red-50 text-red-700 hover:bg-red-50"
          }
        >
          {isIncome ? "Einnahme" : "Ausgabe"}
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const typeA = rowA.original.ist_einnahmen
      const typeB = rowB.original.ist_einnahmen
      
      // Sort income first (true), then expenses (false)
      if (typeA === typeB) return 0
      return typeA ? -1 : 1
    },
    filterFn: (row, id, value) => {
      const isIncome = row.original.ist_einnahmen
      
      if (value === "all") return true
      if (value === "income") return isIncome
      if (value === "expense") return !isIncome
      
      return true
    },
  },
  {
    accessorKey: "notiz",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notiz" />
    ),
    cell: ({ row }) => {
      const note = row.getValue("notiz") as string | null
      return (
        <div className="max-w-[200px] truncate" title={note || ""}>
          {note || "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
]