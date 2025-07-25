import * as React from "react"
import { Table } from "@tanstack/react-table"
import { X, Search, Download, FileText, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface FilterConfig {
  key: string
  label: string
  options: { label: string; value: string }[]
  type: 'select' | 'multiselect' | 'date'
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
  enableColumnVisibility?: boolean
  enableExport?: boolean
  onExport?: (format: 'csv' | 'pdf') => void
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Suchen...",
  filters = [],
  enableColumnVisibility = true,
  enableExport = true,
  onExport,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || 
                    table.getState().globalFilter

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="pl-8 h-8 w-[150px] lg:w-[250px]"
            aria-label="Globale Suche"
          />
        </div>

        {/* Entity-specific Filters */}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={
              (table.getColumn(filter.key)?.getFilterValue() as string) ?? "all"
            }
            onValueChange={(value) => {
              const column = table.getColumn(filter.key)
              if (value === "all") {
                column?.setFilterValue(undefined)
              } else {
                column?.setFilterValue(value)
              }
            }}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle {filter.label}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter("")
            }}
            className="h-8 px-2 lg:px-3"
            aria-label="Filter zurücksetzen"
          >
            Zurücksetzen
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Export Buttons */}
        {enableExport && onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-8"
                aria-label="Daten exportieren"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Exportformat</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                onClick={() => onExport('csv')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onClick={() => onExport('pdf')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Column Visibility Toggle */}
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-8"
                aria-label="Spalten ein-/ausblenden"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Spalten
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Spalten anzeigen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.columnDef.header as string}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}