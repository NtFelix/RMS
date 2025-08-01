# Implementation Plan

- [x] 1. Add sorting functionality to Apartment Table
  - Copy sorting state management from house-table.tsx (sortKey, sortDirection state)
  - Implement handleSort function and renderSortIcon function from house-table.tsx
  - Add TableHeaderCell component with identical styling and interaction patterns
  - Define ApartmentSortKey type for sortable fields (name, groesse, miete, pricePerSqm, haus, status)
  - Implement sorting logic in useMemo with proper numeric and string comparisons
  - Update table headers to use TableHeaderCell components with sort functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Add sorting functionality to Tenant Table
  - Copy sorting state management from house-table.tsx (sortKey, sortDirection state)
  - Implement handleSort function and renderSortIcon function from house-table.tsx
  - Add TableHeaderCell component with identical styling and interaction patterns
  - Define TenantSortKey type for sortable fields (name, email, telefonnummer, wohnung, nebenkosten)
  - Implement sorting logic in useMemo with proper string and numeric comparisons
  - Update table headers to use TableHeaderCell components with sort functionality
  - Handle nebenkosten sorting by calculating total utility costs
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Add sorting functionality to Finance Table
  - Copy sorting state management from house-table.tsx (sortKey, sortDirection state)
  - Implement handleSort function and renderSortIcon function from house-table.tsx
  - Add TableHeaderCell component with identical styling and interaction patterns
  - Define FinanceSortKey type for sortable fields (name, wohnung, datum, betrag, typ)
  - Implement sorting logic in useMemo with proper date, numeric, and string comparisons
  - Update table headers to use TableHeaderCell components with sort functionality
  - Handle date sorting with proper chronological ordering
  - Handle typ sorting based on ist_einnahmen boolean field
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Integrate sorting with existing filtering and search functionality
  - Ensure sorting works correctly with apartment table filtering (free/rented status)
  - Ensure sorting works correctly with tenant table filtering (current/previous tenants)
  - Ensure sorting works correctly with finance table filtering (apartment, year, type filters)
  - Verify sorting maintains order when search queries are applied
  - Test that filter changes preserve current sort state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Add comprehensive unit tests for sorting functionality
  - Write tests for apartment table sorting logic (string, numeric, calculated fields)
  - Write tests for tenant table sorting logic (string comparisons, nebenkosten calculations)
  - Write tests for finance table sorting logic (date, numeric, boolean comparisons)
  - Write tests for sort state management (direction toggling, key switching)
  - Write tests for integration with existing filters and search functionality
  - Write tests for edge cases (null values, empty datasets, identical values)
  - _Requirements: All requirements for comprehensive test coverage_

- [x] 6. Verify build and functionality
  - Run npm install to ensure all dependencies are available
  - Run npm run build to verify no TypeScript or build errors
  - Test sorting functionality manually on all three tables
  - Verify visual consistency with Häuser table sorting implementation
  - Ensure no regressions in existing table functionality
  - _Requirements: All requirements for final verification_