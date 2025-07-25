// Enhanced Data Table Types for TanStack Table integration
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  Table,
  Row,
  Column,
  Cell,
  Header,
  HeaderGroup,
} from '@tanstack/react-table'

// Re-export commonly used TanStack Table types for easier imports
export type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  Table,
  Row,
  Column,
  Cell,
  Header,
  HeaderGroup,
}

// Base data table props interface
export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  enableSelection?: boolean
  enablePagination?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
  onRowClick?: (row: TData) => void
  contextMenuComponent?: React.ComponentType<{ row: TData; children: React.ReactNode }>
  filters?: FilterConfig[]
  onExport?: (format: 'csv' | 'pdf') => void
  exportOptions?: ExportOptions
  className?: string
  loading?: boolean
  emptyMessage?: string
}

// Filter configuration interface
export interface FilterConfig {
  key: string
  label: string
  options: { label: string; value: string }[]
  type: 'select' | 'multiselect' | 'date'
}

// Export options interface
export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
  dateFormat?: 'german' | 'iso'
  numberFormat?: 'german' | 'us'
}

// Table toolbar props interface
export interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
  enableColumnVisibility?: boolean
  enableExport?: boolean
  onExport?: (format: 'csv' | 'pdf') => void
  isExporting?: boolean
}

// Pagination props interface
export interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
  showSelectedCount?: boolean
}

// Column header props interface
export interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

// Table state interface
export interface TableState {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
  pagination: PaginationState
  globalFilter: string
}

// Loading state interface
export interface LoadingState {
  isLoading: boolean
  isRefreshing: boolean
  isExporting: boolean
  error?: string
}

// Column configuration interface
export interface ColumnConfig {
  key: string
  label: string
  sortable: boolean
  filterable: boolean
  hideable: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
  formatter?: (value: any) => string
  cellComponent?: React.ComponentType<{ value: any; row: any }>
}