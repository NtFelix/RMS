import { render, screen, waitFor } from '@testing-library/react'
import { WasserZaehlerModal } from '@/components/water-meters/wasser-zaehler-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock fetch
global.fetch = jest.fn()

describe('WasserZaehlerModal - Latest Reading Display', () => {
  const mockWasserZaehlerModalData = {
    wohnungId: 'test-wohnung-id',
    wohnungName: 'Test Wohnung',
  }

  const mockSetWasserZaehlerModalDirty = jest.fn()
  const mockCloseWasserZaehlerModal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isWasserZaehlerModalOpen: true,
      wasserZaehlerModalData: mockWasserZaehlerModalData,
      closeWasserZaehlerModal: mockCloseWasserZaehlerModal,
      setWasserZaehlerModalDirty: mockSetWasserZaehlerModalDirty,
      openAblesungenModal: jest.fn(),
    } as any)
  })

  it('should display latest reading data when available', async () => {
    const mockMetersWithReadings = [
      {
        id: '1',
        custom_id: 'Meter-001',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: {
          ablese_datum: '2024-11-01',
          zaehlerstand: 123.45,
          verbrauch: 15.5,
        },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMetersWithReadings,
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
    })

    // Check that the latest reading data is displayed
    await waitFor(() => {
      expect(screen.getByText('123.45 m³')).toBeInTheDocument()
      expect(screen.getByText('01.11.2024')).toBeInTheDocument()
    })

    // Should not show placeholder text
    expect(screen.queryByText('Noch nicht erfasst')).not.toBeInTheDocument()
    expect(screen.queryByText('Noch keine Ablesung')).not.toBeInTheDocument()
  })

  it('should display placeholder when no reading is available', async () => {
    const mockMetersWithoutReadings = [
      {
        id: '1',
        custom_id: 'Meter-001',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: null,
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMetersWithoutReadings,
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
    })

    // Check that placeholder text is displayed
    await waitFor(() => {
      expect(screen.getByText('Noch nicht erfasst')).toBeInTheDocument()
      expect(screen.getByText('Noch keine Ablesung')).toBeInTheDocument()
    })
  })

  it('should display latest reading for multiple meters', async () => {
    const mockMultipleMeters = [
      {
        id: '1',
        custom_id: 'Meter-001',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: {
          ablese_datum: '2024-11-01',
          zaehlerstand: 123.45,
          verbrauch: 15.5,
        },
      },
      {
        id: '2',
        custom_id: 'Meter-002',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: {
          ablese_datum: '2024-10-15',
          zaehlerstand: 456.78,
          verbrauch: 22.3,
        },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMultipleMeters,
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-001')).toBeInTheDocument()
      expect(screen.getByText('Meter-002')).toBeInTheDocument()
    })

    // Check that both readings are displayed
    await waitFor(() => {
      expect(screen.getByText('123.45 m³')).toBeInTheDocument()
      expect(screen.getByText('456.78 m³')).toBeInTheDocument()
      expect(screen.getByText('01.11.2024')).toBeInTheDocument()
      expect(screen.getByText('15.10.2024')).toBeInTheDocument()
    })
  })

  it('should display latest reading for expired meters when shown', async () => {
    const mockExpiredMeterWithReading = [
      {
        id: '1',
        custom_id: 'Expired-Meter',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2020-01-01',
        eichungsdatum: '2023-12-31', // Expired
        latest_reading: {
          ablese_datum: '2024-11-01',
          zaehlerstand: 999.99,
          verbrauch: 50.0,
        },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockExpiredMeterWithReading,
    })

    render(<WasserZaehlerModal />)

    // Initially expired meter should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Expired-Meter')).not.toBeInTheDocument()
    })

    // Click to show expired meters
    const showButton = await screen.findByText(/Alte Wasserzähler anzeigen/)
    showButton.click()

    // Now expired meter should be visible with its reading
    await waitFor(() => {
      expect(screen.getByText('Expired-Meter')).toBeInTheDocument()
      expect(screen.getByText('999.99 m³')).toBeInTheDocument()
      expect(screen.getByText('01.11.2024')).toBeInTheDocument()
    })
  })

  it('should handle mixed meters with and without readings', async () => {
    const mockMixedMeters = [
      {
        id: '1',
        custom_id: 'Meter-With-Reading',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: {
          ablese_datum: '2024-11-01',
          zaehlerstand: 123.45,
          verbrauch: 15.5,
        },
      },
      {
        id: '2',
        custom_id: 'Meter-Without-Reading',
        wohnung_id: 'test-wohnung-id',
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2030-12-31',
        latest_reading: null,
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMixedMeters,
    })

    render(<WasserZaehlerModal />)

    await waitFor(() => {
      expect(screen.getByText('Meter-With-Reading')).toBeInTheDocument()
      expect(screen.getByText('Meter-Without-Reading')).toBeInTheDocument()
    })

    // Check that one has reading and one has placeholder
    await waitFor(() => {
      expect(screen.getByText('123.45 m³')).toBeInTheDocument()
      expect(screen.getByText('01.11.2024')).toBeInTheDocument()
      expect(screen.getByText('Noch nicht erfasst')).toBeInTheDocument()
      expect(screen.getByText('Noch keine Ablesung')).toBeInTheDocument()
    })
  })
})
