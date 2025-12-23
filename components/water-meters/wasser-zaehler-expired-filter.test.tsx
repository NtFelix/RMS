import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WasserZaehlerModal } from '@/components/water-meters/wasser-zaehler-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock fetch
global.fetch = jest.fn()

describe('WasserZaehlerModal - Expired Meters Filter', () => {
  const mockWasserZaehlerModalData = {
    wohnungId: 'test-wohnung-id',
    wohnungName: 'Test Wohnung',
  }

  const mockActiveMeters = [
    {
      id: '1',
      custom_id: 'Active-001',
      wohnung_id: 'test-wohnung-id',
      erstellungsdatum: '2024-01-01',
      eichungsdatum: '2030-12-31', // Future date - active
    },
    {
      id: '2',
      custom_id: 'Active-002',
      wohnung_id: 'test-wohnung-id',
      erstellungsdatum: '2024-01-01',
      eichungsdatum: '2028-06-15', // Future date - active
    },
  ]

  const mockExpiredMeters = [
    {
      id: '3',
      custom_id: 'Expired-001',
      wohnung_id: 'test-wohnung-id',
      erstellungsdatum: '2020-01-01',
      eichungsdatum: '2023-12-31', // Past date - expired
    },
    {
      id: '4',
      custom_id: 'Expired-002',
      wohnung_id: 'test-wohnung-id',
      erstellungsdatum: '2019-01-01',
      eichungsdatum: '2022-06-15', // Past date - expired
    },
  ]

  const allMeters = [...mockActiveMeters, ...mockExpiredMeters]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isWasserZaehlerModalOpen: true,
      wasserZaehlerModalData: mockWasserZaehlerModalData,
      closeWasserZaehlerModal: jest.fn(),
      setWasserZaehlerModalDirty: jest.fn(),
      openWasserAblesenModal: jest.fn(),
    } as any)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => allMeters,
    })
  })

  it('should initially show only active meters and hide expired ones', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
      expect(screen.getByText('Active-002')).toBeInTheDocument()
    })

    // Expired meters should not be visible initially
    expect(screen.queryByText('Expired-001')).not.toBeInTheDocument()
    expect(screen.queryByText('Expired-002')).not.toBeInTheDocument()
  })

  it('should show button with archive icon to display expired meters with count', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Button should show count of expired meters
    const showButton = screen.getByText(/Alte Wasserzähler anzeigen \(2\)/)
    expect(showButton).toBeInTheDocument()
    
    // Button should have archive icon (check for Archive component in button)
    const buttonElement = showButton.closest('button')
    expect(buttonElement).toBeInTheDocument()
  })

  it('should display expired meters below the button when clicked', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Click the show button
    const showButton = screen.getByText(/Alte Wasserzähler anzeigen/)
    fireEvent.click(showButton)

    // Now expired meters should be visible below the button
    await waitFor(() => {
      expect(screen.getByText('Expired-001')).toBeInTheDocument()
      expect(screen.getByText('Expired-002')).toBeInTheDocument()
    })

    // Active meters should still be visible above
    expect(screen.getByText('Active-001')).toBeInTheDocument()
    expect(screen.getByText('Active-002')).toBeInTheDocument()
  })

  it('should toggle button text when expired meters are displayed', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Click the show button
    const showButton = screen.getByText(/Alte Wasserzähler anzeigen/)
    fireEvent.click(showButton)

    // Button text should change to hide
    await waitFor(() => {
      const hideButton = screen.getByText(/Alte Wasserzähler ausblenden \(2\)/)
      expect(hideButton).toBeInTheDocument()
    })
  })

  it('should hide expired meters when hide button is clicked', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Show expired meters
    const showButton = screen.getByText(/Alte Wasserzähler anzeigen/)
    fireEvent.click(showButton)

    await waitFor(() => {
      expect(screen.getByText('Expired-001')).toBeInTheDocument()
    })

    // Hide expired meters
    const hideButton = screen.getByText(/Alte Wasserzähler ausblenden/)
    fireEvent.click(hideButton)

    // Expired meters should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('Expired-001')).not.toBeInTheDocument()
      expect(screen.queryByText('Expired-002')).not.toBeInTheDocument()
    })

    // Active meters should still be visible
    expect(screen.getByText('Active-001')).toBeInTheDocument()
    expect(screen.getByText('Active-002')).toBeInTheDocument()
  })

  it('should show "Abgelaufen" badge on expired meters when displayed', async () => {
    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Show expired meters
    const showButton = screen.getByText(/Alte Wasserzähler anzeigen/)
    fireEvent.click(showButton)

    await waitFor(() => {
      expect(screen.getByText('Expired-001')).toBeInTheDocument()
    })

    // Check for expired badges (should be 2)
    const expiredBadges = screen.getAllByText('Abgelaufen')
    expect(expiredBadges).toHaveLength(2)
  })

  it('should not show toggle button when there are no expired meters', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockActiveMeters, // Only active meters
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
    })

    // Button should not be present
    expect(screen.queryByText(/Alte Wasserzähler anzeigen/)).not.toBeInTheDocument()
  })

  it('should correctly identify meters with null eichungsdatum as not expired', async () => {
    const metersWithNull = [
      ...mockActiveMeters,
      {
        id: '5',
        custom_id: 'No-Date',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: null, // No calibration date
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => metersWithNull,
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Active-001')).toBeInTheDocument()
      expect(screen.getByText('No-Date')).toBeInTheDocument()
    })

    // Meter with null date should be visible (not considered expired)
    expect(screen.getByText('No-Date')).toBeInTheDocument()
    
    // Should not show toggle button since no expired meters
    expect(screen.queryByText(/Alte Wasserzähler anzeigen/)).not.toBeInTheDocument()
  })
})
