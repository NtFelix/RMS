import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenantTable } from '@/components/tenant-table'
import { Tenant } from '@/types/Tenant'

// Mock the context menu component
jest.mock('@/components/tenant-context-menu', () => ({
  TenantContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn()
  })
}))

const mockWohnungen = [
  { id: '1', name: 'Apartment A' },
  { id: '2', name: 'Apartment B' },
  { id: '3', name: 'Apartment C' }
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
    nebenkosten: [
      { id: '1', amount: '100', date: '2023-01-01' },
      { id: '2', amount: '50', date: '2023-02-01' }
    ]
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
    nebenkosten: [
      { id: '3', amount: '200', date: '2023-01-01' }
    ]
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    telefonnummer: '555-123-4567',
    wohnung_id: '3',
    einzug: '2023-03-01',
    auszug: undefined,
    notiz: '',
    nebenkosten: []
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    telefonnummer: '111-222-3333',
    wohnung_id: undefined, // No apartment assigned
    einzug: '2023-05-01',
    auszug: undefined,
    notiz: '',
    nebenkosten: [
      { id: '4', amount: '75', date: '2023-01-01' },
      { id: '5', amount: '25', date: '2023-02-01' },
      { id: '6', amount: '50', date: '2023-03-01' }
    ]
  }
]

