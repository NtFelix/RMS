# Data Table Loading and Error States

This document describes the comprehensive loading and error state system implemented for the enhanced data tables.

## Overview

The data table loading and error states provide a consistent, accessible, and user-friendly experience when data is being loaded, exported, or when errors occur. The system includes:

1. **Skeleton Loading Components** - Show loading placeholders while data is being fetched
2. **Enhanced Empty States** - Provide contextual messages and actions when no data is available
3. **Export Loading Overlays** - Show progress during data export operations
4. **Error Boundaries** - Handle and recover from component errors gracefully

## Components

### DataTableSkeleton

A comprehensive skeleton component that shows loading placeholders for the entire table structure.

```tsx
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

// Basic usage
<DataTableSkeleton />

// Customized
<DataTableSkeleton
  columnCount={5}
  rowCount={8}
  showToolbar={true}
  showPagination={true}
  showSelection={true}
/>
```

**Props:**
- `columnCount?: number` - Number of columns to show (default: 5)
- `rowCount?: number` - Number of rows to show (default: 5)
- `showToolbar?: boolean` - Show toolbar skeleton (default: true)
- `showPagination?: boolean` - Show pagination skeleton (default: true)
- `showSelection?: boolean` - Show selection column (default: false)
- `className?: string` - Additional CSS classes

**Specialized Skeletons:**
- `HousesTableSkeleton` - Pre-configured for houses table
- `ApartmentsTableSkeleton` - Pre-configured for apartments table
- `TenantsTableSkeleton` - Pre-configured for tenants table
- `FinancesTableSkeleton` - Pre-configured for finances table
- `OperatingCostsTableSkeleton` - Pre-configured for operating costs table
- `MobileDataTableSkeleton` - Optimized for mobile card layouts

### DataTableEmptyState

A flexible empty state component that adapts to different scenarios (no data, search results, filtered results, errors).

```tsx
import { 
  DataTableEmptyState,
  DataTableNoDataState,
  DataTableSearchEmptyState,
  DataTableFilterEmptyState,
  DataTableErrorState
} from "@/components/ui/data-table-empty-state"

// Basic empty state
<DataTableEmptyState />

// With custom action
<DataTableEmptyState
  title="Keine Häuser vorhanden"
  description="Erstellen Sie Ihr erstes Haus, um zu beginnen."
  action={{
    label: "Haus erstellen",
    onClick: () => openCreateModal(),
    icon: Plus
  }}
/>

// Search empty state
<DataTableSearchEmptyState
  searchTerm="nonexistent"
  onClearSearch={() => setSearch("")}
/>

// Filter empty state
<DataTableFilterEmptyState
  onClearFilters={() => clearAllFilters()}
/>

// Error state
<DataTableErrorState
  onRetry={() => refetchData()}
/>
```

**Props:**
- `title?: string` - Custom title (auto-generated based on context)
- `description?: string` - Custom description (auto-generated based on context)
- `icon?: React.ComponentType` - Custom icon component
- `action?: { label: string; onClick: () => void; icon?: React.ComponentType }` - Primary action button
- `isFiltered?: boolean` - Whether filters are active
- `onClearFilters?: () => void` - Handler to clear filters
- `searchTerm?: string` - Current search term
- `onClearSearch?: () => void` - Handler to clear search
- `className?: string` - Additional CSS classes

### DataTableLoadingOverlay

A modal overlay that shows during long-running operations like data export.

```tsx
import { 
  DataTableLoadingOverlay,
  ExportLoadingOverlay,
  RefreshLoadingOverlay,
  BulkActionLoadingOverlay
} from "@/components/ui/data-table-loading-overlay"

// Export loading
<ExportLoadingOverlay
  isVisible={isExporting}
  format="csv"
  progress={50}
/>

// Refresh loading
<RefreshLoadingOverlay
  isVisible={isRefreshing}
  message="Daten werden aktualisiert..."
/>

// Bulk action loading
<BulkActionLoadingOverlay
  isVisible={isProcessing}
  actionName="Löschen"
  progress={75}
/>
```

**Props:**
- `isVisible: boolean` - Whether the overlay is shown
- `type: 'export' | 'refresh' | 'bulk-action' | 'generic'` - Type of operation
- `format?: 'csv' | 'pdf'` - Export format (for export type)
- `progress?: number` - Progress percentage (0-100)
- `message?: string` - Custom message
- `className?: string` - Additional CSS classes

### DataTableErrorBoundary

An error boundary that catches and handles component errors gracefully.

