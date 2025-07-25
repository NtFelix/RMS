"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { exportToCsv, exportToPdf } from "@/lib/export"
import { OperatingCost } from "./columns"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleExportCsv = () => {
    const data = table.getFilteredRowModel().rows.map(row => row.original as OperatingCost);
    exportToCsv(data, ['id', 'jahr', 'haus_id', 'kostenart', 'betrag'], 'betriebskosten');
  };

  const handleExportPdf = () => {
    const data = table.getFilteredRowModel().rows.map(row => row.original as OperatingCost);
    exportToPdf(data, ['id', 'jahr', 'haus_id', 'kostenart', 'betrag'], 'betriebskosten');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Betriebskosten filtern..."
          value={(table.getColumn("kostenart")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("kostenart")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Filter zurücksetzen
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={handleExportCsv} variant="outline" size="sm">CSV</Button>
        <Button onClick={handleExportPdf} variant="outline" size="sm">PDF</Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