describe('TenantTable Sorting Logic', () => {
  describe('String field sorting', () => {
    it('should sort by tenant name in ascending order by default', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Alice Johnson')
      expect(rows[2]).toHaveTextContent('Bob Smith')
      expect(rows[3]).toHaveTextContent('Charlie Brown')
      expect(rows[4]).toHaveTextContent('Diana Prince')
    })

    it('should sort by tenant name in descending order when clicked', async () => {
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
      await user.click(nameHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Diana Prince')
      expect(rows[2]).toHaveTextContent('Charlie Brown')
      expect(rows[3]).toHaveTextContent('Bob Smith')
      expect(rows[4]).toHaveTextContent('Alice Johnson')
    })

    it('should sort by email address', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const emailHeader = screen.getByText('E-Mail').closest('div')
      await user.click(emailHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('alice@example.com')
      expect(rows[2]).toHaveTextContent('bob@example.com')
      expect(rows[3]).toHaveTextContent('charlie@example.com')
      expect(rows[4]).toHaveTextContent('diana@example.com')
    })

    it('should sort by phone number', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const phoneHeader = screen.getByText('Telefon').closest('div')
      await user.click(phoneHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('111-222-3333') // Diana
      expect(rows[2]).toHaveTextContent('123-456-7890') // Alice
      expect(rows[3]).toHaveTextContent('555-123-4567') // Charlie
      expect(rows[4]).toHaveTextContent('987-654-3210') // Bob
    })

    it('should sort by apartment name', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const apartmentHeader = screen.getByText('Wohnung').closest('div')
      await user.click(apartmentHeader!)

      const rows = screen.getAllByRole('row')
      // Diana has no apartment (should show '-' and sort first)
      expect(rows[1]).toHaveTextContent('-') // Diana
      expect(rows[2]).toHaveTextContent('Apartment A') // Alice
      expect(rows[3]).toHaveTextContent('Apartment B') // Bob
      expect(rows[4]).toHaveTextContent('Apartment C') // Charlie
    })
  })

  describe('Nebenkosten calculation and sorting', () => {
    it('should sort by nebenkosten total amount', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nebenkostenHeader = screen.getByText('Nebenkosten').closest('div')
      await user.click(nebenkostenHeader!)

      const rows = screen.getAllByRole('row')
      // Expected order by total nebenkosten:
      // Charlie: 0 (no nebenkosten)
      // Alice: 150 (100 + 50)
      // Diana: 150 (75 + 25 + 50)
      // Bob: 200
      expect(rows[1]).toHaveTextContent('Charlie Brown') // 0
      // Alice and Diana both have 150, so order depends on stable sort
      expect(rows[4]).toHaveTextContent('Bob Smith') // 200
    })

    it('should handle tenants with no nebenkosten', async () => {
      const user = userEvent.setup()
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nebenkostenHeader = screen.getByText('Nebenkosten').closest('div')
      await user.click(nebenkostenHeader!)

      const rows = screen.getAllByRole('row')
      // Charlie has no nebenkosten, should show '-' and sort first (0 value)
      expect(rows[1]).toHaveTextContent('Charlie Brown')
      expect(rows[1]).toHaveTextContent('-')
    })

    it('should display nebenkosten correctly in table', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Alice has 2 nebenkosten entries
      expect(screen.getByText('100 €, 50 €')).toBeInTheDocument()
      
      // Bob has 1 nebenkosten entry
      expect(screen.getByText('200 €')).toBeInTheDocument()
      
      // Charlie has no nebenkosten
      const charlieRow = screen.getByText('Charlie Brown').closest('tr')
      expect(charlieRow).toHaveTextContent('-')
      
      // Diana has 3 nebenkosten entries (should show first 3)
      expect(screen.getByText('75 €, 25 €, 50 €')).toBeInTheDocument()
    })
  })

  describe('Sort state management', () => {
    it('should toggle sort direction when clicking same header', async () => {
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
      
      // Initial state (ascending by default)
      let rows = screen.getAllByRole('row')
      const initialFirstRow = rows[1].textContent
      
      // First click - should toggle to descending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      const afterFirstClick = rows[1].textContent
      
      // Second click - should toggle back to ascending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      const afterSecondClick = rows[1].textContent
      
      expect(initialFirstRow).not.toBe(afterFirstClick)
      expect(initialFirstRow).toBe(afterSecondClick)
    })

    it('should reset to ascending when switching to different column', async () => {
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
      
      // Click email header - should start with ascending
      await user.click(emailHeader!)
      
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('alice@example.com') // First alphabetically
    })
  })

  describe('Integration with filtering', () => {
    it('should maintain sort order when current tenant filter is applied', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Sort by email
      const emailHeader = screen.getByText('E-Mail').closest('div')
      await user.click(emailHeader!)

      // Apply current tenant filter (no auszug)
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="current"
          searchQuery=""
        />
      )

      const rows = screen.getAllByRole('row')
      // Should show only current tenants (Alice, Charlie, Diana), sorted by email
      expect(rows).toHaveLength(4) // Header + 3 current tenants
      expect(rows[1]).toHaveTextContent('alice@example.com') // Alice
      expect(rows[2]).toHaveTextContent('charlie@example.com') // Charlie
      expect(rows[3]).toHaveTextContent('diana@example.com') // Diana
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument() // Has auszug
    })

    it('should maintain sort order when previous tenant filter is applied', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Sort by name
      const nameHeader = screen.getByText('Name').closest('div')
      await user.click(nameHeader!)

      // Apply previous tenant filter (has auszug)
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="previous"
          searchQuery=""
        />
      )

      const rows = screen.getAllByRole('row')
      // Should show only previous tenants (Bob), sorted by name
      expect(rows).toHaveLength(2) // Header + 1 previous tenant
      expect(rows[1]).toHaveTextContent('Bob Smith')
    })

    it('should maintain sort order when search is applied', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Sort by name descending
      const nameHeader = screen.getByText('Name').closest('div')
      await user.click(nameHeader!)

      // Apply search for names containing "o"
      rerender(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery="o"
        />
      )

      const rows = screen.getAllByRole('row')
      // Should show tenants with "o" in name (Bob, Charlie Brown), sorted by name descending
      expect(rows).toHaveLength(3) // Header + 2 matching tenants
      expect(rows[1]).toHaveTextContent('Charlie Brown') // C comes after B in descending
      expect(rows[2]).toHaveTextContent('Bob Smith')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty dataset', () => {
      render(
        <TenantTable
          tenants={[]}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      expect(screen.getByText('Keine Mieter gefunden.')).toBeInTheDocument()
    })

    it('should handle tenants with missing optional fields', async () => {
      const user = userEvent.setup()
      const tenantsWithMissingFields: Tenant[] = [
        {
          id: '1',
          name: 'John Doe',
          email: undefined,
          telefonnummer: undefined,
          wohnung_id: undefined,
          einzug: '2023-01-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: undefined
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          telefonnummer: '123-456-7890',
          wohnung_id: '1',
          einzug: '2023-02-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: []
        }
      ]

      render(
        <TenantTable
          tenants={tenantsWithMissingFields}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      // Sort by email
      const emailHeader = screen.getByText('E-Mail').closest('div')
      await user.click(emailHeader!)

      const rows = screen.getAllByRole('row')
      // John has no email (should sort first as empty string)
      expect(rows[1]).toHaveTextContent('John Doe')
      expect(rows[2]).toHaveTextContent('Jane Smith')
    })

    it('should handle identical values in sorting', async () => {
      const user = userEvent.setup()
      const identicalTenants: Tenant[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'same@example.com',
          telefonnummer: '123-456-7890',
          wohnung_id: '1',
          einzug: '2023-01-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: [{ id: '1', amount: '100', date: '2023-01-01' }]
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'same@example.com', // Same email
          telefonnummer: '123-456-7890', // Same phone
          wohnung_id: '1',
          einzug: '2023-02-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: [{ id: '2', amount: '100', date: '2023-01-01' }] // Same total
        }
      ]

      render(
        <TenantTable
          tenants={identicalTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const emailHeader = screen.getByText('E-Mail').closest('div')
      await user.click(emailHeader!)

      // Should maintain original order when values are identical
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 tenants
      expect(rows[1]).toHaveTextContent('John Doe')
      expect(rows[2]).toHaveTextContent('Jane Smith')
    })

    it('should handle invalid nebenkosten amounts', async () => {
      const user = userEvent.setup()
      const tenantsWithInvalidNebenkosten: Tenant[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          telefonnummer: '123-456-7890',
          wohnung_id: '1',
          einzug: '2023-01-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: [
            { id: '1', amount: 'invalid', date: '2023-01-01' }, // Invalid amount
            { id: '2', amount: '50', date: '2023-02-01' }
          ]
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          telefonnummer: '987-654-3210',
          wohnung_id: '2',
          einzug: '2023-02-01',
          auszug: undefined,
          notiz: '',
          nebenkosten: [
            { id: '3', amount: '100', date: '2023-01-01' }
          ]
        }
      ]

      render(
        <TenantTable
          tenants={tenantsWithInvalidNebenkosten}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nebenkostenHeader = screen.getByText('Nebenkosten').closest('div')
      await user.click(nebenkostenHeader!)

      // Should handle invalid amounts gracefully (parseFloat('invalid') = NaN, treated as 0)
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 tenants
    })
  })

  describe('Visual indicators', () => {
    it('should display sort icons correctly', async () => {
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
      
      // Should have sort icon (testing that the header is clickable)
      expect(nameHeader).toHaveClass('cursor-pointer')
      
      // Click to change sort direction
      await user.click(nameHeader!)
      
      // Header should still be clickable
      expect(nameHeader).toHaveClass('cursor-pointer')
    })

    it('should apply hover effects to sortable headers', () => {
      render(
        <TenantTable
          tenants={mockTenants}
          wohnungen={mockWohnungen}
          filter="all"
          searchQuery=""
        />
      )

      const nameHeader = screen.getByText('Name').closest('div')
      expect(nameHeader).toHaveClass('hover:bg-muted/50')
    })
  })
})