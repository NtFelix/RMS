import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BulkChangeTypComponent } from '@/components/bulk-change-typ-component'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

const mockToast = jest.fn()
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('BulkChangeTypComponent', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()
  const selectedIds = ['1', '2', '3']

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseToast.mockReturnValue({ toast: mockToast })
  })

  it('renders correctly with proper title and description', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Typ ändern')).toBeInTheDocument()
    expect(screen.getByText(/3 Finanz-Eintr.+ge zwischen Einnahmen und Ausgaben wechseln/)).toBeInTheDocument()
  })

  it('shows dropdown with Einnahmen and Ausgaben options', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)

    expect(screen.getByText('Einnahmen')).toBeInTheDocument()
    expect(screen.getByText('Ausgaben')).toBeInTheDocument()
  })

  it('shows confirmation details when a type is selected', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    
    const einnahmenOption = screen.getByText('Einnahmen')
    fireEvent.click(einnahmenOption)

    expect(screen.getByText('Ausgewählter Typ:')).toBeInTheDocument()
    expect(screen.getByText('Alle 3 ausgewählten Finanz-Einträge werden zu diesem Typ geändert.')).toBeInTheDocument()
    expect(screen.getByText('Alle anderen Eigenschaften der Einträge bleiben unverändert.')).toBeInTheDocument()
  })

  it('calls onConfirm with correct data when Einnahmen is selected', async () => {
    mockOnConfirm.mockResolvedValue(undefined)

    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Select Einnahmen
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    fireEvent.click(screen.getByText('Einnahmen'))

    // Click confirm button
    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({ ist_einnahmen: true })
    })
  })

  it('calls onConfirm with correct data when Ausgaben is selected', async () => {
    mockOnConfirm.mockResolvedValue(undefined)

    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Select Ausgaben
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    fireEvent.click(screen.getByText('Ausgaben'))

    // Click confirm button
    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({ ist_einnahmen: false })
    })
  })

  it('disables confirm button when no type is selected', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    expect(confirmButton).toBeDisabled()
  })

  it('shows success toast when operation completes successfully', async () => {
    mockOnConfirm.mockResolvedValue(undefined)

    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Select Einnahmen
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    fireEvent.click(screen.getByText('Einnahmen'))

    // Click confirm button
    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erfolgreich',
        description: expect.stringMatching(/3 Finanz-Eintr.+ge wurden zu "Einnahmen" geändert\./),
      })
    })
  })

  it('shows error toast when operation fails', async () => {
    mockOnConfirm.mockRejectedValue(new Error('API Error'))

    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Select Einnahmen
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    fireEvent.click(screen.getByText('Einnahmen'))

    // Click confirm button
    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler',
        description: 'Die Finanz-Einträge konnten nicht geändert werden.',
        variant: 'destructive',
      })
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Abbrechen')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables buttons during loading state', async () => {
    // Mock a slow onConfirm to test loading state
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <BulkChangeTypComponent
        selectedIds={selectedIds}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Select Einnahmen
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    fireEvent.click(screen.getByText('Einnahmen'))

    // Click confirm button
    const confirmButton = screen.getByText(/3 Eintr.+ge ändern/)
    fireEvent.click(confirmButton)

    // Check loading state
    expect(screen.getByText('Wird geändert...')).toBeInTheDocument()
    expect(screen.getByText('Abbrechen')).toBeDisabled()
  })

  it('handles singular form correctly for single item', () => {
    render(
      <BulkChangeTypComponent
        selectedIds={['1']}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/1 Finanz-Eintrag zwischen Einnahmen und Ausgaben wechseln/)).toBeInTheDocument()
    expect(screen.getByText(/1 Eintrag ändern/)).toBeInTheDocument()
  })
})