```tsx
import { DataTableErrorBoundary } from "@/components/ui/data-table-error-boundary"

<DataTableErrorBoundary
  fallback={CustomErrorComponent}
  onError={(error, errorInfo) => logError(error, errorInfo)}
>
  <DataTable {...props} />
</DataTableErrorBoundary>
```

**Props:**
- `children: React.ReactNode` - Components to wrap
- `fallback?: React.ComponentType<{ error?: Error; retry: () => void }>` - Custom error component
- `onError?: (error: Error, errorInfo: React.ErrorInfo) => void` - Error handler

## Integration with DataTable

The main `DataTable` component automatically integrates all loading and error states:

```tsx
<DataTable
  columns={columns}
  data={data}
  loading={isLoading}
  error={errorMessage}
  emptyMessage="Keine Daten gefunden."
  emptyAction={{
    label: "Erstellen",
    onClick: () => openCreateModal(),
    icon: Plus
  }}
  onRetry={() => refetchData()}
  // ... other props
/>
```

**New Props:**
- `loading?: boolean` - Shows skeleton when true
- `error?: string` - Error message to display
- `emptyAction?: { label: string; onClick: () => void; icon?: React.ComponentType }` - Action for empty state
- `onRetry?: () => void` - Retry handler for errors

## Entity-Specific Integration

Each entity data table has been updated to support the new loading and error states:

```tsx
// Houses Data Table
<HousesDataTable
  data={houses}
  onEdit={editHouse}
  onRefresh={refetchHouses}
  onCreateNew={createNewHouse}
  loading={isLoading}
  error={errorMessage}
/>

// Similar for ApartmentsDataTable, TenantsDataTable, FinancesDataTable
```

## Accessibility Features

All loading and error states include comprehensive accessibility support:

### Screen Reader Support
- Live regions announce state changes
- Proper ARIA labels and descriptions
- Loading state announcements
- Error state descriptions

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus management during state transitions
- Escape key support for dismissing overlays

### Visual Indicators
- High contrast loading indicators
- Clear visual hierarchy
- Consistent iconography
- Progress indicators where applicable

## German Localization

All text content is provided in German:

- **Loading**: "Tabelle wird geladen", "Daten werden aktualisiert..."
- **Empty States**: "Keine Daten verfügbar", "Keine Suchergebnisse"
- **Actions**: "Erneut versuchen", "Erstellen", "Filter zurücksetzen"
- **Export**: "Daten werden als CSV exportiert...", "Export erfolgreich"

## Best Practices

### When to Use Each State

1. **Skeleton Loading**: Initial data loading, page navigation
2. **Empty State with Action**: No data exists, user can create
3. **Search Empty State**: Search returned no results
4. **Filter Empty State**: Filters are too restrictive
5. **Error State**: Data loading failed, network issues
6. **Export Loading**: Long-running export operations

### Performance Considerations

- Skeletons use CSS animations for smooth performance
- Loading overlays are rendered conditionally
- Error boundaries prevent entire page crashes
- Memoized components prevent unnecessary re-renders

### Testing

Comprehensive test coverage includes:

- Skeleton rendering with different configurations
- Empty state variations and interactions
- Loading overlay visibility and progress
- Error boundary error handling
- Accessibility compliance
- German text content

## Examples

### Complete Loading Flow

```tsx
function HousesPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const fetchHouses = async () => {
    try {
      setLoading(true)
      setError(undefined)
      const data = await getHouses()
      setHouses(data)
    } catch (err) {
      setError("Fehler beim Laden der Häuser")
    } finally {
      setLoading(false)
    }
  }

  return (
    <HousesDataTable
      data={houses}
      loading={loading}
      error={error}
      onEdit={editHouse}
      onRefresh={fetchHouses}
      onCreateNew={() => openCreateModal()}
    />
  )
}
```

### Custom Empty State

```tsx
<DataTable
  columns={columns}
  data={[]}
  emptyMessage="Noch keine Transaktionen erfasst."
  emptyAction={{
    label: "Erste Transaktion hinzufügen",
    onClick: () => router.push('/finances/new'),
    icon: Plus
  }}
/>
```

### Export with Progress

```tsx
function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleExport = async () => {
    setIsExporting(true)
    setProgress(0)
    
    try {
      await exportWithProgress((p) => setProgress(p))
    } finally {
      setIsExporting(false)
      setProgress(0)
    }
  }

  return (
    <>
      <Button onClick={handleExport}>Export</Button>
      <ExportLoadingOverlay
        isVisible={isExporting}
        format="csv"
        progress={progress}
      />
    </>
  )
}
```

This comprehensive loading and error state system ensures a consistent, accessible, and user-friendly experience across all data tables in the application.