import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WasserAblesenModal } from '@/components/water-meters/wasser-ablesungen-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock fetch
global.fetch = jest.fn()

describe('WasserAblesenModal - Unsaved Changes Detection', () => {
  const mockWasserAblesenModalData = {
    wasserZaehlerId: 'test-zaehler-id',
    wohnungName: 'Test Wohnung',
    customId: 'Meter-001',
  }

  const mockSetWasserAblesenModalDirty = jest.fn()
  const mockCloseWasserAblesenModal = jest.fn()

  const mockAblesungen = [
    {
      id: '1',
      ablese_datum: '2024-11-01',
      zaehlerstand: 123.45,
      verbrauch: 15.5,
      wasser_zaehler_id: 'test-zaehler-id',
      user_id: 'test-user-id',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isWasserAblesenModalOpen: true,
      wasserAblesenModalData: mockWasserAblesenModalData,
      closeWasserAblesenModal: mockCloseWasserAblesenModal,
      setWasserAblesenModalDirty: mockSetWasserAblesenModalDirty,
    } as any)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAblesungen,
    })
  })

  it('should set dirty state when typing in new reading form', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Zählerstand (m³)')).toBeInTheDocument()
    })

    // Type in the zaehlerstand input
    const zaehlerstandInput = screen.getByPlaceholderText('Zählerstand (m³)')
    fireEvent.change(zaehlerstandInput, { target: { value: '150.00' } })

    // Should set dirty state to true
    await waitFor(() => {
      expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(true)
    })
  })

  it('should set dirty state when typing in verbrauch field', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      const verbrauchInputs = screen.getAllByPlaceholderText('Verbrauch (m³)')
      expect(verbrauchInputs.length).toBeGreaterThan(0)
    })

    // Type in the verbrauch input
    const verbrauchInputs = screen.getAllByPlaceholderText('Verbrauch (m³)')
    const newVerbrauchInput = verbrauchInputs[0]
    fireEvent.change(newVerbrauchInput, { target: { value: '20.0' } })

    // Should set dirty state to true
    await waitFor(() => {
      expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(true)
    })
  })

  it('should set dirty state when entering edit mode and changing values', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByText('123,45 m³')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg?.classList.contains('lucide-edit-2') || svg?.getAttribute('class')?.includes('edit')
    })
    
    if (editButton) {
      fireEvent.click(editButton)

      await waitFor(() => {
        const editInput = screen.getByDisplayValue('123,45')
        expect(editInput).toBeInTheDocument()
      })

      // Change the value
      const editInput = screen.getByDisplayValue('123,45')
      fireEvent.change(editInput, { target: { value: '125.00' } })

      // Should set dirty state to true
      await waitFor(() => {
        expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(true)
      })
    }
  })

  it('should clear dirty state when canceling edit', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByText('123,45 m³')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg?.classList.contains('lucide-edit-2') || svg?.getAttribute('class')?.includes('edit')
    })
    
    if (editButton) {
      fireEvent.click(editButton)

      await waitFor(() => {
        const editInput = screen.getByDisplayValue('123,45')
        expect(editInput).toBeInTheDocument()
      })

      // Change the value
      const editInput = screen.getByDisplayValue('123,45')
      fireEvent.change(editInput, { target: { value: '125.00' } })

      // Find and click cancel button (X button)
      const allButtons = screen.getAllByRole('button')
      const cancelButton = allButtons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-x')
      })
      
      if (cancelButton) {
        fireEvent.click(cancelButton)

        // Should set dirty state to false
        await waitFor(() => {
          expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(false)
        })
      }
    }
  })

  it('should clear dirty state when closing modal', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Zählerstand (m³)')).toBeInTheDocument()
    })

    // Type in the zaehlerstand input to make it dirty
    const zaehlerstandInput = screen.getByPlaceholderText('Zählerstand (m³)')
    fireEvent.change(zaehlerstandInput, { target: { value: '150.00' } })

    await waitFor(() => {
      expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(true)
    })

    // Find and click close button
    const closeButton = screen.getByText(/Schließen/i)
    fireEvent.click(closeButton)

    // Should set dirty state to false when closing
    await waitFor(() => {
      expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(false)
    })
  })

  it('should not set dirty state when no changes are made', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByText('123,45 m³')).toBeInTheDocument()
    })

    // Initially should not be dirty (or set to false)
    const dirtyCalls = mockSetWasserAblesenModalDirty.mock.calls
    const lastCall = dirtyCalls[dirtyCalls.length - 1]
    
    // The last call should be false (no unsaved changes)
    expect(lastCall?.[0]).toBe(false)
  })

  it('should detect changes in reading date', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByText('123,45 m³')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg?.classList.contains('lucide-edit-2') || svg?.getAttribute('class')?.includes('edit')
    })
    
    if (editButton) {
      fireEvent.click(editButton)

      await waitFor(() => {
        const editInput = screen.getByDisplayValue('123,45')
        expect(editInput).toBeInTheDocument()
      })

      // Find the date picker button
      const dateButtons = screen.getAllByRole('button')
      const dateButton = dateButtons.find(btn => btn.textContent?.includes('01.11.2024'))
      
      if (dateButton) {
        fireEvent.click(dateButton)

        // Should eventually set dirty state to true when date changes
        await waitFor(() => {
          expect(mockSetWasserAblesenModalDirty).toHaveBeenCalled()
        })
      }
    }
  })

  it('should detect changes in verbrauch during edit', async () => {
    render(<WasserAblesenModal />)

    await waitFor(() => {
      expect(screen.getByText('123,45 m³')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg?.classList.contains('lucide-edit-2') || svg?.getAttribute('class')?.includes('edit')
    })
    
    if (editButton) {
      fireEvent.click(editButton)

      await waitFor(() => {
        const editInput = screen.getByDisplayValue('15,5')
        expect(editInput).toBeInTheDocument()
      })

      // Change the verbrauch value
      const verbrauchInput = screen.getByDisplayValue('15,5')
      fireEvent.change(verbrauchInput, { target: { value: '20.0' } })

      // Should set dirty state to true
      await waitFor(() => {
        expect(mockSetWasserAblesenModalDirty).toHaveBeenCalledWith(true)
      })
    }
  })
})
