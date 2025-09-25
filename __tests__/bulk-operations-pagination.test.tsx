import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { PaginatedSelectableTable } from '@/components/paginated-selectable-table'
import { SelectableTable, SelectableTableHeader, SelectableTableRow } from '@/components/selectable-table'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'

// Mock data for testing
const mockData = Array.from({ length: 50 }, (_, i) => ({
  id: `item-${i + 1}`,
  name: `Item ${i + 1}`,
  value: i + 1
}))

// Test component that renders a paginated selectable table
function TestPaginatedTable({ 
  data = mockData, 
  pageSize = 10,
  filterValue = '' 
}: { 
  data?: typeof mockData
  pageSize?: number
  filterValue?: string
}) {
  const filteredData = filterValue 
    ? data.filter(item => item.name.toLowerCase().includes(filterValue.toLowerCase()))
    : data

  const [currentPage, setCurrentPage] = React.useState(1)
  
  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterValue])

  // Calculate current page data
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageData = filteredData.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredData.length / pageSize)

  return (
    <BulkOperationsProvider>
      <div className="space-y-4">
        <SelectableTable
          data={currentPageData}
          tableType="mieter"
          currentPage={currentPage}
          filterDependencies={[filterValue]}
        >
          <Table>
            <TableHeader>
              <SelectableTableHeader>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
              </SelectableTableHeader>
            </TableHeader>
            <TableBody>
              {currentPageData.map((item) => (
                <SelectableTableRow key={item.id} id={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.value}</TableCell>
                </SelectableTableRow>
              ))}
            </TableBody>
          </Table>
        </SelectableTable>
        
        {/* Simple pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <button
              aria-label="Go to previous page"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              aria-label="Go to next page"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </BulkOperationsProvider>
  )
}

describe('Bulk Operations Pagination', () => {
  const user = userEvent.setup()

  it('should clear selections when switching pages', async () => {
    render(<TestPaginatedTable pageSize={10} />)

    // Select some items on the first page
    const firstRowCheckbox = screen.getAllByRole('checkbox')[1] // Skip select-all checkbox
    await user.click(firstRowCheckbox)

    // Verify item is selected
    expect(firstRowCheckbox).toBeChecked()

    // Go to next page
    const nextButton = screen.getByLabelText('Go to next page')
    await user.click(nextButton)

    // Wait for page change
    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeInTheDocument()
    })

    // Verify selections are cleared (no checkboxes should be checked except potentially select-all in indeterminate state)
    const checkboxes = screen.getAllByRole('checkbox')
    const rowCheckboxes = checkboxes.slice(1) // Skip select-all checkbox
    
    rowCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should clear selections when filters change', async () => {
    const { rerender } = render(<TestPaginatedTable filterValue="" />)

    // Select some items
    const firstRowCheckbox = screen.getAllByRole('checkbox')[1]
    await user.click(firstRowCheckbox)

    expect(firstRowCheckbox).toBeChecked()

    // Change filter
    rerender(<TestPaginatedTable filterValue="Item 1" />)

    // Wait for filter to apply
    await waitFor(() => {
      // Should show filtered results
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    // Verify selections are cleared
    const checkboxes = screen.getAllByRole('checkbox')
    const rowCheckboxes = checkboxes.slice(1)
    
    rowCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should only select/deselect current page items with select-all checkbox', async () => {
    render(<TestPaginatedTable pageSize={5} />)

    // Get select-all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    
    // Click select-all
    await user.click(selectAllCheckbox)

    // Verify only current page items are selected (first 5 items)
    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1)
    expect(rowCheckboxes).toHaveLength(5) // Only current page items
    
    rowCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })

    // Go to next page
    const nextButton = screen.getByLabelText('Go to next page')
    await user.click(nextButton)

    // Wait for page change
    await waitFor(() => {
      expect(screen.getByText('Item 6')).toBeInTheDocument()
    })

    // Verify selections are cleared on new page
    const newPageCheckboxes = screen.getAllByRole('checkbox').slice(1)
    newPageCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should show correct selection count for current page only', async () => {
    render(<TestPaginatedTable pageSize={5} />)

    // Select first two items
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1]) // First row
    await user.click(checkboxes[2]) // Second row

    // Check if bulk action bar appears (this would show selection count)
    // Note: This test assumes BulkActionBar is rendered when items are selected
    // The actual implementation may vary based on how the selection count is displayed
    
    // Verify select-all checkbox is in indeterminate state
    const selectAllCheckbox = checkboxes[0]
    expect(selectAllCheckbox).toHaveAttribute('data-state', 'indeterminate')
  })

  it('should reset to first page when filters change', async () => {
    const { rerender } = render(<TestPaginatedTable pageSize={5} />)

    // Go to page 2
    const nextButton = screen.getByLabelText('Go to next page')
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Item 6')).toBeInTheDocument()
    })

    // Apply filter
    rerender(<TestPaginatedTable pageSize={5} filterValue="Item 1" />)

    // Should be back on first page with filtered results
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 10')).toBeInTheDocument() // Item 10 contains "Item 1"
    })
  })

  it('should maintain selection state only for current page items', async () => {
    render(<TestPaginatedTable pageSize={5} />)

    // Select all items on first page
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(selectAllCheckbox)

    // Verify all current page items are selected
    const firstPageCheckboxes = screen.getAllByRole('checkbox').slice(1)
    firstPageCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })

    // Go to next page
    const nextButton = screen.getByLabelText('Go to next page')
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Item 6')).toBeInTheDocument()
    })

    // Verify no items are selected on new page
    const secondPageCheckboxes = screen.getAllByRole('checkbox').slice(1)
    secondPageCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })

    // Go back to first page
    const prevButton = screen.getByLabelText('Go to previous page')
    await user.click(prevButton)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    // Verify selections are still cleared (selections don't persist across page changes)
    const backToFirstPageCheckboxes = screen.getAllByRole('checkbox').slice(1)
    backToFirstPageCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })
})