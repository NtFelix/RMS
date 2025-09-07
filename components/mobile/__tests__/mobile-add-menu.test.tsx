import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileAddMenu } from '../mobile-add-menu'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the modal functions
const mockOpenHouseModal = jest.fn()
const mockOpenWohnungModal = jest.fn()
const mockOpenTenantModal = jest.fn()
const mockOpenFinanceModal = jest.fn()
const mockOpenAufgabeModal = jest.fn()

describe('MobileAddMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue({
      openHouseModal: mockOpenHouseModal,
      openWohnungModal: mockOpenWohnungModal,
      openTenantModal: mockOpenTenantModal,
      openFinanceModal: mockOpenFinanceModal,
      openAufgabeModal: mockOpenAufgabeModal,
    } as any)
  })

  it('renders when open', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('Hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Haus hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Wohnung hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Mieter hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Finanzen hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Aufgabe hinzufügen')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('Hinzufügen')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText('Menü schließen')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('opens house modal when house option is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const houseButton = screen.getByText('Haus hinzufügen')
    fireEvent.click(houseButton)
    
    expect(mockOpenHouseModal).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('opens apartment modal when apartment option is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const apartmentButton = screen.getByText('Wohnung hinzufügen')
    fireEvent.click(apartmentButton)
    
    expect(mockOpenWohnungModal).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('opens tenant modal when tenant option is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const tenantButton = screen.getByText('Mieter hinzufügen')
    fireEvent.click(tenantButton)
    
    expect(mockOpenTenantModal).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('opens finance modal when finance option is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const financeButton = screen.getByText('Finanzen hinzufügen')
    fireEvent.click(financeButton)
    
    expect(mockOpenFinanceModal).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('opens task modal when task option is clicked', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    const taskButton = screen.getByText('Aufgabe hinzufügen')
    fireEvent.click(taskButton)
    
    expect(mockOpenAufgabeModal).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('handles escape key to close menu', () => {
    const mockOnClose = jest.fn()
    render(<MobileAddMenu isOpen={true} onClose={mockOnClose} />)
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})