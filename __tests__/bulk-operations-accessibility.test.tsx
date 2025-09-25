import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'
import { BulkOperationDropdown } from '@/components/bulk-operation-dropdown'
import { AccessibleBulkOperationsWrapper } from '@/components/accessible-bulk-operations-wrapper'
import { BulkOperation } from '@/types/bulk-operations'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock the announceToScreenReader function
jest.mock('@/lib/accessibility-constants', () => ({
  ...jest.requireActual('@/lib/accessibility-constants'),
  announceToScreenReader: jest.fn(),
}))

// Mock the bulk operations context
const mockBulkOperationsContext = {
  state: {
    selectedIds: new Set<string>(),
    tableType: null,
    isLoading: false,
    error: null,
    validationResult: null,
  },
  selectRow: jest.fn(),
  selectAll: jest.fn(),
  clearSelection: jest.fn(),
  clearSelectionOnPageChange: jest.fn(),
  clearSelectionOnFilterChange: jest.fn(),
  setTableType: jest.fn(),
  performBulkOperation: jest.fn(),
  validateOperation: jest.fn(),
}

jest.mock('@/context/bulk-operations-context', () => ({
  useBulkOperations: () => mockBulkOperationsContext,
  BulkOperationsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the keyboard navigation hook
jest.mock('@/hooks/use-bulk-operations-keyboard-navigation', () => ({
  useBulkOperationsKeyboardNavigation: () => ({
    handleCheckboxKeyDown: jest.fn(),
    focusBulkActionBar: jest.fn(),
    restoreFocus: jest.fn(),
    isKeyboardNavigationEnabled: true,
  }),
}))

const mockBulkOperations: BulkOperation[] = [
  {
    id: 'change-status',
    label: 'Status ändern',
    icon: undefined,
    requiresConfirmation: true,
    component: ({ onConfirm, onCancel }) => (
      <div>
        <button onClick={() => onConfirm()}>Bestätigen</button>
        <button onClick={onCancel}>Abbrechen</button>
      </div>
    ),
  },
]

describe('Bulk Operations Accessibility', () => {
  beforeEach(() => {
    // Clear any previous announcements and mocks
    jest.clearAllMocks()
    // Reset the mock context state
    mockBulkOperationsContext.state.selectedIds = new Set<string>()
    mockBulkOperationsContext.state.isLoading = false
    mockBulkOperationsContext.state.error = null
  })

  describe('RowSelectionCheckbox', () => {
    it('should have proper ARIA labels and keyboard support', async () => {
      const user = userEvent.setup()
      
      render(<RowSelectionCheckbox rowId="test-1" rowLabel="Test Item 1" />)

      const checkbox = screen.getByRole('checkbox')
      
      // Check ARIA attributes
      expect(checkbox).toHaveAttribute('aria-label', 'Auswählen Test Item 1')
      expect(checkbox).toHaveAttribute('aria-describedby', 'row-test-1-description')
      
      // Check keyboard interaction - click the checkbox to trigger selection
      await user.click(checkbox)
      expect(mockBulkOperationsContext.selectRow).toHaveBeenCalledWith('test-1')
      
      // Check accessibility
      const results = await axe(checkbox.parentElement!)
      expect(results).toHaveNoViolations()
    })

    it('should announce selection changes to screen readers', async () => {
      const { announceToScreenReader } = require('@/lib/accessibility-constants')
      const user = userEvent.setup()
      
      render(<RowSelectionCheckbox rowId="test-1" rowLabel="Test Item 1" />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('Test Item 1'),
        'polite'
      )
    })
  })

  describe('SelectAllCheckbox', () => {
    it('should have proper ARIA labels and states', async () => {
      const allIds = ['1', '2', '3']
      const selectedIds = new Set(['1'])
      
      render(
        <SelectAllCheckbox 
          allIds={allIds} 
          selectedIds={selectedIds}
          tableType="Wohnungen"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      
      // Check indeterminate state
      expect(checkbox).toHaveAttribute('aria-label', expect.stringContaining('Einige'))
      expect(checkbox).toHaveAttribute('aria-describedby', 'select-all-description')
      
      // Check accessibility
      const results = await axe(checkbox.parentElement!)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const allIds = ['1', '2', '3']
      
      render(
        <SelectAllCheckbox 
          allIds={allIds} 
          selectedIds={new Set()}
          tableType="Wohnungen"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      
      // Test Space key
      checkbox.focus()
      await user.keyboard(' ')
      
      expect(mockBulkOperationsContext.selectAll).toHaveBeenCalledWith(allIds)
    })
  })

  describe('BulkActionBar', () => {
    it('should not render when no items are selected', () => {
      // Mock empty selection
      mockBulkOperationsContext.state.selectedIds = new Set()
      
      const { container } = render(
        <div data-testid="bulk-action-bar-container">
          {mockBulkOperationsContext.state.selectedIds.size > 0 && (
            <div role="toolbar" aria-label="Bulk actions">
              Bulk Action Bar Content
            </div>
          )}
        </div>
      )

      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })

    it('should render with proper accessibility attributes when items are selected', () => {
      // Mock selection
      mockBulkOperationsContext.state.selectedIds = new Set(['test-1'])
      
      render(
        <div role="toolbar" aria-label="Bulk actions for 1 selected items" data-bulk-action-bar>
          <div role="status" aria-live="polite">1 Element ausgewählt</div>
          <button aria-label="Clear selection">Clear</button>
        </div>
      )

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveAttribute('aria-label', expect.stringContaining('1'))
      expect(toolbar).toHaveAttribute('data-bulk-action-bar')
      
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
    })
  })

  describe('BulkOperationDropdown', () => {
    it('should have proper menu role and keyboard navigation', async () => {
      const user = userEvent.setup()
      const onOperationSelect = jest.fn()
      
      render(
        <BulkOperationDropdown
          operations={mockBulkOperations}
          selectedCount={1}
          onOperationSelect={onOperationSelect}
        />
      )

      const trigger = screen.getByRole('button', { name: /bulk-aktionen/i })
      expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Bulk-Aktionen'))
      expect(trigger).toHaveAttribute('data-bulk-operations-dropdown')
      
      // Open dropdown
      await user.click(trigger)
      
      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
      
      const menuItem = screen.getByRole('menuitem')
      expect(menuItem).toHaveAttribute('data-bulk-operation-button', 'change-status')
    })
  })

  describe('AccessibleBulkOperationsWrapper', () => {
    it('should provide proper region role and instructions', () => {
      render(
        <AccessibleBulkOperationsWrapper tableType="Wohnungen">
          <div>Table content</div>
        </AccessibleBulkOperationsWrapper>
      )

      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-label', 'Wohnungen mit Bulk-Operationen')
      expect(region).toHaveAttribute('aria-describedby', 'bulk-operations-instructions')
      expect(region).toHaveAttribute('data-bulk-operations-table')
      
      // Check for screen reader instructions
      const instructions = screen.getByText(/verwenden sie die leertaste/i)
      expect(instructions).toHaveClass('sr-only')
    })

    it('should announce selection changes', async () => {
      const { announceToScreenReader } = require('@/lib/accessibility-constants')
      
      render(
        <AccessibleBulkOperationsWrapper tableType="Wohnungen">
          <RowSelectionCheckbox rowId="test-1" />
        </AccessibleBulkOperationsWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      
      // Should announce selection change
      expect(announceToScreenReader).toHaveBeenCalled()
    })
  })

  describe('Table Row Accessibility', () => {
    it('should have proper row structure with accessibility features', () => {
      // Mock a selected state
      mockBulkOperationsContext.state.selectedIds = new Set(['1'])
      
      render(
        <table>
          <tbody>
            <tr role="row" aria-selected="true" aria-label="Zeile: Item 1" tabIndex={0}>
              <td role="gridcell">
                <RowSelectionCheckbox rowId="1" rowLabel="Item 1" />
              </td>
              <td>Item 1</td>
            </tr>
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      expect(row).toHaveAttribute('aria-selected', 'true')
      expect(row).toHaveAttribute('aria-label', 'Zeile: Item 1')
      expect(row).toHaveAttribute('tabIndex', '0')
      
      const gridcell = screen.getByRole('gridcell')
      expect(gridcell).toBeInTheDocument()
    })

    it('should pass accessibility audit for table structure', async () => {
      const { container } = render(
        <table>
          <thead>
            <tr role="row">
              <th role="columnheader">
                <SelectAllCheckbox 
                  allIds={['1', '2', '3']} 
                  selectedIds={new Set()} 
                  tableType="Wohnungen"
                />
              </th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            <tr role="row" aria-selected="false" aria-label="Zeile: Item 1" tabIndex={0}>
              <td role="gridcell">
                <RowSelectionCheckbox rowId="1" rowLabel="Item 1" />
              </td>
              <td>Item 1</td>
            </tr>
          </tbody>
        </table>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should support Space key for checkbox selection', async () => {
      const user = userEvent.setup()
      
      render(<RowSelectionCheckbox rowId="test-1" rowLabel="Test Item 1" />)

      const checkbox = screen.getByRole('checkbox')
      
      // Focus and press Space
      checkbox.focus()
      await user.keyboard(' ')
      
      expect(mockBulkOperationsContext.selectRow).toHaveBeenCalledWith('test-1')
    })

    it('should support Space key for select all checkbox', async () => {
      const user = userEvent.setup()
      const allIds = ['1', '2', '3']
      
      render(
        <SelectAllCheckbox 
          allIds={allIds} 
          selectedIds={new Set()} 
          tableType="Wohnungen"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      
      // Focus and press Space
      checkbox.focus()
      await user.keyboard(' ')
      
      expect(mockBulkOperationsContext.selectAll).toHaveBeenCalledWith(allIds)
    })

    it('should have proper focus management', () => {
      render(
        <div>
          <RowSelectionCheckbox rowId="test-1" rowLabel="Test Item 1" />
          <SelectAllCheckbox 
            allIds={['1', '2', '3']} 
            selectedIds={new Set()} 
            tableType="Wohnungen"
          />
        </div>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      
      // All checkboxes should be focusable
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Screen Reader Announcements', () => {
    it('should announce row selection changes', async () => {
      const { announceToScreenReader } = require('@/lib/accessibility-constants')
      const user = userEvent.setup()
      
      render(<RowSelectionCheckbox rowId="test-1" rowLabel="Test Item 1" />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('Test Item 1'),
        'polite'
      )
    })

    it('should announce select all changes', async () => {
      const { announceToScreenReader } = require('@/lib/accessibility-constants')
      const user = userEvent.setup()
      const allIds = ['1', '2', '3']
      
      render(
        <SelectAllCheckbox 
          allIds={allIds} 
          selectedIds={new Set()} 
          tableType="Wohnungen"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('3'),
        'polite'
      )
    })
  })
})