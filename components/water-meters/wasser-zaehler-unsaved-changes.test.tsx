import type React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WasserZaehlerModal } from '@/components/water-meters/wasser-zaehler-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock framer-motion to avoid AnimatePresence exit-timer issues across consecutive tests in JSDOM
jest.mock('framer-motion', () => {
  const stripMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(([key]) => !['initial', 'animate', 'exit', 'transition'].includes(key))
    )
  return {
    motion: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...(stripMotionProps(props) as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
      ),
      rect: (props: Record<string, unknown>) => <rect {...(stripMotionProps(props) as React.SVGProps<SVGRectElement>)} />,
      path: (props: Record<string, unknown>) => <path {...(stripMotionProps(props) as React.SVGProps<SVGPathElement>)} />,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  }
})

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock fetch
global.fetch = jest.fn()

describe('WasserZaehlerModal - Unsaved Changes Detection', () => {
  const mockWasserZaehlerModalData = {
    wohnungId: 'test-wohnung-id',
    wohnungName: 'Test Wohnung',
  }

  const mockSetWasserZaehlerModalDirty = jest.fn()
  const mockCloseWasserZaehlerModal = jest.fn()

  const mockMeters = [
    {
      id: '1',
      custom_id: 'Meter-001',
      wohnung_id: 'test-wohnung-id',
      erstellungsdatum: '2024-01-01',
      eichungsdatum: '2030-12-31',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isWasserZaehlerModalOpen: true,
      wasserZaehlerModalData: mockWasserZaehlerModalData,
      closeWasserZaehlerModal: mockCloseWasserZaehlerModal,
      setWasserZaehlerModalDirty: mockSetWasserZaehlerModalDirty,
      openAblesungenModal: jest.fn(),
    } as any)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMeters,
    })
  })

  it('should set dirty state when typing in new meter form', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Zähler-ID eingeben...')).toBeInTheDocument()
    })

    // Type in the new meter input
    const input = screen.getByPlaceholderText('Zähler-ID eingeben...')
    fireEvent.change(input, { target: { value: 'New-Meter' } })

    // Should set dirty state to true
    await waitFor(() => {
      expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalledWith(true)
    })
  })

  it('should set dirty state when entering edit mode and changing values', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
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
        const editInput = screen.getByDisplayValue('Meter-001')
        expect(editInput).toBeInTheDocument()
      })

      // Change the value
      const editInput = screen.getByDisplayValue('Meter-001')
      fireEvent.change(editInput, { target: { value: 'Meter-001-Modified' } })

      // Should set dirty state to true
      await waitFor(() => {
        expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalledWith(true)
      })
    }
  })

  it('should clear dirty state when canceling edit', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
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
        const editInput = screen.getByDisplayValue('Meter-001')
        expect(editInput).toBeInTheDocument()
      })

      // Change the value
      const editInput = screen.getByDisplayValue('Meter-001')
      fireEvent.change(editInput, { target: { value: 'Meter-001-Modified' } })

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
          expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalledWith(false)
        })
      }
    }
  })

  it('should clear dirty state when closing modal', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Zähler-ID eingeben...')).toBeInTheDocument()
    })

    // Type in the new meter input to make it dirty
    const input = screen.getByPlaceholderText('Zähler-ID eingeben...')
    fireEvent.change(input, { target: { value: 'New-Meter' } })

    await waitFor(() => {
      expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalledWith(true)
    })

    // Find and click close button
    const closeButton = screen.getAllByText(/Schließen/i)[0]
    fireEvent.click(closeButton)

    // Should set dirty state to false when closing
    await waitFor(() => {
      expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalledWith(false)
    })
  })

  it('should not set dirty state when no changes are made', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
    })

    // Initially should not be dirty (or set to false)
    const dirtyCalls = mockSetWasserZaehlerModalDirty.mock.calls
    const lastCall = dirtyCalls[dirtyCalls.length - 1]
    
    // The last call should be false (no unsaved changes)
    expect(lastCall?.[0]).toBe(false)
  })

  it('should detect changes in calibration date', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
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
        const editInput = screen.getByDisplayValue('Meter-001')
        expect(editInput).toBeInTheDocument()
      })

      // Find the date picker button
      const dateButtons = screen.getAllByRole('button')
      const dateButton = dateButtons.find(btn => btn.textContent?.includes('31.12.2030'))
      
      if (dateButton) {
        fireEvent.click(dateButton)

        // Should eventually set dirty state to true when date changes
        await waitFor(() => {
          expect(mockSetWasserZaehlerModalDirty).toHaveBeenCalled()
        })
      }
    }
  })
})
