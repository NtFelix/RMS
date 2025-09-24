import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SelectableTable, SelectableTableRow, SelectableTableHeader, withSelectableTable } from '@/components/selectable-table'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Mock data
const mockData = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
  { id: '3', name: 'Item 3', value: 300 },
]

// Simple test table component
function TestTable({ data }: { data: typeof mockData }) {
  return (
    <Table>
      <TableHeader>
        <SelectableTableHeader allIds={data.map(item => item.id)}>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </SelectableTableHeader>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <SelectableTableRow key={item.id} id={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.value}</TableCell>
          </SelectableTableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BulkOperationsProvider>
      {children}
    </BulkOperationsProvider>
  )
}

describe('SelectableTable HOC', () => {
  it('renders table with selection checkboxes', () => {
    render(
      <TestWrapper>
        <SelectableTable data={mockData} tableType="wohnungen">
          <TestTable data={mockData} />
        </SelectableTable>
      </TestWrapper>
    )

    // Check that checkboxes are rendered
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4) // 3 row checkboxes + 1 select all checkbox

    // Check that table content is rendered
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('allows row selection', () => {
    render(
      <TestWrapper>
        <SelectableTable data={mockData} tableType="wohnungen">
          <TestTable data={mockData} />
        </SelectableTable>
      </TestWrapper>
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const firstRowCheckbox = checkboxes[1] // Skip select all checkbox

    // Click the first row checkbox
    fireEvent.click(firstRowCheckbox)

    // Check that the checkbox is now checked
    expect(firstRowCheckbox).toBeChecked()
  })

  it('handles select all functionality', () => {
    render(
      <TestWrapper>
        <SelectableTable data={mockData} tableType="wohnungen">
          <TestTable data={mockData} />
        </SelectableTable>
      </TestWrapper>
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const selectAllCheckbox = checkboxes[0]

    // Click select all
    fireEvent.click(selectAllCheckbox)

    // Check that all checkboxes are now checked
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('applies selected row styling', () => {
    render(
      <TestWrapper>
        <SelectableTable data={mockData} tableType="wohnungen">
          <TestTable data={mockData} />
        </SelectableTable>
      </TestWrapper>
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const firstRowCheckbox = checkboxes[1]

    // Click the first row checkbox
    fireEvent.click(firstRowCheckbox)

    // Find the table row and check for selected styling
    const tableRow = firstRowCheckbox.closest('tr')
    expect(tableRow).toHaveAttribute('data-selected', 'true')
    expect(tableRow).toHaveClass('bg-blue-50', 'border-blue-200')
  })

  it('calls onSelectionChange when selection changes', () => {
    const onSelectionChange = jest.fn()

    render(
      <TestWrapper>
        <SelectableTable 
          data={mockData} 
          tableType="wohnungen"
          onSelectionChange={onSelectionChange}
        >
          <TestTable data={mockData} />
        </SelectableTable>
      </TestWrapper>
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const firstRowCheckbox = checkboxes[1]

    // Click the first row checkbox
    fireEvent.click(firstRowCheckbox)

    // Check that onSelectionChange was called with the selected ID
    expect(onSelectionChange).toHaveBeenCalledWith(['1'])
  })

  it('works with withSelectableTable HOC', () => {
    const SelectableTestTable = withSelectableTable(TestTable, 'wohnungen')

    render(
      <TestWrapper>
        <SelectableTestTable data={mockData} />
      </TestWrapper>
    )

    // Check that checkboxes are rendered
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4) // 3 row checkboxes + 1 select all checkbox

    // Check that table content is rendered
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })
})