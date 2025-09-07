import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useMobileNavigation, useMobileNavStore } from '@/hooks/use-mobile-nav-store'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/home'),
}))

// Mock mobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => true),
}))

// Mock modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    openHouseModal: jest.fn(),
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
    openFinanceModal: jest.fn(),
    openAufgabeModal: jest.fn(),
  })),
}))

// Test component that uses the mobile navigation hook
function TestComponent() {
  const navigation = useMobileNavigation()
  
  return (
    <div>
      <div data-testid="add-menu-state">
        {navigation.isAddMenuOpen ? 'open' : 'closed'}
      </div>
      <div data-testid="more-menu-state">
        {navigation.isMoreMenuOpen ? 'open' : 'closed'}
      </div>
      <div data-testid="active-dropdown">
        {navigation.activeDropdown}
      </div>
      <button onClick={navigation.openAddMenu} data-testid="open-add">
        Open Add Menu
      </button>
      <button onClick={navigation.openMoreMenu} data-testid="open-more">
        Open More Menu
      </button>
      <button onClick={navigation.closeAllDropdowns} data-testid="close-all">
        Close All
      </button>
    </div>
  )
}

describe('Mobile Navigation State Management', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMobileNavStore.getState().closeAllDropdowns()
  })

  afterEach(() => {
    // Clean up any event listeners
    document.body.style.overflow = 'unset'
  })

  describe('useMobileNavStore', () => {
    it('should have correct initial state', () => {
      const state = useMobileNavStore.getState()
      
      expect(state.isAddMenuOpen).toBe(false)
      expect(state.isMoreMenuOpen).toBe(false)
      expect(state.activeDropdown).toBe('none')
    })

    it('should open add menu and close other menus', () => {
      const { openAddMenu, openMoreMenu } = useMobileNavStore.getState()
      
      // First open more menu
      openMoreMenu()
      expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(true)
      expect(useMobileNavStore.getState().activeDropdown).toBe('more')
      
      // Then open add menu - should close more menu
      openAddMenu()
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(false)
      expect(useMobileNavStore.getState().activeDropdown).toBe('add')
    })

    it('should open more menu and close other menus', () => {
      const { openAddMenu, openMoreMenu } = useMobileNavStore.getState()
      
      // First open add menu
      openAddMenu()
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      expect(useMobileNavStore.getState().activeDropdown).toBe('add')
      
      // Then open more menu - should close add menu
      openMoreMenu()
      expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(true)
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
      expect(useMobileNavStore.getState().activeDropdown).toBe('more')
    })

    it('should close all dropdowns', () => {
      const { openAddMenu, closeAllDropdowns } = useMobileNavStore.getState()
      
      // Open add menu
      openAddMenu()
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      expect(useMobileNavStore.getState().activeDropdown).toBe('add')
      
      // Close all
      closeAllDropdowns()
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
      expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(false)
      expect(useMobileNavStore.getState().activeDropdown).toBe('none')
    })
  })

  describe('useMobileNavigation hook', () => {
    it('should provide navigation state and actions', () => {
      render(<TestComponent />)
      
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('more-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('active-dropdown')).toHaveTextContent('none')
    })

    it('should update state when actions are called', () => {
      render(<TestComponent />)
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      expect(screen.getByTestId('active-dropdown')).toHaveTextContent('add')
      
      // Open more menu (should close add menu)
      fireEvent.click(screen.getByTestId('open-more'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('more-menu-state')).toHaveTextContent('open')
      expect(screen.getByTestId('active-dropdown')).toHaveTextContent('more')
      
      // Close all
      fireEvent.click(screen.getByTestId('close-all'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('more-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('active-dropdown')).toHaveTextContent('none')
    })

    it('should handle escape key to close dropdowns', async () => {
      render(<TestComponent />)
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      
      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
        expect(screen.getByTestId('active-dropdown')).toHaveTextContent('none')
      })
    })

    it('should handle click outside to close dropdowns', async () => {
      render(<TestComponent />)
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      
      // Click outside (simulate mousedown on document)
      fireEvent.mouseDown(document.body)
      
      await waitFor(() => {
        expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
        expect(screen.getByTestId('active-dropdown')).toHaveTextContent('none')
      })
    })

    it('should not close dropdowns when clicking on navigation elements', async () => {
      render(
        <div>
          <TestComponent />
          <div data-mobile-nav data-testid="nav-element">Nav Element</div>
          <div data-mobile-dropdown data-testid="dropdown-element">Dropdown Element</div>
        </div>
      )
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      
      // Click on navigation element - should not close
      fireEvent.mouseDown(screen.getByTestId('nav-element'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      
      // Click on dropdown element - should not close
      fireEvent.mouseDown(screen.getByTestId('dropdown-element'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
    })

    it('should prevent body scroll when dropdown is open', () => {
      render(<TestComponent />)
      
      // Initially body scroll should be normal
      expect(document.body.style.overflow).toBe('unset')
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(document.body.style.overflow).toBe('hidden')
      
      // Close menu
      fireEvent.click(screen.getByTestId('close-all'))
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Route change handling', () => {
    it('should close all dropdowns when route changes', () => {
      const mockUsePathname = require('next/navigation').usePathname
      
      render(<TestComponent />)
      
      // Open add menu
      fireEvent.click(screen.getByTestId('open-add'))
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('open')
      
      // Simulate route change
      mockUsePathname.mockReturnValue('/different-route')
      
      // Re-render component to trigger useEffect
      render(<TestComponent />)
      
      expect(screen.getByTestId('add-menu-state')).toHaveTextContent('closed')
      expect(screen.getByTestId('active-dropdown')).toHaveTextContent('none')
    })
  })

  describe('Integration with MobileBottomNav', () => {
    it('should render navigation with proper data attributes', () => {
      render(<MobileBottomNav />)
      
      // Check that navigation has proper data attribute
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('data-mobile-nav')
      
      // Check that buttons have proper data attributes
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-mobile-nav')
      })
    })

    it('should handle plus button click to open add menu', () => {
      render(<MobileBottomNav />)
      
      const plusButton = screen.getByLabelText('Open add menu')
      fireEvent.click(plusButton)
      
      // Check that add menu state is updated
      const state = useMobileNavStore.getState()
      expect(state.isAddMenuOpen).toBe(true)
      expect(state.activeDropdown).toBe('add')
    })

    it('should handle more button click to open more menu', () => {
      render(<MobileBottomNav />)
      
      const moreButton = screen.getByLabelText('Open Weitere menu')
      fireEvent.click(moreButton)
      
      // Check that more menu state is updated
      const state = useMobileNavStore.getState()
      expect(state.isMoreMenuOpen).toBe(true)
      expect(state.activeDropdown).toBe('more')
    })
  })
})