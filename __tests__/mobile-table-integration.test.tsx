import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseTable } from '@/components/house-table'
import { ApartmentTable } from '@/components/apartment-table'
import { TenantTable } from '@/components/tenant-table'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock dependencies
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openHouseModal: jest.fn(),
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
  }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  })
}))

const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('Mobile Table Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('HouseTable Mobile Integration', () => {
    const mockHouses = [
      {
        id: '1',
        name: 'Test House 1',
        address: 'Test Address 1',
        city: 'Test City',
        postalCode: '12345',
        country: 'Germany',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      {
        id: '2',
        name: 'Test House 2',
        address: 'Test Address 2',
        city: 'Test City 2',
        postalCode: '54321',
        country: 'Germany',
        createdAt: '2023-01-02',
        updatedAt: '2023-01-02',
      },
    ]

    it('renders desktop layout when not mobile', () => {
      mockUseIsMobile.mockReturnValue(false)
      
      render(<HouseTable houses={mockHouses} />)
      
      // Should show desktop filter tags
      expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
      
      // Should show desktop search input
      const searchInput = screen.getByPlaceholderText(/haus suchen/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput.parentElement).not.toHaveClass('md:hidden')
    })

    it('renders mobile layout when on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<HouseTable houses={mockHouses} />)
      
      // Should show mobile filter button
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      
      // Should show mobile search bar (collapsed initially)
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
    })

    it('handles mobile filter interactions', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(<HouseTable houses={mockHouses} />)
      
      const filterButton = screen.getByRole('button', { name: /filter options/i })
      await user.click(filterButton)
      
      // Should open filter dropdown
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /filter menü/i })).toBeInTheDocument()
      })
    })

    it('handles mobile search interactions', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(<HouseTable houses={mockHouses} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Should expand search input
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /suchfeld/i })).toBeInTheDocument()
      })
    })

    it('maintains table functionality on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<HouseTable houses={mockHouses} />)
      
      // Should still render table data
      expect(screen.getByText('Test House 1')).toBeInTheDocument()
      expect(screen.getByText('Test House 2')).toBeInTheDocument()
    })

    it('adapts to screen size changes', () => {
      const { rerender } = render(<HouseTable houses={mockHouses} />)
      
      // Start desktop
      mockUseIsMobile.mockReturnValue(false)
      rerender(<HouseTable houses={mockHouses} />)
      
      expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
      
      // Switch to mobile
      mockUseIsMobile.mockReturnValue(true)
      rerender(<HouseTable houses={mockHouses} />)
      
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
    })
  })

  describe('ApartmentTable Mobile Integration', () => {
    const mockApartments = [
      {
        id: '1',
        name: 'Apartment 1',
        houseId: 'house1',
        houseName: 'Test House',
        floor: 1,
        rooms: 3,
        size: 75,
        rent: 800,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      {
        id: '2',
        name: 'Apartment 2',
        houseId: 'house1',
        houseName: 'Test House',
        floor: 2,
        rooms: 2,
        size: 60,
        rent: 650,
        createdAt: '2023-01-02',
        updatedAt: '2023-01-02',
      },
    ]

    const mockHouses = [
      {
        id: 'house1',
        name: 'Test House',
        address: 'Test Address',
        city: 'Test City',
        postalCode: '12345',
        country: 'Germany',
      },
    ]

    it('renders mobile layout correctly', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(
        <ApartmentTable 
          apartments={mockApartments} 
          houses={mockHouses}
          serverApartmentCount={2}
          serverApartmentLimit={10}
          serverUserIsEligibleToAdd={true}
          serverLimitReason="none"
        />
      )
      
      // Should show mobile filter button
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      
      // Should show mobile search button
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
    })

    it('handles apartment-specific filters on mobile', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(
        <ApartmentTable 
          apartments={mockApartments} 
          houses={mockHouses}
          serverApartmentCount={2}
          serverApartmentLimit={10}
          serverUserIsEligibleToAdd={true}
          serverLimitReason="none"
        />
      )
      
      const filterButton = screen.getByRole('button', { name: /filter options/i })
      await user.click(filterButton)
      
      // Should show apartment-specific filters
      await waitFor(() => {
        const dialog = screen.getByRole('dialog', { name: /filter menü/i })
        expect(dialog).toBeInTheDocument()
      })
    })

    it('maintains apartment data display on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(
        <ApartmentTable 
          apartments={mockApartments} 
          houses={mockHouses}
          serverApartmentCount={2}
          serverApartmentLimit={10}
          serverUserIsEligibleToAdd={true}
          serverLimitReason="none"
        />
      )
      
      // Should display apartment data
      expect(screen.getByText('Apartment 1')).toBeInTheDocument()
      expect(screen.getByText('Apartment 2')).toBeInTheDocument()
    })
  })

  describe('TenantTable Mobile Integration', () => {
    const mockTenants = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+49123456789',
        wohnungId: 'apt1',
        wohnungName: 'Apartment 1',
        moveInDate: '2023-01-01',
        moveOutDate: null,
        isActive: true,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+49987654321',
        wohnungId: 'apt2',
        wohnungName: 'Apartment 2',
        moveInDate: '2023-02-01',
        moveOutDate: null,
        isActive: true,
        createdAt: '2023-02-01',
        updatedAt: '2023-02-01',
      },
    ]

    const mockApartments = [
      {
        id: 'apt1',
        name: 'Apartment 1',
        houseId: 'house1',
        houseName: 'Test House',
      },
      {
        id: 'apt2',
        name: 'Apartment 2',
        houseId: 'house1',
        houseName: 'Test House',
      },
    ]

    it('renders mobile layout for tenant table', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<TenantTable tenants={mockTenants} apartments={mockApartments} />)
      
      // Should show mobile filter button
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      
      // Should show mobile search button
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
    })

    it('handles tenant-specific mobile interactions', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(<TenantTable tenants={mockTenants} apartments={mockApartments} />)
      
      // Test search expansion
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /suchfeld/i })).toBeInTheDocument()
      })
    })

    it('maintains tenant data display on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<TenantTable tenants={mockTenants} apartments={mockApartments} />)
      
      // Should display tenant data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('handles empty state on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<TenantTable tenants={[]} apartments={mockApartments} />)
      
      // Should still show mobile controls
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
    })
  })

  describe('Cross-Table Consistency', () => {
    it('maintains consistent mobile UI across all table types', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      const { rerender } = render(<HouseTable houses={[]} />)
      
      // Check house table
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      
      // Check apartment table
      rerender(
        <ApartmentTable 
          apartments={[]} 
          houses={[]}
          serverApartmentCount={0}
          serverApartmentLimit={10}
          serverUserIsEligibleToAdd={true}
          serverLimitReason="none"
        />
      )
      
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      
      // Check tenant table
      rerender(<TenantTable tenants={[]} apartments={[]} />)
      
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
    })

    it('maintains consistent desktop UI across all table types', () => {
      mockUseIsMobile.mockReturnValue(false)
      
      const { rerender } = render(<HouseTable houses={[]} />)
      
      // Check house table - should not have mobile controls
      expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
      
      // Check apartment table
      rerender(
        <ApartmentTable 
          apartments={[]} 
          houses={[]}
          serverApartmentCount={0}
          serverApartmentLimit={10}
          serverUserIsEligibleToAdd={true}
          serverLimitReason="none"
        />
      )
      
      expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
      
      // Check tenant table
      rerender(<TenantTable tenants={[]} apartments={[]} />)
      
      expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
    })
  })

  describe('Performance and Memory', () => {
    it('handles large datasets efficiently on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      // Create large dataset
      const largeHouseList = Array.from({ length: 100 }, (_, i) => ({
        id: `house-${i}`,
        name: `House ${i}`,
        address: `Address ${i}`,
        city: 'Test City',
        postalCode: '12345',
        country: 'Germany',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }))
      
      const startTime = performance.now()
      render(<HouseTable houses={largeHouseList} />)
      const endTime = performance.now()
      
      // Should render in reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      
      // Should still show mobile controls
      expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
    })

    it('cleans up mobile components properly', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      const { unmount } = render(<HouseTable houses={[]} />)
      
      // Should not throw errors on unmount
      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('handles rapid mobile/desktop transitions', () => {
      const { rerender } = render(<HouseTable houses={[]} />)
      
      // Rapidly switch between mobile and desktop
      for (let i = 0; i < 10; i++) {
        mockUseIsMobile.mockReturnValue(i % 2 === 0)
        rerender(<HouseTable houses={[]} />)
      }
      
      // Should not cause errors
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  describe('Accessibility on Mobile', () => {
    it('maintains accessibility standards on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<HouseTable houses={[]} />)
      
      // Mobile controls should have proper labels
      const filterButton = screen.getByRole('button', { name: /filter options/i })
      expect(filterButton).toHaveAttribute('aria-label')
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      expect(searchButton).toHaveAttribute('aria-label')
    })

    it('supports keyboard navigation on mobile', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(<HouseTable houses={[]} />)
      
      const filterButton = screen.getByRole('button', { name: /filter options/i })
      
      // Should be focusable
      filterButton.focus()
      expect(filterButton).toHaveFocus()
      
      // Should respond to Enter key
      await user.keyboard('{Enter}')
      
      // Should open filter dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /filter menü/i })).toBeInTheDocument()
      })
    })

    it('provides proper touch targets on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      
      render(<HouseTable houses={[]} />)
      
      const filterButton = screen.getByRole('button', { name: /filter options/i })
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      
      // Should have minimum touch target size
      expect(filterButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      expect(searchButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    })
  })
})