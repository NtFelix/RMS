import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BulkChangeHausComponent } from '@/components/bulk-change-haus-component'

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

// Mock fetch
global.fetch = jest.fn()

describe('BulkChangeHausComponent', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()
  const selectedIds = ['wohnung-1', 'wohnung-2', 'wohnung-3']

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful houses fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'haus-1', name: 'Haus 1' },
        { id: 'haus-2', name: 'Haus 2' },
        { id: 'haus-3', name: 'Haus 3' }
      ]
    })
  })

  it('renders correctly with selected apartments count', async () => {
    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Haus ändern')).toBeInTheDocument()
    expect(screen.getByText('3 Wohnungen einem neuen Haus zuweisen')).toBeInTheDocument()
    
    // Wait for houses to load
    await waitFor(() => {
      expect(screen.getByText('Haus auswählen...')).toBeInTheDocument()
    })
  })

  it('loads and displays available houses', async () => {
    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Wait for houses to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/haeuser')
    })

    // Click on the select trigger to open dropdown
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)

    // Check if houses are displayed in the dropdown
    await waitFor(() => {
      expect(screen.getByText('Haus 1')).toBeInTheDocument()
      expect(screen.getByText('Haus 2')).toBeInTheDocument()
      expect(screen.getByText('Haus 3')).toBeInTheDocument()
    })
  })

  it('shows validation error when no house is selected', async () => {
    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Wait for houses to load
    await waitFor(() => {
      expect(screen.getByText('Haus auswählen...')).toBeInTheDocument()
    })

    // Try to confirm without selecting a house
    const confirmButton = screen.getByRole('button', { name: /3 Wohnungen zuweisen/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler',
        description: 'Bitte wählen Sie ein Haus aus.',
        variant: 'destructive',
      })
    })

    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with selected house ID when confirmed', async () => {
    mockOnConfirm.mockResolvedValueOnce({})

    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Wait for houses to load
    await waitFor(() => {
      expect(screen.getByText('Haus auswählen...')).toBeInTheDocument()
    })

    // Select a house
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)

    await waitFor(() => {
      const hausOption = screen.getByText('Haus 1')
      fireEvent.click(hausOption)
    })

    // Confirm the operation
    const confirmButton = screen.getByRole('button', { name: /3 Wohnungen zuweisen/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({ hausId: 'haus-1' })
    })
  })

  it('shows success toast after successful operation', async () => {
    mockOnConfirm.mockResolvedValueOnce({})

    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Wait for houses to load and select a house
    await waitFor(() => {
      expect(screen.getByText('Haus auswählen...')).toBeInTheDocument()
    })

    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)

    await waitFor(() => {
      const hausOption = screen.getByText('Haus 1')
      fireEvent.click(hausOption)
    })

    // Confirm the operation
    const confirmButton = screen.getByRole('button', { name: /3 Wohnungen zuweisen/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erfolgreich',
        description: '3 Wohnungen wurden dem Haus "Haus 1" zugewiesen.',
      })
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('handles fetch error gracefully', async () => {
    // Mock fetch failure
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <BulkChangeHausComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler',
        description: 'Häuser konnten nicht geladen werden.',
        variant: 'destructive',
      })
    })
  })
})