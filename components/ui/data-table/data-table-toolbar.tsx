"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { statuses } from "@/app/(dashboard)/mieter/columns";
import { useDataExport } from "@/hooks/useDataExport";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterColumn: string;
}

export function DataTableToolbar<TData>({
  table,
  filterColumn,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { isExporting, handleDataExport } = useDataExport();

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter..."
          value={table.getState().globalFilter ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
      <Button
        variant="outline"
        size="sm"
        className="ml-2"
        onClick={handleDataExport}
        disabled={isExporting}
      >
        {isExporting ? "Exporting..." : "Export"}
      </Button>
    </div>
  );
}
