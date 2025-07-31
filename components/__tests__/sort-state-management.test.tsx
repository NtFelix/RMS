import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApartmentTable, Apartment } from '@/components/apartment-table'
import { TenantTable } from '@/components/tenant-table'
import { FinanceTransactions } from '@/components/finance-transactions'
import { Tenant } from '@/types/Tenant'

// Mock components
jest.mock('@/components/apartment-context-menu', () => ({
  ApartmentContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/tenant-context-menu', () => ({
  TenantContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/finance-context-menu', () => ({
  FinanceContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn()
  })
}))

// Test data
const mockApartments: Apartment[] = [
  {
    id: '1',
    name: 'Apartment A',
    groesse: 50,
    miete: 800,
    status: 'frei',
    Haeuser: { name: 'House Alpha' }
  },
  {
    id: '2',
    name: 'Apartment B',
    groesse: 75,
    miete: 1200,
    status: 'vermietet',
    Haeuser: { name: 'House Beta' }
  }
]

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    telefonnummer: '123-456-7890',
    wohnung_id: '1',
    einzug: '2023-01-01',
    auszug: undefined,
    notiz: '',
    nebenkosten: [{ id: '1', amount: '100', date: '2023-01-01' }]
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    telefonnummer: '987-654-3210',
    wohnung_id: '2',
    einzug: '2022-06-01',
    auszug: '2023-12-31',
    notiz: '',
    nebenkosten: [{ id: '2', amount: '200', date: '2023-01-01' }]
  }
]

const mockWohnungen = [
  { id: '1', name: 'Apartment A' },
  { id: '2', name: 'Apartment B' }
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
  }
]

