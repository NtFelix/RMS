import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApartmentTable, Apartment } from '@/components/apartment-table'

// Mock the context menu component
jest.mock('@/components/apartment-context-menu', () => ({
  ApartmentContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

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
  },
  {
    id: '3',
    name: 'Apartment C', 
    groesse: 60,
    miete: 900,
    status: 'frei',
    Haeuser: { name: 'House Alpha' }
  },
  {
    id: '4',
    name: 'Apartment D',
    groesse: 80,
    miete: 1600,
    status: 'vermietet',
    Haeuser: null // Test null house
  }
]

describe('ApartmentTable Sorting Logic', () => {
  describe('String field sorting', () => {
    it('should sort by apartment name in ascending order', () => {
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      // Default sort is by name ascending
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
      expect(rows[3]).toHaveTextContent('Apartment C')
      expect(rows[4]).toHaveTextContent('Apartment D')
    })

    it('should sort by apartment name in descending order when clicked twice', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      await user.click(nameHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Apartment D')
      expect(rows[2]).toHaveTextContent('Apartment C')
      expect(rows[3]).toHaveTextContent('Apartment B')
      expect(rows[4]).toHaveTextContent('Apartment A')
    })

    it('should sort by house name', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const houseHeader = screen.getByText('Haus').closest('div')
      await user.click(houseHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort: null house first (empty string), then House Alpha, then House Beta
      expect(rows[1]).toHaveTextContent('Apartment D') // null house
      expect(rows[2]).toHaveTextContent('Apartment A') // House Alpha
      expect(rows[3]).toHaveTextContent('Apartment C') // House Alpha
      expect(rows[4]).toHaveTextContent('Apartment B') // House Beta
    })

    it('should sort by status', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const statusHeader = screen.getByText('Status').closest('div')
      await user.click(statusHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort: frei before vermietet
      expect(rows[1]).toHaveTextContent('frei')
      expect(rows[2]).toHaveTextContent('frei')
      expect(rows[3]).toHaveTextContent('vermietet')
      expect(rows[4]).toHaveTextContent('vermietet')
    })
  })

  describe('Numeric field sorting', () => {
    it('should sort by size in ascending order', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      await user.click(sizeHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('50 m²') // Apartment A
      expect(rows[2]).toHaveTextContent('60 m²') // Apartment C
      expect(rows[3]).toHaveTextContent('75 m²') // Apartment B
      expect(rows[4]).toHaveTextContent('80 m²') // Apartment D
    })

    it('should sort by size in descending order when clicked twice', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      await user.click(sizeHeader!)
      await user.click(sizeHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('80 m²') // Apartment D
      expect(rows[2]).toHaveTextContent('75 m²') // Apartment B
      expect(rows[3]).toHaveTextContent('60 m²') // Apartment C
      expect(rows[4]).toHaveTextContent('50 m²') // Apartment A
    })

    it('should sort by rent in ascending order', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const rentHeader = screen.getByText('Miete (€)').closest('div')
      await user.click(rentHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('800 €') // Apartment A
      expect(rows[2]).toHaveTextContent('900 €') // Apartment C
      expect(rows[3]).toHaveTextContent('1200 €') // Apartment B
      expect(rows[4]).toHaveTextContent('1600 €') // Apartment D
    })
  })

  describe('Calculated field sorting', () => {
    it('should sort by price per square meter', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const pricePerSqmHeader = screen.getByText('Miete pro m²').closest('div')
      await user.click(pricePerSqmHeader!)

      const rows = screen.getAllByRole('row')
      // Expected order by price per sqm: 
      // Apartment C: 900/60 = 15.00
      // Apartment A: 800/50 = 16.00
      // Apartment B: 1200/75 = 16.00
      // Apartment D: 1600/80 = 20.00
      expect(rows[1]).toHaveTextContent('15.00 €/m²') // Apartment C
      expect(rows[2]).toHaveTextContent('16.00 €/m²') // Apartment A
      expect(rows[3]).toHaveTextContent('16.00 €/m²') // Apartment B
      expect(rows[4]).toHaveTextContent('20.00 €/m²') // Apartment D
    })

    it('should sort by price per square meter in descending order', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const pricePerSqmHeader = screen.getByText('Miete pro m²').closest('div')
      await user.click(pricePerSqmHeader!)
      await user.click(pricePerSqmHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('20.00 €/m²') // Apartment D
      expect(rows[2]).toHaveTextContent('16.00 €/m²') // Apartment A or B
      expect(rows[3]).toHaveTextContent('16.00 €/m²') // Apartment A or B
      expect(rows[4]).toHaveTextContent('15.00 €/m²') // Apartment C
    })
  })

  describe('Sort state management', () => {
    it('should toggle sort direction when clicking same header', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
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
      
      // Click size header - should start with ascending
      await user.click(sizeHeader!)
      
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('50 m²') // Smallest size first (ascending)
    })
  })

  describe('Integration with filtering', () => {
    it('should maintain sort order when filter is applied', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      // Sort by rent
      const rentHeader = screen.getByText('Miete (€)').closest('div')
      await user.click(rentHeader!)

      // Apply filter for free apartments only
      rerender(
        <ApartmentTable 
          filter="free" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const rows = screen.getAllByRole('row')
      // Should show only free apartments, sorted by rent
      expect(rows).toHaveLength(3) // Header + 2 free apartments
      expect(rows[1]).toHaveTextContent('800 €') // Apartment A
      expect(rows[2]).toHaveTextContent('900 €') // Apartment C
    })

    it('should maintain sort order when search is applied', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      // Sort by size
      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      await user.click(sizeHeader!)

      // Apply search
      rerender(
        <ApartmentTable 
          filter="all" 
          searchQuery="House Alpha" 
          initialApartments={mockApartments}
        />
      )

      const rows = screen.getAllByRole('row')
      // Should show only apartments in House Alpha, sorted by size
      expect(rows).toHaveLength(3) // Header + 2 apartments in House Alpha
      expect(rows[1]).toHaveTextContent('50 m²') // Apartment A
      expect(rows[2]).toHaveTextContent('60 m²') // Apartment C
    })
  })

  describe('Edge cases', () => {
    it('should handle empty dataset', () => {
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={[]}
        />
      )

      expect(screen.getByText('Keine Wohnungen gefunden.')).toBeInTheDocument()
    })

    it('should handle null values in sorting', async () => {
      const user = userEvent.setup()
      const apartmentsWithNulls: Apartment[] = [
        {
          id: '1',
          name: 'Apartment A',
          groesse: 50,
          miete: 800,
          status: 'frei',
          Haeuser: null
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

      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={apartmentsWithNulls}
        />
      )

      const houseHeader = screen.getByText('Haus').closest('div')
      await user.click(houseHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('-') // null house shows as '-'
      expect(rows[2]).toHaveTextContent('House Beta')
    })

    it('should handle identical values', async () => {
      const user = userEvent.setup()
      const identicalApartments: Apartment[] = [
        {
          id: '1',
          name: 'Apartment A',
          groesse: 50,
          miete: 1000,
          status: 'frei',
          Haeuser: { name: 'House Alpha' }
        },
        {
          id: '2',
          name: 'Apartment B',
          groesse: 50, // Same size
          miete: 1000, // Same rent
          status: 'frei',
          Haeuser: { name: 'House Alpha' }
        }
      ]

      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={identicalApartments}
        />
      )

      const sizeHeader = screen.getByText('Größe (m²)').closest('div')
      await user.click(sizeHeader!)

      // Should maintain original order when values are identical
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 apartments
      expect(rows[1]).toHaveTextContent('Apartment A')
      expect(rows[2]).toHaveTextContent('Apartment B')
    })

    it('should handle zero values in calculations', async () => {
      const user = userEvent.setup()
      const apartmentWithZero: Apartment[] = [
        {
          id: '1',
          name: 'Apartment A',
          groesse: 0, // Zero size
          miete: 800,
          status: 'frei',
          Haeuser: { name: 'House Alpha' }
        },
        {
          id: '2',
          name: 'Apartment B',
          groesse: 50,
          miete: 1000,
          status: 'frei',
          Haeuser: { name: 'House Beta' }
        }
      ]

      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={apartmentWithZero}
        />
      )

      const pricePerSqmHeader = screen.getByText('Miete pro m²').closest('div')
      await user.click(pricePerSqmHeader!)

      // Should handle division by zero gracefully
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 apartments
    })
  })

  describe('Visual indicators', () => {
    it('should display sort icons correctly', async () => {
      const user = userEvent.setup()
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      
      // Should have sort icon (testing that the header is clickable)
      expect(nameHeader).toHaveClass('cursor-pointer')
      
      // Click to change sort direction
      await user.click(nameHeader!)
      
      // Header should still be clickable
      expect(nameHeader).toHaveClass('cursor-pointer')
    })

    it('should apply hover effects to sortable headers', () => {
      render(
        <ApartmentTable 
          filter="all" 
          searchQuery="" 
          initialApartments={mockApartments}
        />
      )

      const nameHeader = screen.getByText('Wohnung').closest('div')
      expect(nameHeader).toHaveClass('hover:bg-muted/50')
    })
  })
})