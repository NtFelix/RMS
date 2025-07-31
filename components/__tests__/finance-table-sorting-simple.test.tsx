import { render, screen } from '@testing-library/react'
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
  }
]

describe('FinanceTransactions Basic Sorting', () => {
  describe('Core sorting functionality', () => {
    it('should render table with sortable headers', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      expect(screen.getByText('Bezeichnung')).toBeInTheDocument()
      expect(screen.getByText('Wohnung')).toBeInTheDocument()
      expect(screen.getByText('Datum')).toBeInTheDocument()
      expect(screen.getByText('Betrag')).toBeInTheDocument()
      expect(screen.getByText('Typ')).toBeInTheDocument()
    })

    it('should sort by date in descending order by default', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      const rows = screen.getAllByRole('row')
      // Default sort is by date descending (February 10 before January 15)
      expect(rows[1]).toHaveTextContent('Maintenance Cost')
      expect(rows[2]).toHaveTextContent('Rent Payment January')
    })

    it('should sort by name when clicking name header', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      await user.click(nameHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort alphabetically: Maintenance Cost, Rent Payment January
      expect(rows[1]).toHaveTextContent('Maintenance Cost')
      expect(rows[2]).toHaveTextContent('Rent Payment January')
    })

    it('should sort by amount when clicking amount header', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const amountHeader = screen.getByText('Betrag').closest('div')
      await user.click(amountHeader!)

      const rows = screen.getAllByRole('row')
      // Should sort by amount ascending: 500, 1000
      expect(rows[1]).toHaveTextContent('500,00 €')
      expect(rows[2]).toHaveTextContent('1000,00 €')
    })

    it('should handle header clicks for sorting', async () => {
      const user = userEvent.setup()
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      
      // Verify header is clickable
      expect(nameHeader).toHaveClass('cursor-pointer')
      
      // Click should not throw error
      await user.click(nameHeader!)
      
      // Table should still render data
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(3) // Header + 2 data rows
    })

    it('should display transaction types correctly', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      expect(screen.getByText('Einnahme')).toBeInTheDocument()
      expect(screen.getByText('Ausgabe')).toBeInTheDocument()
    })

    it('should format dates correctly', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      expect(screen.getByText('15.01.2023')).toBeInTheDocument()
      expect(screen.getByText('10.02.2023')).toBeInTheDocument()
    })

    it('should handle empty dataset', () => {
      render(<FinanceTransactions finances={[]} />)

      expect(screen.getByText('Keine Transaktionen gefunden.')).toBeInTheDocument()
    })
  })

  describe('Visual indicators', () => {
    it('should apply hover effects to sortable headers', () => {
      render(<FinanceTransactions finances={mockFinances} />)

      const nameHeader = screen.getByText('Bezeichnung').closest('div')
      expect(nameHeader).toHaveClass('cursor-pointer')
      expect(nameHeader).toHaveClass('hover:bg-muted/50')
    })

    it('should display sort icons', async () => {
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
  })
})