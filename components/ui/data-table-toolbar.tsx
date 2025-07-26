import * as React from "react"
import { Table } from "@tanstack/react-table"
import { X, Search, Download, FileText, Settings2, Filter, ChevronDown } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { DATA_TABLE_TEXTS } from "@/lib/data-table-localization"

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
  isExporting?: boolean
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = DATA_TABLE_TEXTS.search,
  filters = [],
  enableColumnVisibility = true,
  enableExport = true,
  onExport,
  isExporting = false,
  globalFilter,
  onGlobalFilterChange,
}: DataTableToolbarProps<TData>) {
  const isMobile = useIsMobile()
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  
  const isFiltered = table.getState().columnFilters.length > 0 || 
                    table.getState().globalFilter

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Mobile: Top row with search and actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? (table.getState().globalFilter as string) ?? ""}
              onChange={(event) => {
                const value = event.target.value
                if (onGlobalFilterChange) {
                  onGlobalFilterChange(value)
                } else {
                  table.setGlobalFilter(value)
                }
              }}
              className="pl-8 h-8"
              aria-label={DATA_TABLE_TEXTS.search}
            />
          </div>
          
          <div className="flex items-center gap-1">
            {/* Mobile Filters Toggle */}
            {filters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 mobile-table-button"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                aria-label={DATA_TABLE_TEXTS.filter}
              >
                <Filter className="h-4 w-4" />
                <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
              </Button>
            )}
            
            {/* Mobile Export */}
            {enableExport && onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 mobile-table-button"
                    aria-label={DATA_TABLE_TEXTS.export}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onClick={() => onExport('csv')}
                    className="cursor-pointer"
                    disabled={isExporting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    onClick={() => onExport('pdf')}
                    className="cursor-pointer"
                    disabled={isExporting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Mobile Column Visibility */}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 mobile-table-button"
                    aria-label={DATA_TABLE_TEXTS.columns}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>{DATA_TABLE_TEXTS.showColumns}</DropdownMenuLabel>
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

        {/* Mobile: Collapsible filters row */}
        {showMobileFilters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
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
                <SelectTrigger className="h-8 w-[140px]">
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
                  if (onGlobalFilterChange) {
                    onGlobalFilterChange("")
                  } else {
                    table.setGlobalFilter("")
                  }
                }}
                className="h-8 px-2"
                aria-label={DATA_TABLE_TEXTS.clearFilters}
              >
{DATA_TABLE_TEXTS.clearFilters}
                <X className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? (table.getState().globalFilter as string) ?? ""}
            onChange={(event) => {
              const value = event.target.value
              if (onGlobalFilterChange) {
                onGlobalFilterChange(value)
              } else {
                table.setGlobalFilter(value)
              }
            }}
            className="pl-8 h-8 w-[150px] lg:w-[250px]"
            aria-label={DATA_TABLE_TEXTS.search}
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
              if (onGlobalFilterChange) {
                onGlobalFilterChange("")
              } else {
                table.setGlobalFilter("")
              }
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
                aria-label={DATA_TABLE_TEXTS.export}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
{DATA_TABLE_TEXTS.exporting}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
{DATA_TABLE_TEXTS.export}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{DATA_TABLE_TEXTS.exportFormat}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                onClick={() => onExport('csv')}
                className="cursor-pointer"
                disabled={isExporting}
              >
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onClick={() => onExport('pdf')}
                className="cursor-pointer"
                disabled={isExporting}
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
                aria-label={DATA_TABLE_TEXTS.showColumns}
              >
                <Settings2 className="mr-2 h-4 w-4" />
{DATA_TABLE_TEXTS.columns}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>{DATA_TABLE_TEXTS.showColumns}</DropdownMenuLabel>
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