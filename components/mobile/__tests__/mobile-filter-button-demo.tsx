import React, { useState } from 'react'
import { MobileFilterButton, FilterOption } from '../mobile-filter-button'

/**
 * Demo component showing how to use MobileFilterButton
 * This demonstrates the component with sample filter options
 */
export function MobileFilterButtonDemo() {
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // Example filter options for different use cases
  const houseFilters: FilterOption[] = [
    { id: 'all', label: 'Alle Häuser', count: 15 },
    { id: 'full', label: 'Voll belegt', count: 8 },
    { id: 'vacant', label: 'Freie Plätze', count: 7 }
  ]

  const apartmentFilters: FilterOption[] = [
    { id: 'all', label: 'Alle Wohnungen', count: 42 },
    { id: 'rented', label: 'Vermietet', count: 35 },
    { id: 'free', label: 'Frei', count: 7 }
  ]

  const tenantFilters: FilterOption[] = [
    { id: 'current', label: 'Aktuelle Mieter', count: 35 },
    { id: 'previous', label: 'Vorherige Mieter', count: 12 },
    { id: 'all', label: 'Alle Mieter', count: 47 }
  ]

  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters)
    console.log('Active filters changed:', filters)
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Mobile Filter Button Demo</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">House Filters</h3>
          <MobileFilterButton
            filters={houseFilters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Apartment Filters</h3>
          <MobileFilterButton
            filters={apartmentFilters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Tenant Filters</h3>
          <MobileFilterButton
            filters={tenantFilters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Custom Styled Filter</h3>
          <MobileFilterButton
            filters={houseFilters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            className="bg-green-50 border-green-200 text-green-700"
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Current Active Filters:</h4>
        <pre className="text-sm text-gray-600">
          {JSON.stringify(activeFilters, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default MobileFilterButtonDemo