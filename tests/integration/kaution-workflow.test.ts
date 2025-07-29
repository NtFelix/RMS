import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KautionModal } from '@/components/kaution-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { Tenant } from '@/types/Tenant'

// Mock the server action
jest.mock('@/app/mieter-actions', () => ({
  updateKautionAction: jest.fn(),
}))

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Kaution Workflow', () => {
  const mockTenant: Tenant = {
    id: '1',
    name: 'Test Tenant',
    wohnung_id: 'wohnung-1',
  }

  const mockExistingKaution = {
    amount: 1500,
    paymentDate: '2024-01-15',
    status: 'Erhalten' as const,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  }

  const mockServerAction = jest.fn()

  // Helper function to get the default modal store mock
  const getDefaultModalStore = () => ({
    isKautionModalOpen: true,
    kautionInitialData: {
      tenant: mockTenant,
    },
    isKautionModalDirty: false,
    closeKautionModal: jest.fn(),
    setKautionModalDirty: jest.fn(),
    // Add other required store methods
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
    
    // Mock fetch to return rent data
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ miete: 500 }),
    })
    
    // Mock server action success
    mockServerAction.mockResolvedValue({ success: true })
    
    // Set default mock implementation
    mockUseModalStore.mockReturnValue(getDefaultModalStore())
  })

  it('should complete the kaution workflow for a new deposit', async () => {
    // Render the modal
    render(<KautionModal />)
    
    // Check that the modal is open
    expect(screen.getByText('Kaution hinzufügen')).toBeInTheDocument()
    
    // Wait for the suggested amount to load
    await waitFor(() => {
      expect(screen.getByText(/Vorschlag:/)).toBeInTheDocument()
    })
    
    // Verify the amount field is pre-filled with the suggested amount
    const amountInput = screen.getByLabelText(/Betrag/) as HTMLInputElement
    expect(amountInput.value).toBe('1500')
    
    // Select a status
    const statusSelect = screen.getByText('Status auswählen')
    await userEvent.click(statusSelect)
    await userEvent.click(screen.getByText('Erhalten'))
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Speichern/ })
    await userEvent.click(submitButton)
    
    // Verify the server action was called with the correct data
    await waitFor(() => {
      expect(require('@/app/mieter-actions').updateKautionAction).toHaveBeenCalled()
    })
  })

  it('should handle editing an existing kaution', async () => {
    // Mock the modal store with existing kaution data
    mockUseModalStore.mockReturnValue({
      ...getDefaultModalStore(),
      kautionInitialData: {
        tenant: mockTenant,
        existingKaution: mockExistingKaution,
      },
    })

    render(<KautionModal />)
    
    // Check that the modal is in edit mode
    expect(screen.getByText('Kaution bearbeiten')).toBeInTheDocument()
    
    // Verify existing data is loaded
    const amountInput = screen.getByLabelText(/Betrag/) as HTMLInputElement
    expect(amountInput.value).toBe('1500')
    expect(screen.getByText('Erhalten')).toBeInTheDocument()
    
    // Change the amount
    fireEvent.change(amountInput, { target: { value: '2000' } })
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Speichern/ })
    await userEvent.click(submitButton)
    
    // Verify the server action was called with the updated data
    await waitFor(() => {
      expect(require('@/app/mieter-actions').updateKautionAction).toHaveBeenCalledWith(expect.any(FormData))
    })
  })

  it('should handle missing rent data for suggestion', async () => {
    // Mock fetch to return no rent data
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<KautionModal />)
    
    // Verify no suggestion is shown
    await waitFor(() => {
      expect(screen.queryByText(/Vorschlag:/)).not.toBeInTheDocument()
    })
  })

  it('should handle server errors when saving', async () => {
    // Mock server action to return an error
    const errorMessage = 'Database error'
    mockServerAction.mockResolvedValueOnce({ 
      success: false, 
      error: { message: errorMessage } 
    })

    render(<KautionModal />)
    
    // Fill in required fields
    const amountInput = screen.getByLabelText(/Betrag/)
    fireEvent.change(amountInput, { target: { value: '1500' } })
    
    const statusSelect = screen.getByText('Status auswählen')
    await userEvent.click(statusSelect)
    await userEvent.click(screen.getByText('Erhalten'))
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Speichern/ })
    await userEvent.click(submitButton)
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Speichern/)).toBeInTheDocument()
    })
  })
})
