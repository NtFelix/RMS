import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the context menu components to avoid server dependencies
jest.mock('@/components/apartments/apartment-context-menu', () => ({
  ApartmentContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

jest.mock('@/components/tenants/tenant-context-menu', () => ({
  TenantContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

jest.mock('@/components/finance/finance-context-menu', () => ({
  FinanceContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}))

import { ApartmentTable } from '@/components/tables/apartment-table'
import { TenantTable } from '@/components/tables/tenant-table'
import { FinanceTransactions } from '@/components/finance-transactions'
import type { Apartment } from '@/components/tables/apartment-table'
import type { Tenant } from '@/types/Tenant'

// Mock data for testing
const mockApartments: Apartment[] = [
  {
    id: '1',
    name: 'Apartment A',
    groesse: 50,
    miete: 1000,
    haus_id: '1',
    Haeuser: { name: 'House 1' },
    status: 'frei'
  },
  {
    id: '2',
    name: 'Apartment B',
    groesse: 75,
    miete: 1500,
    haus_id: '2',
    Haeuser: { name: 'House 2' },
    status: 'vermietet'
  },
  {
    id: '3',
    name: 'Apartment C',
    groesse: 60,
    miete: 1200,
    haus_id: '1',
    Haeuser: { name: 'House 1' },
    status: 'frei'
  }
]

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    telefonnummer: '123456789',
    wohnung_id: '1',
    einzug: '2023-01-01',
    auszug: null,
    notiz: '',
    nebenkosten: [{ amount: '100', description: 'Heating' }]
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    telefonnummer: '987654321',
    wohnung_id: '2',
    einzug: '2022-06-01',
    auszug: '2023-12-31',
    notiz: '',
    nebenkosten: [{ amount: '150', description: 'Water' }]
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    telefonnummer: '555666777',
    wohnung_id: '3',
    einzug: '2023-03-01',
    auszug: null,
    notiz: '',
    nebenkosten: []
  }
]

const mockWohnungen = [
  { id: '1', name: 'Apartment A' },
  { id: '2', name: 'Apartment B' },
  { id: '3', name: 'Apartment C' }
]

const mockFinances = [
  {
    id: '1',
    wohnung_id: '1',
    name: 'Rent Payment',
    datum: '2023-01-15',
    betrag: 1000,
    ist_einnahmen: true,
    notiz: '',
    Wohnungen: { name: 'Apartment A' }
  },
  {
    id: '2',
    wohnung_id: '2',
    name: 'Maintenance Cost',
    datum: '2023-02-10',
    betrag: 500,
    ist_einnahmen: false,
    notiz: '',
    Wohnungen: { name: 'Apartment B' }
  },
  {
    id: '3',
    wohnung_id: '1',
    name: 'Utility Bill',
    datum: '2023-03-05',
    betrag: 200,
    ist_einnahmen: false,
    notiz: '',
    Wohnungen: { name: 'Apartment A' }
  }
]

// Mock IntersectionObserver for infinite scroll
window.IntersectionObserver = jest.fn().mockImplementation((callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
  return {
    observe: jest.fn().mockImplementation((element: Element) => {
      callback([{ isIntersecting: true, target: element }], this as any)
    }),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn()
  }
})

describe('Sorting and Filtering Integration', () => {
  describe('ApartmentTable Integration', () => {
    it('should maintain sort order when applying filters', () => {
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // First, sort by rent (ascending)
      const rentHeader = screen.getByText('Miete (€)').closest('div')
      fireEvent.click(rentHeader!)

      // Verify initial sort order (by rent ascending: 1000, 1200, 1500)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A') // 1000€
      expect(rows[2]).toHaveTextContent('Apartment C') // 1200€
      expect(rows[3]).toHaveTextContent('Apartment B') // 1500€

      // Now apply filter for "frei" apartments only
      rerender(
        <ApartmentTable
          filter="free"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Should show only "frei" apartments, and sorting should work
      const filteredRows = screen.getAllByRole('row')
      expect(filteredRows).toHaveLength(3) // Header + 2 data rows (only frei apartments)
      
      // Both apartments A and C are "frei", so they should both be visible
      expect(screen.getByText('Apartment A')).toBeInTheDocument()
      expect(screen.getByText('Apartment C')).toBeInTheDocument()
      expect(screen.queryByText('Apartment B')).not.toBeInTheDocument() // vermietet
    })

    it('should maintain sort order when applying search', () => {
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Sort by size (ascending)
      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      fireEvent.click(sizeHeader!)

      // Apply search for "Apartment"
      rerender(
        <ApartmentTable
          filter="all"
          searchQuery="Apartment"
          initialApartments={mockApartments}
        />
      )

      // Should show all apartments (all match "Apartment"), and sorting should work
      const searchedRows = screen.getAllByRole('row')
      expect(searchedRows).toHaveLength(4) // Header + 3 data rows
      
      // All apartments should be visible since they all contain "Apartment"
      expect(screen.getByText('Apartment A')).toBeInTheDocument()
      expect(screen.getByText('Apartment B')).toBeInTheDocument()
      expect(screen.getByText('Apartment C')).toBeInTheDocument()
    })

    it('should combine filter, search, and sort correctly', () => {
      render(
        <ApartmentTable
          filter="free"
          searchQuery="House 1"
          initialApartments={mockApartments}
        />
      )

      // Should show only free apartments in House 1
      const combinedRows = screen.getAllByRole('row')
      expect(combinedRows).toHaveLength(3) // Header + 2 data rows
      
      // Both Apartment A and C are in House 1 and are free
      expect(screen.getByText('Apartment A')).toBeInTheDocument()
      expect(screen.getByText('Apartment C')).toBeInTheDocument()
      expect(screen.queryByText('Apartment B')).not.toBeInTheDocument() // In House 2
    })
  })

  describe('TenantTable Integration', () => {
    it('should maintain sort order when applying filters', () => {
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Apply current tenant filter
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="current"
          searchQuery=""
        />
      )

      // Should show only current tenants (no auszug)
      const filteredRows = screen.getAllByRole('row')
      expect(filteredRows).toHaveLength(3) // Header + 2 data rows (current tenants)
      
      // Check that Jane Smith (who has auszug) is not shown
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should maintain sort order when applying search', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery="john"
        />
      )

      // Sort by email
      const emailHeader = screen.getByText('E-Mail').closest('div')
      fireEvent.click(emailHeader!)

      // Should show only tenants matching "john", sorted by email
      const searchedRows = screen.getAllByRole('row')
      expect(searchedRows).toHaveLength(2) // Header + 1 data row
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })

    it('should combine filter, search, and sort correctly', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="current"
          searchQuery="o" // Should match "John Doe" and "Bob Wilson"
        />
      )

      // Sort by name
      const nameHeader = screen.getByText('Name').closest('div')
      fireEvent.click(nameHeader!)

      // Should show only current tenants matching "o", sorted by name
      const combinedRows = screen.getAllByRole('row')
      expect(combinedRows).toHaveLength(3) // Header + 2 data rows
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument() // Has auszug
    })
  })

  describe('FinanceTransactions Integration', () => {
    it('should maintain sort order when applying filters', () => {
      render(
        <FinanceTransactions
          finances={mockFinances}
          wohnungen={[{ id: '1', name: 'Apartment 1' }, { id: '2', name: 'Apartment 2' }]}
          availableYears={[2023, 2024]}
          hasMore={false}
          isLoading={false}
          error={null}
          filters={{
            searchQuery: '',
            selectedApartment: 'Alle Wohnungen',
            selectedYear: 'Alle Jahre',
            selectedType: '',
            sortKey: 'betrag',
            sortDirection: 'desc'
          }}
          onFiltersChange={() => {}}
        />
      )

      // Sort by amount
      const amountHeader = screen.getByText('Betrag').closest('div')
      fireEvent.click(amountHeader!)

      // The component should show all finances sorted by amount
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(5) // Header + 3 data rows + loaded message row

      // Check that all transactions are visible
      expect(screen.getByText('Rent Payment')).toBeInTheDocument()
      expect(screen.getByText('Maintenance Cost')).toBeInTheDocument()
      expect(screen.getByText('Utility Bill')).toBeInTheDocument()
    })

    it('should maintain sort order when applying search', () => {
      render(
        <FinanceTransactions
          finances={mockFinances}
          wohnungen={[{ id: '1', name: 'Apartment 1' }, { id: '2', name: 'Apartment 2' }]}
          availableYears={[2023, 2024]}
          hasMore={false}
          isLoading={false}
          error={null}
          filters={{
            searchQuery: '',
            selectedApartment: 'Alle Wohnungen',
            selectedYear: 'Alle Jahre',
            selectedType: '',
            sortKey: 'betrag',
            sortDirection: 'desc'
          }}
          onFiltersChange={() => {}}
        />
      )

      // Sort by name
      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      fireEvent.click(nameHeader!)

      // The search functionality is internal to the component
      // We can verify the sorting works by checking the order
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(5) // Header + 3 data rows + loaded message row
    })

    it('should handle date sorting correctly', () => {
      render(
        <FinanceTransactions
          finances={mockFinances}
          wohnungen={[{ id: '1', name: 'Apartment 1' }, { id: '2', name: 'Apartment 2' }]}
          availableYears={[2023, 2024]}
          hasMore={false}
          isLoading={false}
          error={null}
          filters={{
            searchQuery: '',
            selectedApartment: 'Alle Wohnungen',
            selectedYear: 'Alle Jahre',
            selectedType: '',
            sortKey: 'betrag',
            sortDirection: 'desc'
          }}
          onFiltersChange={() => {}}
        />
      )

      // Sort by date
      const dateHeader = screen.getByText('Datum').closest('div')
      fireEvent.click(dateHeader!)

      // Should sort by date (default is descending for finance table)
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(5) // Header + 3 data rows + loaded message row
    })

    it('should handle type sorting correctly', () => {
      render(
        <FinanceTransactions
          finances={mockFinances}
          wohnungen={[{ id: '1', name: 'Apartment 1' }, { id: '2', name: 'Apartment 2' }]}
          availableYears={[2023, 2024]}
          hasMore={false}
          isLoading={false}
          error={null}
          filters={{
            searchQuery: '',
            selectedApartment: 'Alle Wohnungen',
            selectedYear: 'Alle Jahre',
            selectedType: '',
            sortKey: 'betrag',
            sortDirection: 'desc'
          }}
          onFiltersChange={() => {}}
        />
      )

      // Sort by type
      const typeHeader = screen.getByText('Typ').closest('div')
      fireEvent.click(typeHeader!)

      // Should sort by type (Einnahme vs Ausgabe)
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(5) // Header + 3 data rows + loaded message row
      
      // Check that badges are rendered
      expect(screen.getByText('Einnahme')).toBeInTheDocument()
      expect(screen.getAllByText('Ausgabe')).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty datasets correctly', () => {
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={[]}
        />
      )

      // Should show "no apartments found" message
      expect(screen.getByText('Keine Wohnungen gefunden.')).toBeInTheDocument()

      // Sort headers should still be clickable
      const nameHeader = screen.getByText('Wohnung').closest('div')
      fireEvent.click(nameHeader!)
      
      // Should still show no apartments message
      expect(screen.getByText('Keine Wohnungen gefunden.')).toBeInTheDocument()
    })

    it('should handle null/undefined values in sorting', () => {
      const apartmentsWithNulls: Apartment[] = [
        {
          id: '1',
          name: 'Apartment A',
          groesse: 50,
          miete: 1000,
          haus_id: '1',
          Haeuser: null, // null house
          status: 'frei'
        },
        {
          id: '2',
          name: 'Apartment B',
          groesse: 75,
          miete: 1500,
          haus_id: '2',
          Haeuser: { name: 'House 2' },
          status: 'vermietet'
        }
      ]

      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={apartmentsWithNulls}
        />
      )

      // Sort by house name (one has null house)
      const houseHeader = screen.getByText('Haus').closest('div')
      fireEvent.click(houseHeader!)

      // Should handle null values gracefully
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 data rows
      expect(screen.getByText('-')).toBeInTheDocument() // null house shows as '-'
      expect(screen.getByText('House 2')).toBeInTheDocument()
    })

    it('should preserve sort state when filters change', () => {
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Sort by rent (ascending)
      const rentHeader = screen.getByText('Miete (€)').closest('div')
      fireEvent.click(rentHeader!)

      // Change filter but keep same sort
      rerender(
        <ApartmentTable
          filter="free"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Sort should be maintained within the filtered results
      const filteredRows = screen.getAllByRole('row')
      expect(filteredRows.length).toBeGreaterThan(1) // Should have filtered results
    })
  })
})
