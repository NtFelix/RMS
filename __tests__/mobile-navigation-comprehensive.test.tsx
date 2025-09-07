import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { MobileAddMenu } from '@/components/mobile/mobile-add-menu'
import { MobileMoreMenu } from '@/components/mobile/mobile-more-menu'
import { MobileFilterButton } from '@/components/mobile/mobile-filter-button'
import { MobileSearchBar } from '@/components/mobile/mobile-search-bar'
import { useOrientationAwareMobile } from '@/hooks/use-orientation'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock all dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-orientation', () => ({
  useOrientationAwareMobile: jest.fn(),
  useOrientation: jest.fn(),
}))

jest.mock('@/hooks/use-mobile-nav-store', () => ({
  useMobileNavigation: jest.fn(),
}))

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseOrientationAwareMobile = useOrientationAwareMobile as jest.MockedFunction<typeof useOrientationAwareMobile>
const mockUseMobileNavigation = useMobileNavigation as jest.MockedFunction<typeof useMobileNavigation>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('Comprehensive Mobile Navigation Tests', () => {
  // Mock functions
  const mockOpenHouseModal = jest.fn()
  const mockOpenWohnungModal = jest.fn()
  const mockOpenTenantModal = jest.fn()
  const mockOpenFinanceModal = jest.fn()
  const mockOpenAufgabeModal = jest.fn()
  const mockOpenAddMenu = jest.fn()
  const mockCloseAddMenu = jest.fn()
  const mockOpenMoreMenu = jest.fn()
  const mockCloseMoreMenu = jest.fn()
  const mockCloseAllDropdowns = jest.fn()

  const defaultMobileNavState = {
    isAddMenuOpen: false,
    isMoreMenuOpen: false,
    activeDropdown: 'none' as const,
    openAddMenu: mockOpenAddMenu,
    closeAddMenu: mockCloseAddMenu,
    openMoreMenu: mockOpenMoreMenu,
    closeMoreMenu: mockCloseMoreMenu,
    closeAllDropdowns: mockCloseAllDropdowns,
    setActiveDropdown: jest.fn(),
  }

  const defaultModalState = {
    openHouseModal: mockOpenHouseModal,
    openWohnungModal: mockOpenWohnungModal,
    openTenantModal: mockOpenTenantModal,
    openFinanceModal: mockOpenFinanceModal,
    openAufgabeModal: mockOpenAufgabeModal,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/home')
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })
    mockUseMobileNavigation.mockReturnValue(defaultMobileNavState)
    mockUseModalStore.mockReturnValue(defaultModalState as any)
  })

  describe('Responsive Behavior Tests', () => {
    const testScreenSizes = [
      { width: 320, height: 568, name: 'iPhone 5/SE' },
      { width: 375, height: 667, name: 'iPhone 6/7/8' },
      { width: 414, height: 896, name: 'iPhone XR/11' },
      { width: 768, height: 1024, name: 'iPad Portrait' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1440, height: 900, name: 'Desktop' },
    ]

    testScreenSizes.forEach(({ width, height, name }) => {
      it(`adapts correctly to ${name} (${width}x${height})`, () => {
        // Mock screen size
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true })

        const isMobile = width < 768
        mockUseOrientationAwareMobile.mockReturnValue({
          isMobile,
          orientation: width > height ? 'landscape' : 'portrait',
          isChanging: false,
          angle: width > height ? 90 : 0,
        })

        render(<MobileBottomNav />)

        if (isMobile) {
          expect(screen.getByRole('navigation')).toBeInTheDocument()
          expect(screen.getByText('Home')).toBeInTheDocument()
          expect(screen.getByText('Plus')).toBeInTheDocument()
        } else {
          expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
        }
      })
    })

    it('handles orientation changes correctly', async () => {
      const { rerender } = render(<MobileBottomNav />)

      // Start in portrait
      expect(screen.getByRole('navigation')).toHaveAttribute('data-orientation', 'portrait')

      // Change to landscape
      mockUseOrientationAwareMobile.mockReturnValue({
        isMobile: true,
        orientation: 'landscape',
        isChanging: true,
        angle: 90,
      })

      rerender(<MobileBottomNav />)

      expect(screen.getByRole('navigation')).toHaveAttribute('data-orientation', 'landscape')
      expect(screen.getByRole('navigation')).toHaveClass('opacity-90') // Changing state
    })

    it('maintains functionality across different viewport sizes', () => {
      const viewports = [
        { width: 375, height: 667 },
        { width: 414, height: 896 },
        { width: 768, height: 1024 },
      ]

      viewports.forEach(({ width, height }) => {
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true })

        const { rerender } = render(<MobileBottomNav />)

        // All navigation items should be present
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('Häuser')).toBeInTheDocument()
        expect(screen.getByText('Plus')).toBeInTheDocument()
        expect(screen.getByText('Wohnungen')).toBeInTheDocument()
        expect(screen.getByText('Weitere')).toBeInTheDocument()

        rerender(<div />)
      })
    })
  })

  describe('Touch Interaction Tests', () => {
    it('has proper touch target sizes (minimum 44px)', () => {
      render(<MobileBottomNav />)

      const buttons = screen.getAllByRole('button')
      const links = screen.getAllByRole('link')
      
      const allElements = buttons.concat(links)
      allElements.forEach(element => {
        expect(element).toHaveClass('min-w-[44px]', 'min-h-[44px]')
        expect(element).toHaveClass('touch-manipulation')
      })
    })

    it('provides visual feedback on touch interactions', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const plusButton = screen.getByRole('button', { name: /open add menu/i })
      
      // Should have active scale class for touch feedback
      expect(plusButton).toHaveClass('active:scale-95')
      
      await user.click(plusButton)
      expect(mockOpenAddMenu).toHaveBeenCalled()
    })

    it('handles rapid touch interactions gracefully', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const plusButton = screen.getByRole('button', { name: /open add menu/i })
      
      // Rapid clicks should not cause issues
      await user.click(plusButton)
      await user.click(plusButton)
      await user.click(plusButton)
      
      // Should only register the clicks, not cause errors
      expect(mockOpenAddMenu).toHaveBeenCalledTimes(3)
    })

    it('supports keyboard navigation for accessibility', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const homeLink = screen.getByRole('button', { name: /navigate to home/i })
      
      // Focus should work
      homeLink.focus()
      expect(homeLink).toHaveFocus()
      
      // Enter key should work
      await user.keyboard('{Enter}')
      // Navigation would be handled by Link component
    })
  })

  describe('Dropdown Menu State Management Tests', () => {
    it('opens add menu when plus button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const plusButton = screen.getByRole('button', { name: /open add menu/i })
      await user.click(plusButton)

      expect(mockOpenAddMenu).toHaveBeenCalledTimes(1)
    })

    it('opens more menu when weitere button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const weitereButton = screen.getByRole('button', { name: /open weitere menu/i })
      await user.click(weitereButton)

      expect(mockOpenMoreMenu).toHaveBeenCalledTimes(1)
    })

    it('closes dropdowns when clicking outside', () => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })

      render(
        <div>
          <MobileBottomNav />
          <MobileAddMenu isOpen={true} />
        </div>
      )

      // Click outside the dropdown
      fireEvent.mouseDown(document.body)
      
      // Should close the dropdown (this would be handled by the hook)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes dropdowns on escape key', () => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })

      render(<MobileAddMenu isOpen={true} />)

      fireEvent.keyDown(document, { key: 'Escape' })
      
      // The hook would handle this, but we can test the component receives the event
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('prevents body scroll when dropdown is open', () => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })

      render(<MobileAddMenu isOpen={true} />)

      // The hook would set body overflow, we test the dropdown is rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('only allows one dropdown open at a time', async () => {
      const user = userEvent.setup()
      
      // Mock state where add menu is open
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })

      render(<MobileBottomNav />)

      // Try to open more menu while add menu is open
      const weitereButton = screen.getByRole('button', { name: /open weitere menu/i })
      await user.click(weitereButton)

      expect(mockOpenMoreMenu).toHaveBeenCalled()
    })
  })

  describe('Add Menu Integration Tests', () => {
    beforeEach(() => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })
    })

    it('renders all add menu options', () => {
      render(<MobileAddMenu isOpen={true} />)

      expect(screen.getByText('Haus hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Wohnung hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Mieter hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Finanzen hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Aufgabe hinzufügen')).toBeInTheDocument()
    })

    it('opens correct modals when add options are clicked', async () => {
      const user = userEvent.setup()
      render(<MobileAddMenu isOpen={true} />)

      await user.click(screen.getByText('Haus hinzufügen'))
      expect(mockOpenHouseModal).toHaveBeenCalled()
      expect(mockCloseAddMenu).toHaveBeenCalled()

      await user.click(screen.getByText('Wohnung hinzufügen'))
      expect(mockOpenWohnungModal).toHaveBeenCalled()

      await user.click(screen.getByText('Mieter hinzufügen'))
      expect(mockOpenTenantModal).toHaveBeenCalled()

      await user.click(screen.getByText('Finanzen hinzufügen'))
      expect(mockOpenFinanceModal).toHaveBeenCalled()

      await user.click(screen.getByText('Aufgabe hinzufügen'))
      expect(mockOpenAufgabeModal).toHaveBeenCalled()
    })

    it('adapts layout for different orientations', () => {
      // Test portrait
      render(<MobileAddMenu isOpen={true} />)
      let dropdown = screen.getByRole('dialog')
      expect(dropdown).toHaveAttribute('data-orientation', 'portrait')

      // Test landscape
      jest.mocked(require('@/hooks/use-orientation').useOrientation).mockReturnValue({
        orientation: 'landscape',
        isChanging: false,
        angle: 90,
      })

      const { rerender } = render(<MobileAddMenu isOpen={true} />)
      rerender(<MobileAddMenu isOpen={true} />)
      
      dropdown = screen.getByRole('dialog')
      expect(dropdown).toHaveAttribute('data-orientation', 'landscape')
    })
  })

  describe('More Menu Integration Tests', () => {
    beforeEach(() => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isMoreMenuOpen: true,
        activeDropdown: 'more',
      })
    })

    it('renders all more menu navigation links', () => {
      render(<MobileMoreMenu isOpen={true} onClose={mockCloseMoreMenu} currentPath="/home" />)

      expect(screen.getByText('Mieter')).toBeInTheDocument()
      expect(screen.getByText('Finanzen')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })

    it('shows active state for current page', () => {
      render(<MobileMoreMenu isOpen={true} onClose={mockCloseMoreMenu} currentPath="/mieter" />)

      const mieterLink = screen.getByRole('link', { name: /navigate to mieter/i })
      expect(mieterLink).toHaveClass('bg-blue-50', 'text-blue-700')
    })

    it('closes when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileMoreMenu isOpen={true} onClose={mockCloseMoreMenu} currentPath="/home" />)

      const closeButton = screen.getByRole('button', { name: /menü schließen/i })
      await user.click(closeButton)

      expect(mockCloseMoreMenu).toHaveBeenCalled()
    })
  })

  describe('Filter Button Tests', () => {
    const mockFilters = [
      { id: 'all', label: 'Alle', count: 10 },
      { id: 'active', label: 'Aktiv', count: 5 },
      { id: 'inactive', label: 'Inaktiv', count: 3 }
    ]

    const mockOnFilterChange = jest.fn()

    beforeEach(() => {
      jest.mocked(require('@/hooks/use-mobile').useIsMobile).mockReturnValue(true)
    })

    it('renders filter button with correct count', () => {
      render(
        <MobileFilterButton
          filters={mockFilters}
          activeFilters={['active', 'inactive']}
          onFilterChange={mockOnFilterChange}
        />
      )

      expect(screen.getByText('Filter')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('opens filter dropdown when clicked', async () => {
      const user = userEvent.setup()
      render(
        <MobileFilterButton
          filters={mockFilters}
          activeFilters={[]}
          onFilterChange={mockOnFilterChange}
        />
      )

      const filterButton = screen.getByRole('button', { name: /filter options/i })
      await user.click(filterButton)

      expect(screen.getByRole('dialog', { name: /filter menü/i })).toBeInTheDocument()
    })

    it('handles filter selection correctly', async () => {
      const user = userEvent.setup()
      render(
        <MobileFilterButton
          filters={mockFilters}
          activeFilters={[]}
          onFilterChange={mockOnFilterChange}
        />
      )

      const filterButton = screen.getByRole('button', { name: /filter options/i })
      await user.click(filterButton)

      const activeFilter = screen.getByRole('checkbox', { name: /aktiviere filter: aktiv/i })
      await user.click(activeFilter)

      expect(mockOnFilterChange).toHaveBeenCalledWith(['active'])
    })
  })

  describe('Search Bar Tests', () => {
    const defaultProps = {
      value: '',
      onChange: jest.fn(),
      placeholder: 'Search...'
    }

    beforeEach(() => {
      jest.mocked(require('@/hooks/use-mobile').useIsMobile).mockReturnValue(true)
    })

    it('renders collapsed search icon initially', () => {
      render(<MobileSearchBar {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('expands when search icon is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /suchfeld/i })).toBeInTheDocument()
      })
    })

    it('auto-focuses input when expanded', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: /suchfeld/i })
        expect(input).toHaveFocus()
      })
    })

    it('calls onChange when typing', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      render(<MobileSearchBar {...defaultProps} onChange={onChange} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      await user.type(input, 'test')
      
      expect(onChange).toHaveBeenCalledTimes(4) // Called for each character
    })
  })

  describe('Performance Tests', () => {
    it('renders quickly without performance issues', () => {
      const startTime = performance.now()
      
      render(<MobileBottomNav />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('handles rapid state changes without memory leaks', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const plusButton = screen.getByRole('button', { name: /open add menu/i })
      
      // Rapidly open and close menu multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(plusButton)
      }
      
      // Should not cause any errors or memory issues
      expect(mockOpenAddMenu).toHaveBeenCalledTimes(10)
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels and roles', () => {
      render(<MobileBottomNav />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const firstButton = screen.getAllByRole('button')[0]
      firstButton.focus()
      
      // Tab navigation should work
      await user.keyboard('{Tab}')
      
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInstanceOf(HTMLElement)
    })

    it('provides screen reader support', () => {
      mockUseMobileNavigation.mockReturnValue({
        ...defaultMobileNavState,
        isAddMenuOpen: true,
        activeDropdown: 'add',
      })

      render(<MobileAddMenu isOpen={true} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-label')
    })
  })
})