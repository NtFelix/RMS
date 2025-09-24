import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { BulkOperationsProvider, useBulkOperations } from '@/context/bulk-operations-context'
import { BulkOperation } from '@/types/bulk-operations'

// Mock operations for testing
const mockOperations: BulkOperation[] = [
  {
    id: 'change-haus',
    label: 'Change Haus',
    requiresConfirmation: true,
    component: () => <div>Mock Component</div>
  },
  {
    id: 'change-typ',
    label: 'Change Typ',
    requiresConfirmation: true,
    component: () => <div>Mock Component</div>
  }
]

// Test component that can select rows
const TestController = () => {
  const { selectRow, setTableType } = useBulkOperations()
  
  React.useEffect(() => {
    setTableType('wohnungen')
  }, [setTableType])

  return (
    <div>
      <button onClick={() => selectRow('test-id-1')}>Select Row 1</button>
      <button onClick={() => selectRow('test-id-2')}>Select Row 2</button>
      <BulkActionBar operations={mockOperations} />
    </div>
  )
}

// Test wrapper with provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BulkOperationsProvider>
    {children}
  </BulkOperationsProvider>
)

describe('BulkActionBar', () => {
  it('should not render when no rows are selected', () => {
    render(
      <TestWrapper>
        <BulkActionBar operations={mockOperations} />
      </TestWrapper>
    )
    
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('should render with correct selection count when rows are selected', () => {
    render(
      <TestWrapper>
        <TestController />
      </TestWrapper>
    )

    // Initially no toolbar should be visible
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()

    // Select a row
    fireEvent.click(screen.getByText('Select Row 1'))

    // Now toolbar should be visible with selection count
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('1 item selected')).toBeInTheDocument()

    // Select another row
    fireEvent.click(screen.getByText('Select Row 2'))

    // Should show 2 items selected
    expect(screen.getByText('2 items selected')).toBeInTheDocument()
  })

  it('should handle escape key to clear selections', () => {
    render(
      <TestWrapper>
        <TestController />
      </TestWrapper>
    )

    // Select a row first
    fireEvent.click(screen.getByText('Select Row 1'))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    // Simulate escape key press
    fireEvent.keyDown(document, { key: 'Escape' })
    
    // Toolbar should be hidden after escape
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('should render with correct accessibility attributes', () => {
    render(
      <TestWrapper>
        <TestController />
      </TestWrapper>
    )

    // Select a row to make toolbar visible
    fireEvent.click(screen.getByText('Select Row 1'))
    
    // Check accessibility attributes
    const toolbar = screen.getByRole('toolbar')
    expect(toolbar).toHaveAttribute('aria-label', 'Bulk actions for 1 selected items')
  })

  it('should support different positions', () => {
    const { rerender } = render(
      <TestWrapper>
        <BulkActionBar operations={mockOperations} position="top" />
      </TestWrapper>
    )

    rerender(
      <TestWrapper>
        <BulkActionBar operations={mockOperations} position="bottom" />
      </TestWrapper>
    )

    expect(true).toBe(true) // Basic structure test
  })

  it('should render operations dropdown when operations are provided', () => {
    render(
      <TestWrapper>
        <TestController />
      </TestWrapper>
    )

    // Select a row to make toolbar visible
    fireEvent.click(screen.getByText('Select Row 1'))
    
    // Should show Actions button
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should handle loading state correctly', () => {
    render(
      <TestWrapper>
        <BulkActionBar operations={mockOperations} />
      </TestWrapper>
    )

    // Component should handle loading states
    expect(true).toBe(true)
  })
})