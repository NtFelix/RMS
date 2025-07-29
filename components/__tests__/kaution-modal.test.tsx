import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KautionModal } from '../kaution-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { Tenant, KautionData } from '@/types/Tenant'
import { format } from 'date-fns'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('KautionModal', () => {
  const mockTenant: Tenant = {
    id: '1',
    name: 'Test Tenant',
    wohnung_id: 'wohnung-1',
  }

  const mockExistingKaution: KautionData = {
    amount: 1500,
    paymentDate: '2024-01-15',
    status: 'Erhalten',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  }

  const mockServerAction = jest.fn()

  // Helper function to get the default modal store mock
  const getDefaultModalStore = () => ({
    isKautionModalOpen: false,
    kautionInitialData: undefined,
    isKautionModalDirty: false,
    closeKautionModal: jest.fn(),
    setKautionModalDirty: jest.fn(),
    // Add other required properties with default values
    isTenantModalOpen: false,
    tenantInitialData: undefined,
    tenantModalWohnungen: [],
    isTenantModalDirty: false,
    openTenantModal: jest.fn(),
    closeTenantModal: jest.fn(),
    setTenantModalDirty: jest.fn(),
    isHouseModalOpen: false,
    houseInitialData: undefined,
    houseModalOnSuccess: undefined,
    isHouseModalDirty: false,
    openHouseModal: jest.fn(),
    closeHouseModal: jest.fn(),
    setHouseModalDirty: jest.fn(),
    isFinanceModalOpen: false,
    financeInitialData: undefined,
    financeModalWohnungen: [],
    financeModalOnSuccess: undefined,
    isFinanceModalDirty: false,
    openFinanceModal: jest.fn(),
    closeFinanceModal: jest.fn(),
    setFinanceModalDirty: jest.fn(),
    isWohnungModalOpen: false,
    wohnungInitialData: undefined,
    wohnungModalHaeuser: [],
    wohnungModalOnSuccess: undefined,
    wohnungApartmentCount: undefined,
    wohnungApartmentLimit: undefined,
    wohnungIsActiveSubscription: undefined,
    isWohnungModalDirty: false,
    openWohnungModal: jest.fn(),
    closeWohnungModal: jest.fn(),
    setWohnungModalDirty: jest.fn(),
    isAufgabeModalOpen: false,
    aufgabeInitialData: undefined,
    aufgabeModalOnSuccess: undefined,
    isAufgabeModalDirty: false,
    openAufgabeModal: jest.fn(),
    closeAufgabeModal: jest.fn(),
    setAufgabeModalDirty: jest.fn(),
    isBetriebskostenModalOpen: false,
    betriebskostenInitialData: undefined,
    betriebskostenModalHaeuser: [],
    betriebskostenModalOnSuccess: undefined,
    isBetriebskostenModalDirty: false,
    openBetriebskostenModal: jest.fn(),
    closeBetriebskostenModal: jest.fn(),
    setBetriebskostenModalDirty: jest.fn(),
    isWasserzaehlerModalOpen: false,
    wasserzaehlerNebenkosten: undefined,
    wasserzaehlerMieterList: [],
    wasserzaehlerExistingReadings: undefined,
    wasserzaehlerOnSave: undefined,
    isWasserzaehlerModalDirty: false,
    openWasserzaehlerModal: jest.fn(),
    closeWasserzaehlerModal: jest.fn(),
    setWasserzaehlerModalDirty: jest.fn(),
    openKautionModal: jest.fn(),
    isConfirmationModalOpen: false,
    confirmationModalConfig: null,
    openConfirmationModal: jest.fn(),
    closeConfirmationModal: jest.fn(),
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock fetch to return empty response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    })
    
    // Set default mock implementation
    mockUseModalStore.mockReturnValue(getDefaultModalStore())
  })

  it('should not render when modal is closed', () => {
    render(<KautionModal serverAction={mockServerAction} />)
    expect(screen.queryByText('Kaution verwalten')).not.toBeInTheDocument()
  })

  it('should render modal for new kaution', () => {
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    expect(screen.getByText('Kaution hinzufügen')).toBeInTheDocument()
    expect(screen.getByText(`Kaution für ${mockTenant.name} verwalten`)).toBeInTheDocument()
  })

  it('should render modal for existing kaution', () => {
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
        existingKaution: mockExistingKaution,
      },
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    expect(screen.getByText('Kaution bearbeiten')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument()
  })

  it('should validate required amount field', async () => {
    const mockSetKautionModalDirty = jest.fn()
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Betrag ist erforderlich')).toBeInTheDocument()
    })
  })

  it('should validate positive amount', async () => {
    const mockSetKautionModalDirty = jest.fn()
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    const amountInput = screen.getByLabelText(/Betrag/)
    fireEvent.change(amountInput, { target: { value: '-100' } })
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Betrag muss eine positive Zahl sein')).toBeInTheDocument()
    })
  })

  it('should call server action on valid form submission', async () => {
    const mockSetKautionModalDirty = jest.fn()
    const mockCloseKautionModal = jest.fn()
    
    mockServerAction.mockResolvedValue({ success: true })
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
      closeKautionModal: mockCloseKautionModal,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    const amountInput = screen.getByLabelText(/Betrag/)
    fireEvent.change(amountInput, { target: { value: '1500' } })
    
    // Select a status
    const statusSelect = screen.getByRole('combobox', { name: /Status/i });
    fireEvent.mouseDown(statusSelect);
    const statusOption = await screen.findByText('Erhalten');
    fireEvent.click(statusOption);
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockServerAction).toHaveBeenCalledWith(expect.any(FormData))
    }, { timeout: 3000 })
  })

  it('should handle date selection', async () => {
    const mockSetKautionModalDirty = jest.fn()
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    // Find and click the date picker
    const datePicker = screen.getByLabelText('Zahlungsdatum')
    fireEvent.click(datePicker)
    
    // Select today's date
    const today = new Date()
    const dateButton = screen.getByText(today.getDate().toString())
    fireEvent.click(dateButton)
    
    // Verify the date was set
    expect(mockSetKautionModalDirty).toHaveBeenCalled()
  })

  it('should show dirty state when form is modified', async () => {
    const mockSetKautionModalDirty = jest.fn()
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    // Change the amount
    const amountInput = screen.getByLabelText(/Betrag/)
    fireEvent.change(amountInput, { target: { value: '2000' } })
    
    // Verify dirty state was set
    expect(mockSetKautionModalDirty).toHaveBeenCalledWith(true)
  })

  it('should load existing kaution data when editing', async () => {
    const mockCloseKautionModal = jest.fn()
    const mockSetKautionModalDirty = jest.fn()
    
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: mockTenant,
        existingKaution: mockExistingKaution,
      },
      closeKautionModal: mockCloseKautionModal,
      setKautionModalDirty: mockSetKautionModalDirty,
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    // Check if form is populated with existing data
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument()
    expect(screen.getAllByText('Erhalten')[0]).toBeInTheDocument()
  })

  it('should suggest amount when creating new kaution', async () => {
    // Mock the fetch response for rent data
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ miete: 500 }),
    })

    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant: { ...mockTenant, wohnung_id: 'wohnung-1' },
      },
    })

    render(<KautionModal serverAction={mockServerAction} />)
    
    // Wait for the suggested amount to be loaded
    await waitFor(() => {
      expect(screen.getByText(/Vorschlag: 1.500,00 €/)).toBeInTheDocument()
    })
  })
})