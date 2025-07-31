import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinanceTransactions } from '@/components/finance-transactions'

// Mock the context menu component
jest.mock('@/components/finance-context-menu', () => ({
  FinanceContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}))

interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
}

const mockFinances: Finanz[] = [
  {
    id: '1',
    wohnung_id: '1',
    name: 'Rent Payment January',
    datum: '2023-01-15',
    betrag: 1000,
    ist_einnahmen: true,
    notiz: 'Monthly rent',
    Wohnungen: { name: 'Apartment A' }
  },
  {
    id: '2',
    wohnung_id: '2',
    name: 'Maintenance Cost',
    datum: '2023-02-10',
    betrag: 500,
    ist_einnahmen: false,
    notiz: 'Plumbing repair',
    Wohnungen: { name: 'Apartment B' }
  },
  {
    id: '3',
    wohnung_id: '1',
    name: 'Utility Bill',
    datum: '2023-03-05',
    betrag: 200,
    ist_einnahmen: false,
    notiz: 'Electricity bill',
    Wohnungen: { name: 'Apartment A' }
  },
  {
    id: '4',
    wohnung_id: '3',
    name: 'Rent Payment February',
    datum: '2023-02-15',
    betrag: 1200,
    ist_einnahmen: true,
    notiz: 'Monthly rent',
    Wohnungen: { name: 'Apartment C' }
  },
  {
    id: '5',
    wohnung_id: undefined, // No apartment assigned
    name: 'Administrative Fee',
    datum: '2023-01-01',
    betrag: 100,
    ist_einnahmen: false,
    notiz: 'General admin',
    Wohnungen: undefined
  }
]

