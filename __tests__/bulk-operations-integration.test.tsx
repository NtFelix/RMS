import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { SelectableApartmentTable } from '@/components/selectable-apartment-table'

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

// Mock fetch for houses and bulk operations
global.fetch = jest.fn()

const mockApartments = [
  {
    id: 'apt-1',
    name: 'Apartment 1',
    groesse: 50,
    miete: 800,
    haus_id: 'haus-1',
    Haeuser: { name: 'House 1' },
    status: 'frei' as const,
  },
  {
    id: 'apt-2',
    name: 'Apartment 2',
    groesse: 60,
    miete: 900,
    haus_id: 'haus-1',
    Haeuser: { name: 'House 1' },
    status: 'vermietet' as const,
  },
  {
    id: 'apt-3',
    name: 'Apartment 3',
    groesse: 70,
    miete: 1000,
    haus_id: 'haus-2',
    Haeuser: { name: 'House 2' },
    status: 'frei' as const,
  },
]

describe('Bulk Operations Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock houses fetch
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/haeuser') {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 'haus-1', name: 'House 1' },
            { id: 'haus-2', name: 'House 2' },
            { id: 'haus-3', name: 'House 3' }
          ]
        })
      }
      
      if (url === '/api/bulk-operations') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            updatedCount: 2,
            failedIds: [],
            errors: []
          })
        })
      }
      
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('allows selecting apartments and performing bulk house change', async () => {
    render(
      <BulkOperationsProvider>
        <SelectableApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      </BulkOperationsProvider>
    )

    // Verify apartments are rendered
    expect(screen.getByText('Apartment 1')).toBeInTheDocument()
    expect(screen.getByText('Apartment 2')).toBeInTheDocument()
    expect(screen.getByText('Apartment 3')).toBeInTheDocument()

    // Select first two apartments
    const checkboxes = screen.getAllByRole('checkbox')
    
    // Skip the select-all checkbox (first one) and select individual apartments
    fireEvent.click(checkboxes[1]) // Apartment 1
    fireEvent.click(checkboxes[2]) // Apartment 2

    // Wait for bulk action bar to appear
    await waitFor(() => {
      expect(screen.getByText(/2.*selected/)).toBeInTheDocument()
    })

    // Click on bulk operations dropdown
    const operationsButton = screen.getByRole('button', { name: /bulk operations/i })
    fireEvent.click(operationsButton)

    // Select "Change Haus" operation
    await waitFor(() => {
      const changeHausOption = screen.getByText('Haus ändern')
      fireEvent.click(changeHausOption)
    })

    // Wait for the bulk change haus dialog to open
    await waitFor(() => {
      expect(screen.getByText('2 Wohnungen einem neuen Haus zuweisen')).toBeInTheDocument()
    })

    // Wait for houses to load and select a house
    await waitFor(() => {
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const houseOption = screen.getByText('House 3')
      fireEvent.click(houseOption)
    })

    // Confirm the operation
    const confirmButton = screen.getByRole('button', { name: /2 Wohnungen zuweisen/i })
    fireEvent.click(confirmButton)

    // Verify the API was called correctly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'changeHaus',
          tableType: 'wohnungen',
          selectedIds: ['apt-1', 'apt-2'],
          data: { hausId: 'haus-3' },
        }),
      })
    })

    // Verify success toast was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erfolgreich',
        description: '2 Wohnungen wurden dem Haus "House 3" zugewiesen.',
      })
    })
  })

  it('shows select all functionality', async () => {
    render(
      <BulkOperationsProvider>
        <SelectableApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      </BulkOperationsProvider>
    )

    // Click select all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(selectAllCheckbox)

    // Wait for all apartments to be selected
    await waitFor(() => {
      expect(screen.getByText(/3.*selected/)).toBeInTheDocument()
    })

    // Verify all individual checkboxes are checked
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.slice(1).forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('clears selection when escape key is pressed', async () => {
    render(
      <BulkOperationsProvider>
        <SelectableApartmentTable
          filter="all"
          searchQuery=""
          initialApartments={mockApartments}
        />
      </BulkOperationsProvider>
    )

    // Select an apartment
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    // Wait for selection to appear
    await waitFor(() => {
      expect(screen.getByText(/1.*selected/)).toBeInTheDocument()
    })

    // Press escape key
    fireEvent.keyDown(document, { key: 'Escape' })

    // Wait for selection to be cleared
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    })
  })
})