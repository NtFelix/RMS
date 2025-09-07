import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '../mobile-bottom-nav'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the modal functions
const mockOpenHouseModal = jest.fn()
const mockOpenWohnungModal = jest.fn()
const mockOpenTenantModal = jest.fn()
const mockOpenFinanceModal = jest.fn()
const mockOpenAufgabeModal = jest.fn()

describe('MobileBottomNav Integration with MobileAddMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/home')
    mockUseIsMobile.mockReturnValue(true)
    mockUseModalStore.mockReturnValue({
      openHouseModal: mockOpenHouseModal,
      openWohnungModal: mockOpenWohnungModal,
      openTenantModal: mockOpenTenantModal,
      openFinanceModal: mockOpenFinanceModal,
      openAufgabeModal: mockOpenAufgabeModal,
    } as any)
  })

  it('renders mobile navigation on mobile devices', () => {
    render(<MobileBottomNav />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Weitere')).toBeInTheDocument()
  })

  it('does not render on desktop', () => {
    mockUseIsMobile.mockReturnValue(false)
    render(<MobileBottomNav />)
    
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('opens add menu when plus button is clicked', () => {
    render(<MobileBottomNav />)
    
    const plusButton = screen.getByLabelText('Open add menu')
    fireEvent.click(plusButton)
    
    // Check if add menu is now visible
    expect(screen.getByText('Hinzufügen')).toBeInTheDocument()
    expect(screen.getByText('Haus hinzufügen')).toBeInTheDocument()
  })

  it('closes add menu when close button is clicked', () => {
    render(<MobileBottomNav />)
    
    // Open the menu
    const plusButton = screen.getByLabelText('Open add menu')
    fireEvent.click(plusButton)
    
    // Verify menu is open
    expect(screen.getByText('Hinzufügen')).toBeInTheDocument()
    
    // Close the menu
    const closeButton = screen.getByLabelText('Menü schließen')
    fireEvent.click(closeButton)
    
    // Verify menu is closed
    expect(screen.queryByText('Hinzufügen')).not.toBeInTheDocument()
  })

  it('opens house modal from add menu and closes menu', () => {
    render(<MobileBottomNav />)
    
    // Open the add menu
    const plusButton = screen.getByLabelText('Open add menu')
    fireEvent.click(plusButton)
    
    // Click on house option
    const houseButton = screen.getByText('Haus hinzufügen')
    fireEvent.click(houseButton)
    
    // Verify modal was opened and menu was closed
    expect(mockOpenHouseModal).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Hinzufügen')).not.toBeInTheDocument()
  })

  it('shows active state for current page', () => {
    mockUsePathname.mockReturnValue('/haeuser')
    render(<MobileBottomNav />)
    
    const haeuserLink = screen.getByLabelText('Navigate to Häuser')
    expect(haeuserLink).toHaveClass('text-blue-600', 'bg-blue-50')
  })
})