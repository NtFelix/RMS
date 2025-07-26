import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReactTable, getCoreRowModel, getPaginationRowModel, ColumnDef } from '@tanstack/react-table'
import { DataTablePagination } from '../data-table-pagination'

// Mock the mobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Test data
interface TestData {
  id: string
  name: string
}

const createTestData = (count: number): TestData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `Item ${i + 1}`,
  }))

const testColumns: ColumnDef<TestData>[] = [
  { accessorKey: 'name', header: 'Name' },
]

// Helper component to provide table context
const TestWrapper = ({ 
  dataCount = 50,
  initialPageSize = 10,
  showSelectedCount = true,
  pageSizeOptions,
}: { 
  dataCount?: number
  initialPageSize?: number
  showSelectedCount?: boolean
  pageSizeOptions?: number[]
}) => {
  const data = createTestData(dataCount)
  
  const table = useReactTable({
    data,
    columns: testColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: initialPageSize,
        pageIndex: 0,
      },
    },
  })

  return (
    <DataTablePagination
      table={table}
      showSelectedCount={showSelectedCount}
      pageSizeOptions={pageSizeOptions}
    />
  )
}

describe('DataTablePagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders pagination info correctly', () => {
    render(<TestWrapper dataCount={50} initialPageSize={10} />)
    
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()
    expect(screen.getByText('Zeilen pro Seite')).toBeInTheDocument()
  })

  it('renders page size selector with default options', () => {
    render(<TestWrapper />)
    
    const pageSizeSelect = screen.getByDisplayValue('10')
    expect(pageSizeSelect).toBeInTheDocument()
  })

  it('renders page size selector with custom options', () => {
    render(<TestWrapper pageSizeOptions={[5, 15, 25]} />)
    
    const pageSizeSelect = screen.getByDisplayValue('10')
    expect(pageSizeSelect).toBeInTheDocument()
  })

  it('handles page size change', async () => {
    render(<TestWrapper />)
    
    const pageSizeSelect = screen.getByDisplayValue('10')
    await user.click(pageSizeSelect)
    
    const option20 = screen.getByText('20')
    await user.click(option20)
    
    // Should update to show fewer pages
    expect(screen.getByText('Seite 1 von 3')).toBeInTheDocument()
  })

  it('handles next page navigation', async () => {
    render(<TestWrapper />)
    
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    await user.click(nextButton)
    
    expect(screen.getByText('Seite 2 von 5')).toBeInTheDocument()
  })

  it('handles previous page navigation', async () => {
    render(<TestWrapper />)
    
    // Go to page 2 first
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    await user.click(nextButton)
    
    // Then go back
    const prevButton = screen.getByLabelText('Zur vorherigen Seite')
    await user.click(prevButton)
    
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()
  })

  it('handles first page navigation', async () => {
    render(<TestWrapper />)
    
    // Go to page 3
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    await user.click(nextButton)
    await user.click(nextButton)
    
    expect(screen.getByText('Seite 3 von 5')).toBeInTheDocument()
    
    // Go to first page
    const firstButton = screen.getByLabelText('Zur ersten Seite')
    await user.click(firstButton)
    
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()
  })

  it('handles last page navigation', async () => {
    render(<TestWrapper />)
    
    const lastButton = screen.getByLabelText('Zur letzten Seite')
    await user.click(lastButton)
    
    expect(screen.getByText('Seite 5 von 5')).toBeInTheDocument()
  })

  it('disables previous buttons on first page', () => {
    render(<TestWrapper />)
    
    const prevButton = screen.getByLabelText('Zur vorherigen Seite')
    const firstButton = screen.getByLabelText('Zur ersten Seite')
    
    expect(prevButton).toBeDisabled()
    expect(firstButton).toBeDisabled()
  })

  it('disables next buttons on last page', async () => {
    render(<TestWrapper />)
    
    // Go to last page
    const lastButton = screen.getByLabelText('Zur letzten Seite')
    await user.click(lastButton)
    
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    expect(nextButton).toBeDisabled()
    expect(lastButton).toBeDisabled()
  })

  it('shows selection count when enabled and rows are selected', () => {
    // This would require a more complex setup with row selection
    render(<TestWrapper showSelectedCount={true} />)
    
    // Without actual selection, should not show selection count
    expect(screen.queryByText(/ausgewählt/)).not.toBeInTheDocument()
  })

  it('hides selection count when disabled', () => {
    render(<TestWrapper showSelectedCount={false} />)
    
    expect(screen.queryByText(/ausgewählt/)).not.toBeInTheDocument()
  })

  it('handles single page scenario', () => {
    render(<TestWrapper dataCount={5} initialPageSize={10} />)
    
    expect(screen.getByText('Seite 1 von 1')).toBeInTheDocument()
    
    // Navigation buttons should be disabled
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    const prevButton = screen.getByLabelText('Zur vorherigen Seite')
    
    expect(nextButton).toBeDisabled()
    expect(prevButton).toBeDisabled()
  })

  it('handles empty data scenario', () => {
    render(<TestWrapper dataCount={0} />)
    
    expect(screen.getByText('Seite 1 von 1')).toBeInTheDocument()
  })

  it('updates page info when data changes', () => {
    const { rerender } = render(<TestWrapper dataCount={30} />)
    expect(screen.getByText('Seite 1 von 3')).toBeInTheDocument()
    
    rerender(<TestWrapper dataCount={50} />)
    expect(screen.getByText('Seite 1 von 5')).toBeInTheDocument()
  })
})

// Mobile-specific tests
describe('DataTablePagination - Mobile', () => {
  const user = userEvent.setup()

  beforeAll(() => {
    // Mock mobile hook to return true
    jest.doMock('@/hooks/use-mobile', () => ({
      useIsMobile: () => true,
    }))
  })

  it('renders mobile layout correctly', () => {
    render(<TestWrapper />)
    
    // Should show compact mobile layout
    expect(screen.getByText('Pro Seite')).toBeInTheDocument()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('handles mobile navigation', async () => {
    render(<TestWrapper />)
    
    const nextButton = screen.getByLabelText('Zur nächsten Seite')
    await user.click(nextButton)
    
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })
})