describe('Sort State Management', () => {
  describe('Direction toggling behavior', () => {
    it('should toggle sort direction when clicking same header in ApartmentTable', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
      // Initial state - ascending by default
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
      
      // First click - should toggle to descending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment B')
      expect(rows[2]).toHaveTextContent('Apartment A')
      
      // Second click - should toggle back to ascending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
    })

    it('should toggle sort direction when clicking same header in TenantTable', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nameHeader = screen.getByText('Name').closest('div')
      
      // Initial state - ascending by default
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Alice Johnson')
      expect(rows[2]).toHaveTextContent('Bob Smith')
      
      // First click - should toggle to descending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Bob Smith')
      expect(rows[2]).toHaveTextContent('Alice Johnson')
      
      // Second click - should toggle back to ascending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Alice Johnson')
      expect(rows[2]).toHaveTextContent('Bob Smith')
    })

    it('should toggle sort direction when clicking same header in FinanceTransactions', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      
      // First click - ascending
      await user.click(nameHeader!)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Maintenance Cost')
      expect(rows[2]).toHaveTextContent('Rent Payment')
      
      // Second click - descending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Rent Payment')
      expect(rows[2]).toHaveTextContent('Maintenance Cost')
    })
  })

  describe('Column switching behavior', () => {
    it('should reset to ascending when switching columns in ApartmentTable', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      
      // Click name header to sort descending
      await user.click(nameHeader!)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment B') // Descending
      
      // Click size header - should start with ascending
      await user.click(sizeHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('50 m²') // Apartment A (smallest first)
      expect(rows[2]).toHaveTextContent('75 m²') // Apartment B
    })

    it('should reset to ascending when switching columns in TenantTable', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nameHeader = screen.getByText('Name').closest('div')
      const emailHeader = screen.getByText('E-Mail').closest('div')
      
      // Click name header to sort descending
      await user.click(nameHeader!)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Bob Smith') // Descending
      
      // Click email header - should start with ascending
      await user.click(emailHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('alice@example.com') // Alice first alphabetically
      expect(rows[2]).toHaveTextContent('bob@example.com') // Bob second
    })

    it('should reset to ascending when switching columns in FinanceTransactions', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      const amountHeader = screen.getByText('Betrag').closest('div')
      
      // Click name header twice to get descending
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Rent Payment') // Descending
      
      // Click amount header - should start with ascending
      await user.click(amountHeader!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('500,00 €') // Maintenance Cost (smaller amount first)
      expect(rows[2]).toHaveTextContent('1.000,00 €') // Rent Payment
    })
  })

  describe('Sort key persistence', () => {
    it('should maintain current sort key when data changes in ApartmentTable', () => {
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // The component should maintain its sort state even when props change
      // (This is more of an implementation detail test)
      
      // Re-render with same data
      rerender(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Should still show data in the same order
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
    })

    it('should maintain current sort key when data changes in TenantTable', () => {
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Re-render with same data
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Should still show data in the same order
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Alice Johnson')
      expect(rows[2]).toHaveTextContent('Bob Smith')
    })
  })

  describe('Multiple rapid clicks handling', () => {
    it('should handle multiple rapid clicks correctly in ApartmentTable', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
      // Rapid clicks
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      
      // Should end up in ascending order (even number of clicks)
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
    })

    it('should handle multiple rapid clicks correctly in TenantTable', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nameHeader = screen.getByText('Name').closest('div')
      
      // Rapid clicks (odd number)
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      await user.click(nameHeader!)
      
      // Should end up in descending order (odd number of clicks)
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Bob Smith')
      expect(rows[2]).toHaveTextContent('Alice Johnson')
    })
  })

  describe('Sort state with empty data', () => {
    it('should maintain sort state even with empty data in ApartmentTable', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
      // Set sort to descending
      await user.click(nameHeader!)
      
      // Re-render with empty data
      rerender(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={[]}
        />
      )

      // Should show empty state
      expect(screen.getByText('Keine Wohnungen gefunden.')).toBeInTheDocument()
      
      // Re-render with data again
      rerender(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Should maintain descending sort
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment B')
      expect(rows[2]).toHaveTextContent('Apartment A')
    })

    it('should handle sort clicks on empty data gracefully', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={[]}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
      // Should not throw error when clicking on empty table
      await user.click(nameHeader!)
      
      expect(screen.getByText('Keine Wohnungen gefunden.')).toBeInTheDocument()
    })
  })

  describe('Sort state consistency across re-renders', () => {
    it('should maintain sort consistency when filter changes in ApartmentTable', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      
      // Sort by size descending
      await user.click(sizeHeader!)
      await user.click(sizeHeader!)
      
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('75 m²') // Apartment B first
      
      // Change filter but keep same apartments
      rerender(
        <ApartmentTable
          filter="free"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Should maintain descending sort within filtered results
      rows = screen.getAllByRole('row')
      // Only Apartment A is free, so it should be the only one shown
      expect(rows).toHaveLength(2) // Header + 1 free apartment
      expect(rows[1]).toHaveTextContent('50 m²') // Apartment A
    })

    it('should maintain sort consistency when search changes in TenantTable', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const emailHeader = screen.getByText('E-Mail').closest('div')
      
      // Sort by email descending
      await user.click(emailHeader!)
      await user.click(emailHeader!)
      
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('bob@example.com') // Bob first in descending
      
      // Apply search that matches both
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery="example.com"
        />
      )

      // Should maintain descending sort within search results
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('bob@example.com') // Still Bob first
      expect(rows[2]).toHaveTextContent('alice@example.com') // Alice second
    })
  })

  describe('Default sort states', () => {
    it('should start with correct default sort in ApartmentTable', () => {
      render(
        <ApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      )

      // Default should be name ascending
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
    })

    it('should start with correct default sort in TenantTable', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Default should be name ascending
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Alice Johnson')
      expect(rows[2]).toHaveTextContent('Bob Smith')
    })

    it('should start with correct default sort in FinanceTransactions', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      // Default should be date descending
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('10.02.2023') // Maintenance Cost (later date)
      expect(rows[2]).toHaveTextContent('15.01.2023') // Rent Payment (earlier date)
    })
  })
})