# Design Document

## Overview

This design document outlines the implementation approach for adding comprehensive sorting functionality to the Wohnungen (Apartments), Mieter (Tenants), and Finanzen (Finance) tables in the RMS application. The design directly follows and replicates the existing sorting implementation from the Häuser (Houses) table (`components/house-table.tsx`) as the primary reference pattern, ensuring complete consistency across all data tables.

### Reference Implementation

The Häuser table implementation serves as the blueprint for all sorting functionality, including:
- State management patterns (`sortKey`, `sortDirection`)
- `TableHeaderCell` component structure and styling
- Sort handling logic (`handleSort`, `renderSortIcon`)
- Icon usage (ChevronsUpDown, ArrowUp, ArrowDown from lucide-react)
- Hover effects and interactive styling
- Integration with existing filtering and search functionality

## Architecture

### Component Structure

The sorting functionality will be implemented using React hooks and state management within each table component:

- **State Management**: Each table will maintain local state for `sortKey` and `sortDirection`
- **Sorting Logic**: A `useMemo` hook will handle the sorting computation
- **UI Components**: Reusable `TableHeaderCell` component for consistent header rendering
- **Event Handling**: Click handlers for column headers to trigger sorting

### Data Flow

1. User clicks on a table header
2. `handleSort` function updates the sort state
3. `useMemo` recalculates the sorted data
4. Component re-renders with sorted results
5. Visual indicators update to reflect current sort state

## Components and Interfaces

### Sorting State Interface

```typescript
type SortDirection = "asc" | "desc"

// Apartment Table
type ApartmentSortKey = "name" | "groesse" | "miete" | "pricePerSqm" | "haus" | "status"

// Tenant Table  
type TenantSortKey = "name" | "email" | "telefonnummer" | "wohnung" | "nebenkosten"

// Finance Table
type FinanceSortKey = "name" | "wohnung" | "datum" | "betrag" | "typ"
```

### TableHeaderCell Component

A reusable component that will be implemented in each table:

```typescript
interface TableHeaderCellProps {
  sortKey: SortKey
  children: React.ReactNode
  className?: string
  onClick: (key: SortKey) => void
  currentSortKey: SortKey | null
  sortDirection: SortDirection
}
```

### Sorting Functions

Each table will implement:

- `handleSort(key: SortKey)`: Updates sort state
- `renderSortIcon(key: SortKey)`: Returns appropriate icon based on sort state
- Sorting logic within `useMemo` for performance optimization

## Data Models

### Apartment Table Sorting

**Sortable Fields:**
- `name`: String comparison (apartment name)
- `groesse`: Numeric comparison (size in m²)
- `miete`: Numeric comparison (rent amount)
- `pricePerSqm`: Calculated field (miete/groesse)
- `haus`: String comparison via `Haeuser?.name`
- `status`: String comparison ('frei' vs 'vermietet')

### Tenant Table Sorting

**Sortable Fields:**
- `name`: String comparison (tenant name)
- `email`: String comparison (email address)
- `telefonnummer`: String comparison (phone number)
- `wohnung`: String comparison via wohnungsMap lookup
- `nebenkosten`: Numeric comparison based on total utility costs

### Finance Table Sorting

**Sortable Fields:**
- `name`: String comparison (transaction description)
- `wohnung`: String comparison via `Wohnungen?.name`
- `datum`: Date comparison (chronological sorting)
- `betrag`: Numeric comparison (amount)
- `typ`: Boolean comparison (`ist_einnahmen` field)

## Error Handling

### Null/Undefined Value Handling

- Empty or null values will be treated as empty strings for string comparisons
- Missing numeric values will be treated as 0 for numeric comparisons
- Date fields will handle invalid dates gracefully

### Fallback Sorting

- If primary sort field is identical, maintain original order
- Handle edge cases where calculated fields might be NaN or undefined

## Testing Strategy

### Unit Tests

1. **Sort State Management**
   - Test initial sort state
   - Test sort direction toggling
   - Test sort key switching

2. **Sorting Logic**
   - Test string sorting (ascending/descending)
   - Test numeric sorting (ascending/descending)
   - Test date sorting (chronological)
   - Test calculated field sorting (price per sqm)

3. **Integration with Filters**
   - Test sorting with active filters
   - Test sorting with search queries
   - Test combined filter + search + sort scenarios

4. **Edge Cases**
   - Test sorting with empty datasets
   - Test sorting with null/undefined values
   - Test sorting with identical values

### Component Tests

1. **TableHeaderCell Component**
   - Test icon rendering for different sort states
   - Test click event handling
   - Test hover states and accessibility

2. **Table Integration**
   - Test header rendering with sort icons
   - Test table data ordering after sort
   - Test visual feedback on sort changes

### Performance Tests

1. **Large Dataset Handling**
   - Test sorting performance with 1000+ records
   - Test memory usage during sort operations
   - Test UI responsiveness during sorting

## Implementation Notes

### Code Reuse Strategy

- Directly replicate the Häuser table sorting implementation patterns
- Copy the exact `TableHeaderCell` component structure from `house-table.tsx`
- Use identical icon components, styling, and interaction patterns
- Maintain the same state management approach and naming conventions
- Preserve the exact hover effects and visual feedback from the Häuser implementation

### Accessibility Considerations

- Add proper ARIA labels for sort buttons
- Ensure keyboard navigation support
- Provide screen reader announcements for sort changes

### Performance Optimizations

- Use `useMemo` for expensive sorting operations
- Implement stable sorting to maintain consistent results
- Consider virtualization for very large datasets (future enhancement)

### Styling Consistency

- Maintain consistent hover effects across all tables
- Use the same icon sizing and positioning
- Ensure proper spacing and alignment in table headers