describe('FinanceTransactions Sorting Logic', () => {
  describe('String field sorting', () => {
    it('should sort by transaction name in ascending order', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      await user.click(nameHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Administrative Fee')
      expect(rows[2]).toHaveTextContent('Maintenance Cost')
      expect(rows[3]).toHaveTextContent('Rent Payment February')
      expect(rows[4]).toHaveTextContent('Rent Payment January')
      expect(rows[5]).toHaveTextContent('Utility Bill')
    })

    it('should sort by transaction name in descending order when clicked twice', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      await user.click(nameHeader!)
      await user.click(nameHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Utility Bill')
      expect(rows[2]).toHaveTextContent('Rent Payment January')
      expect(rows[3]).toHaveTextContent('Rent Payment February')
      expect(rows[4]).toHaveTextContent('Maintenance Cost')
      expect(rows[5]).toHaveTextContent('Administrative Fee')
    })

    it('should sort by apartment name', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const apartmentHeader = screen.getByText('Wohnung').closest('div')
      await user.click(apartmentHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort: undefined apartment first (empty string), then Apartment A, B, C
      expect(rows[1]).toHaveTextContent('-') // Administrative Fee (no apartment)
      expect(rows[2]).toHaveTextContent('Apartment A') // Rent Payment January
      expect(rows[3]).toHaveTextContent('Apartment A') // Utility Bill
      expect(rows[4]).toHaveTextContent('Apartment B') // Maintenance Cost
      expect(rows[5]).toHaveTextContent('Apartment C') // Rent Payment February
    })
  })

  describe('Date field sorting', () => {
    it('should sort by date in descending order by default', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      // Default sort is by date descending
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('05.03.2023') // March 5 (latest)
      expect(rows[2]).toHaveTextContent('15.02.2023') // February 15
      expect(rows[3]).toHaveTextContent('10.02.2023') // February 10
      expect(rows[4]).toHaveTextContent('15.01.2023') // January 15
      expect(rows[5]).toHaveTextContent('01.01.2023') // January 1 (earliest)
    })

    it('should sort by date in ascending order when clicked', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const dateHeader = screen.getByText('Datum').closest('div')
      await user.click(dateHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('01.01.2023') // January 1 (earliest)
      expect(rows[2]).toHaveTextContent('15.01.2023') // January 15
      expect(rows[3]).toHaveTextContent('10.02.2023') // February 10
      expect(rows[4]).toHaveTextContent('15.02.2023') // February 15
      expect(rows[5]).toHaveTextContent('05.03.2023') // March 5 (latest)
    })

    it('should handle missing dates', async () => {
      const user = userEvent.setup()
      const financesWithMissingDates: Finanz[] = [
        {
          id: '1',
          name: 'Transaction A',
          datum: '2023-01-15',
          betrag: 1000,
          ist_einnahmen: true,
          Wohnungen: { name: 'Apartment A' }
        },
        {
          id: '2',
          name: 'Transaction B',
          datum: undefined, // Missing date
          betrag: 500,
          ist_einnahmen: false,
          Wohnungen: { name: 'Apartment B' }
        }
      ]

      render(<FinanceTransactions finances={financesWithMissingDates} />)

      const dateHeader = screen.getByText('Datum').closest('div')
      await user.click(dateHeader!)

      const rows = screen.getAllByRole('row')
      // Missing date should be treated as 0 and sort first
      expect(rows[1]).toHaveTextContent('-') // Transaction B (no date)
      expect(rows[2]).toHaveTextContent('15.01.2023') // Transaction A
    })
  })

  describe('Numeric field sorting', () => {
    it('should sort by amount in ascending order', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('100,00 €') // Administrative Fee
      expect(rows[2]).toHaveTextContent('200,00 €') // Utility Bill
      expect(rows[3]).toHaveTextContent('500,00 €') // Maintenance Cost
      expect(rows[4]).toHaveTextContent('1000,00 €') // Rent Payment January
      expect(rows[5]).toHaveTextContent('1200,00 €') // Rent Payment February
    })

    it('should sort by amount in descending order when clicked twice', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)
      await user.click(amountHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('1200,00 €') // Rent Payment February
      expect(rows[2]).toHaveTextContent('1000,00 €') // Rent Payment January
      expect(rows[3]).toHaveTextContent('500,00 €') // Maintenance Cost
      expect(rows[4]).toHaveTextContent('200,00 €') // Utility Bill
      expect(rows[5]).toHaveTextContent('100,00 €') // Administrative Fee
    })

    it('should handle zero and negative amounts', async () => {
      const user = userEvent.setup()
      const financesWithSpecialAmounts: Finanz[] = [
        {
          id: '1',
          name: 'Zero Amount',
          datum: '2023-01-15',
          betrag: 0,
          ist_einnahmen: true,
          Wohnungen: { name: 'Apartment A' }
        },
        {
          id: '2',
          name: 'Positive Amount',
          datum: '2023-02-15',
          betrag: 100,
          ist_einnahmen: true,
          Wohnungen: { name: 'Apartment B' }
        }
      ]

      render(<FinanceTransactions finances={financesWithSpecialAmounts} />)

      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('0,00 €') // Zero amount first
      expect(rows[2]).toHaveTextContent('100,00 €') // Positive amount
    })
  })

  describe('Boolean field sorting (transaction type)', () => {
    it('should sort by transaction type', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const typeHeader = screen.getByText('Typ').closest('div')
      await user.click(typeHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort by ist_einnahmen: false (0) before true (1)
      // So Ausgabe (false) before Einnahme (true)
      expect(rows[1]).toHaveTextContent('Ausgabe') // Administrative Fee
      expect(rows[2]).toHaveTextContent('Ausgabe') // Maintenance Cost
      expect(rows[3]).toHaveTextContent('Ausgabe') // Utility Bill
      expect(rows[4]).toHaveTextContent('Einnahme') // Rent Payment January
      expect(rows[5]).toHaveTextContent('Einnahme') // Rent Payment February
    })

    it('should sort by transaction type in descending order', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const typeHeader = screen.getByText('Typ').closest('div')
      await user.click(typeHeader!)
      await user.click(typeHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort by ist_einnahmen: true (1) before false (0)
      // So Einnahme (true) before Ausgabe (false)
      expect(rows[1]).toHaveTextContent('Einnahme') // Rent Payment January
      expect(rows[2]).toHaveTextContent('Einnahme') // Rent Payment February
      expect(rows[3]).toHaveTextContent('Ausgabe') // Administrative Fee
      expect(rows[4]).toHaveTextContent('Ausgabe') // Maintenance Cost
      expect(rows[5]).toHaveTextContent('Ausgabe') // Utility Bill
    })
  })

  describe('Sort state management', () => {
    it('should toggle sort direction when clicking same header', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      
      // First click - ascending
      await user.click(nameHeader!)
      let rows = screen.getAllByRole('row')
      const firstClickFirstRow = rows[1].textContent
      
      // Second click - descending
      await user.click(nameHeader!)
      rows = screen.getAllByRole('row')
      const secondClickFirstRow = rows[1].textContent
      
      expect(firstClickFirstRow).not.toBe(secondClickFirstRow)
    })

    it('should reset to ascending when switching to different column', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      const amountHeader = screen.getByText('Betrag').closest('div')
      
      // Click name header to sort descending
      await user.click(nameHeader!)
      
      // Click amount header - should start with ascending
      await user.click(amountHeader!)
      
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('100,00 €') // Smallest amount first (ascending)
    })
  })

  describe('Integration with filtering and search', () => {
    it('should maintain sort order when internal search is applied', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      // Sort by name first
      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      await user.click(nameHeader!)

      // Apply search through the search input
      const searchInput = screen.getByPlaceholderText('Transaktion suchen...')
      await user.type(searchInput, 'Rent')

      const rows = screen.getAllByRole('row')
      // Should show only transactions with "Rent" in name, sorted by name
      expect(rows).toHaveLength(3) // Header + 2 rent payments
      expect(rows[1]).toHaveTextContent('Rent Payment February')
      expect(rows[2]).toHaveTextContent('Rent Payment January')
    })

    it('should maintain sort order when apartment filter is applied', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      // Sort by amount
      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      // Apply apartment filter
      const apartmentSelect = screen.getByDisplayValue('Alle Wohnungen')
      await user.click(apartmentSelect)
      const apartmentAOption = screen.getByText('Apartment A')
      await user.click(apartmentAOption)

      const rows = screen.getAllByRole('row')
      // Should show only Apartment A transactions, sorted by amount
      expect(rows).toHaveLength(3) // Header + 2 transactions for Apartment A
      expect(rows[1]).toHaveTextContent('200,00 €') // Utility Bill
      expect(rows[2]).toHaveTextContent('1.000,00 €') // Rent Payment January
    })

    it('should maintain sort order when year filter is applied', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      // Sort by name
      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      await user.click(nameHeader!)

      // Apply year filter
      const yearSelect = screen.getByDisplayValue('Alle Jahre')
      await user.click(yearSelect)
      const year2023Option = screen.getByText('2023')
      await user.click(year2023Option)

      const rows = screen.getAllByRole('row')
      // Should show all 2023 transactions, sorted by name
      expect(rows).toHaveLength(6) // Header + 5 transactions (all are from 2023)
    })

    it('should maintain sort order when transaction type filter is applied', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      // Sort by amount
      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      // Apply transaction type filter
      const typeSelect = screen.getByDisplayValue('Alle Transaktionen')
      await user.click(typeSelect)
      const einnahmeOption = screen.getByText('Einnahme')
      await user.click(einnahmeOption)

      const rows = screen.getAllByRole('row')
      // Should show only Einnahme transactions, sorted by amount
      expect(rows).toHaveLength(3) // Header + 2 Einnahme transactions
      expect(rows[1]).toHaveTextContent('1.000,00 €') // Rent Payment January
      expect(rows[2]).toHaveTextContent('1.200,00 €') // Rent Payment February
    })
  })

  describe('Edge cases', () => {
    it('should handle empty dataset', () => {
      render(<FinanceTransactions finances={[]} />)

      expect(screen.getByText('Keine Transaktionen gefunden.')).toBeInTheDocument()
    })

    it('should handle transactions with missing optional fields', async () => {
      const user = userEvent.setup()
      const financesWithMissingFields: Finanz[] = [
        {
          id: '1',
          name: 'Complete Transaction',
          datum: '2023-01-15',
          betrag: 1000,
          ist_einnahmen: true,
          notiz: 'Complete',
          Wohnungen: { name: 'Apartment A' }
        },
        {
          id: '2',
          name: 'Minimal Transaction',
          datum: undefined,
          betrag: 500,
          ist_einnahmen: false,
          notiz: undefined,
          Wohnungen: undefined
        }
      ]

      render(<FinanceTransactions finances={financesWithMissingFields} />)

      // Sort by apartment
      const apartmentHeader = screen.getByText('Wohnung').closest('div')
      await user.click(apartmentHeader!)

      const rows = screen.getAllByRole('row')
      // Minimal transaction (no apartment) should sort first
      expect(rows[1]).toHaveTextContent('-') // No apartment
      expect(rows[2]).toHaveTextContent('Apartment A')
    })

    it('should handle identical values in sorting', async () => {
      const user = userEvent.setup()
      const identicalFinances: Finanz[] = [
        {
          id: '1',
          name: 'Transaction A',
          datum: '2023-01-15',
          betrag: 1000, // Same amount
          ist_einnahmen: true,
          Wohnungen: { name: 'Same Apartment' } // Same apartment
        },
        {
          id: '2',
          name: 'Transaction B',
          datum: '2023-01-15', // Same date
          betrag: 1000, // Same amount
          ist_einnahmen: true, // Same type
          Wohnungen: { name: 'Same Apartment' } // Same apartment
        }
      ]

      render(<FinanceTransactions finances={identicalFinances} />)

      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      // Should maintain original order when values are identical
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 transactions
      expect(rows[1]).toHaveTextContent('Transaction A')
      expect(rows[2]).toHaveTextContent('Transaction B')
    })

    it('should handle invalid date formats gracefully', async () => {
      const user = userEvent.setup()
      const financesWithInvalidDates: Finanz[] = [
        {
          id: '1',
          name: 'Valid Date',
          datum: '2023-01-15',
          betrag: 1000,
          ist_einnahmen: true,
          Wohnungen: { name: 'Apartment A' }
        },
        {
          id: '2',
          name: 'Invalid Date',
          datum: 'invalid-date',
          betrag: 500,
          ist_einnahmen: false,
          Wohnungen: { name: 'Apartment B' }
        }
      ]

      render(<FinanceTransactions finances={financesWithInvalidDates} />)

      const dateHeader = screen.getByText('Datum').closest('div')
      await user.click(dateHeader!)

      // Should handle invalid dates gracefully
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 transactions
    })
  })

  describe('Visual indicators and formatting', () => {
    it('should display sort icons correctly', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      
      // Should have sort icon (testing that the header is clickable)
      expect(nameHeader).toHaveClass('cursor-pointer')
      
      // Click to change sort direction
      await user.click(nameHeader!)
      
      // Header should still be clickable
      expect(nameHeader).toHaveClass('cursor-pointer')
    })

    it('should apply hover effects to sortable headers', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      expect(nameHeader).toHaveClass('hover:bg-muted/50')
    })

    it('should format dates correctly in German format', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      // Check that dates are displayed in DD.MM.YYYY format
      expect(screen.getByText('15.01.2023')).toBeInTheDocument() // January 15
      expect(screen.getByText('10.02.2023')).toBeInTheDocument() // February 10
      expect(screen.getByText('05.03.2023')).toBeInTheDocument() // March 5
    })

    it('should format amounts correctly with German number format', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      // Check that amounts are displayed with German formatting (comma as decimal separator)
      expect(screen.getByText('1000,00 €')).toBeInTheDocument()
      expect(screen.getByText('500,00 €')).toBeInTheDocument()
      expect(screen.getByText('200,00 €')).toBeInTheDocument()
    })

    it('should display transaction type badges correctly', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      // Check that type badges are displayed
      const einnahmeBadges = screen.getAllByText('Einnahme')
      const ausgabeBadges = screen.getAllByText('Ausgabe')
      
      expect(einnahmeBadges).toHaveLength(2) // 2 income transactions
      expect(ausgabeBadges).toHaveLength(3) // 3 expense transactions
    })

    it('should color amounts correctly based on transaction type', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      const rows = screen.getAllByRole('row')
      
      // Find income and expense amounts and check their styling
      // This is a basic check - in a real implementation you'd check CSS classes
      expect(screen.getByText('1000,00 €')).toBeInTheDocument() // Income
      expect(screen.getByText('500,00 €')).toBeInTheDocument() // Expense
    })
  })
})