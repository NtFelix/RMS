import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../data-table'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: any) => fn,
}))

jest.mock('@/lib/data-export', () => ({
  exportTableData: jest.fn().mockResolvedValue(undefined),
}))

// Test data
interface TestData {
  id: string
  name: string
  status: string
  value: number
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', status: 'active', value: 100 },
  { id: '2', name: 'Item 2', status: 'inactive', value: 200 },
  { id: '3', name: 'Item 3', status: 'active', value: 150 },
]

const testColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
  },
  {
    accessorKey: 'value',
    header: 'Value',
    enableSorting: true,
    cell: ({ row }) => `$${row.getValue('value')}`,
  },
]

describe('DataTable Accessibility Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <DataTable
        columns={testColumns}
        data={testData}
        searchPlaceholder="Search items..."
        enableSelection={true}
        enablePagination={true}
        enableColumnVisibility={true}
        enableExport={true}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has proper table structure and ARIA attributes', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
      />
    )

    // Check table structure
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(table).toHaveAttribute('aria-label', 'Datentabelle')

    // Check column headers
    const columnHeaders = screen.getAllByRole('columnheader')
    expect(columnHeaders).toHaveLength(3)

    columnHeaders.forEach(header => {
      expect(header).toHaveAttribute('aria-sort')
    })

    // Check rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4) // 1 header + 3 data rows

    // Check cells
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('provides proper ARIA labels for interactive elements', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
        enablePagination={true}
        enableColumnVisibility={true}
        enableExport={true}
      />
    )

    // Search input
    const searchInput = screen.getByLabelText('Globale Suche')
    expect(searchInput).toBeInTheDocument()

    // Selection checkboxes
    expect(screen.getByLabelText('Alle auswählen')).toBeInTheDocument()
    const rowCheckboxes = screen.getAllByLabelText('Zeile auswählen')
    expect(rowCheckboxes).toHaveLength(3)

    // Pagination buttons
    expect(screen.getByLabelText('Zur ersten Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur vorherigen Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur nächsten Seite')).toBeInTheDocument()
    expect(screen.getByLabelText('Zur letzten Seite')).toBeInTheDocument()

    // Column visibility button
    expect(screen.getByLabelText('Spalten ein-/ausblenden')).toBeInTheDocument()

    // Export button
    expect(screen.getByLabelText('Daten exportieren')).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const mockRowClick = jest.fn()
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={mockRowClick}
      />
    )

    // Tab to first row
    await user.tab()
    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toHaveFocus()

    // Press Enter to activate row
    await user.keyboard('{Enter}')
    expect(mockRowClick).toHaveBeenCalledWith(testData[0])

    // Test arrow key navigation
    await user.keyboard('{ArrowDown}')
    const secondRow = screen.getByText('Item 2').closest('tr')
    expect(secondRow).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(firstRow).toHaveFocus()

    // Test Home/End keys
    await user.keyboard('{End}')
    const lastRow = screen.getByText('Item 3').closest('tr')
    expect(lastRow).toHaveFocus()

    await user.keyboard('{Home}')
    expect(firstRow).toHaveFocus()

    // Test Escape key
    await user.keyboard('{Escape}')
    expect(firstRow).not.toHaveFocus()
  })

  it('provides screen reader announcements', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
        enablePagination={true}
      />
    )

    // Check for live region
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')

    // Should announce table state
    expect(liveRegion).toHaveTextContent(/3 Zeilen insgesamt/)
  })

  it('handles focus management correctly', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
        enableColumnVisibility={true}
      />
    )

    // Tab through interactive elements
    await user.tab() // Search input
    expect(screen.getByLabelText('Globale Suche')).toHaveFocus()

    await user.tab() // Export button (if enabled)
    await user.tab() // Columns button
    expect(screen.getByLabelText('Spalten ein-/ausblenden')).toHaveFocus()

    // Open dropdown and check focus management
    await user.keyboard('{Enter}')
    const dropdown = screen.getByRole('menu')
    expect(dropdown).toBeInTheDocument()

    // Close with Escape
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Spalten ein-/ausblenden')).toHaveFocus()
  })

  it('provides proper sort state announcements', async () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
      />
    )

    const nameHeader = screen.getByText('Name')
    const headerButton = nameHeader.closest('button')
    expect(headerButton).toBeInTheDocument()

    if (headerButton) {
      // Initially unsorted
      expect(headerButton.closest('th')).toHaveAttribute('aria-sort', 'none')

      // Click to sort ascending
      await user.click(headerButton)
      expect(headerButton.closest('th')).toHaveAttribute('aria-sort', 'ascending')

      // Click again to sort descending
      await user.click(headerButton)
      expect(headerButton.closest('th')).toHaveAttribute('aria-sort', 'descending')
    }
  })

  it('handles empty state accessibility', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        emptyMessage="No data available"
      />
    )

    // Should still have proper table structure
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()

    // Empty state should be accessible
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('handles loading state accessibility', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        loading={true}
      />
    )

    // Loading skeleton should be accessible
    const skeleton = document.querySelector('[data-testid="table-skeleton"]')
    if (skeleton) {
      expect(skeleton).toHaveAttribute('aria-label')
    }
  })

  it('handles error state accessibility', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        error="Failed to load data"
      />
    )

    // Error message should be accessible
    expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()

    // Should have proper role
    const errorContainer = screen.getByText('Failed to load data').closest('[role]')
    if (errorContainer) {
      expect(errorContainer).toHaveAttribute('role')
    }
  })

  it('supports high contrast mode', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
      />
    )

    // Check that interactive elements have proper contrast indicators
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeInTheDocument()
      // In high contrast mode, checkboxes should be visible
    })

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeInTheDocument()
      // Buttons should have proper focus indicators
    })
  })

  it('handles reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(
      <DataTable
        columns={testColumns}
        data={testData}
      />
    )

    // Table should render without animations when reduced motion is preferred
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('provides proper context for screen readers', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        enableSelection={true}
        enablePagination={true}
      />
    )

    // Table should have proper caption or summary
    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('aria-label', 'Datentabelle')

    // Cells should have proper descriptions
    const cells = screen.getAllByRole('cell')
    cells.forEach(cell => {
      expect(cell).toHaveAttribute('aria-describedby')
    })
  })
})