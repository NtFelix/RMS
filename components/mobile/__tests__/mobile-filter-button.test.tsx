import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileFilterButton } from '../mobile-filter-button'

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn()
}))

const mockUseIsMobile = require('@/hooks/use-mobile').useIsMobile

describe('MobileFilterButton', () => {
  const mockFilters = [
    { id: 'all', label: 'Alle', count: 10 },
    { id: 'active', label: 'Aktiv', count: 5 },
    { id: 'inactive', label: 'Inaktiv', count: 3 }
  ]

  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseIsMobile.mockReturnValue(true) // Default to mobile
  })

  afterEach(() => {
    // Clean up any body style changes
    document.body.style.overflow = 'unset'
  })

  it('should not render on desktop', () => {
    mockUseIsMobile.mockReturnValue(false)
    
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={[]}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.queryByRole('button', { name: /filter options/i })).not.toBeInTheDocument()
  })

  it('should render filter button on mobile', () => {
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={[]}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument()
    expect(screen.getByText('Filter')).toBeInTheDocument()
  })

  it('should show active filter count', () => {
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={['active', 'inactive']}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter options \(2 active\)/i })).toBeInTheDocument()
  })

  it('should open dropdown when filter button is clicked', async () => {
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
    expect(screen.getByRole('button', { name: /filter anwenden/i })).toBeInTheDocument()
  })

  it('should display all filter options in dropdown', async () => {
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

    mockFilters.forEach(filter => {
      expect(screen.getByText(filter.label)).toBeInTheDocument()
      if (filter.count !== undefined) {
        expect(screen.getByText(filter.count.toString())).toBeInTheDocument()
      }
    })
  })

  it('should toggle filter selection', async () => {
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

    const activeFilterOption = screen.getByRole('checkbox', { name: /aktiviere filter: aktiv/i })
    await user.click(activeFilterOption)

    expect(mockOnFilterChange).toHaveBeenCalledWith(['active'])
  })

  it('should deselect active filter', async () => {
    const user = userEvent.setup()
    
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={['active']}
        onFilterChange={mockOnFilterChange}
      />
    )

    const filterButton = screen.getByRole('button', { name: /filter options \(1 active\)/i })
    await user.click(filterButton)

    const activeFilterOption = screen.getByRole('checkbox', { name: /deaktiviere filter: aktiv/i })
    await user.click(activeFilterOption)

    expect(mockOnFilterChange).toHaveBeenCalledWith([])
  })

  it('should clear all filters', async () => {
    const user = userEvent.setup()
    
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={['active', 'inactive']}
        onFilterChange={mockOnFilterChange}
      />
    )

    const filterButton = screen.getByRole('button', { name: /filter options \(2 active\)/i })
    await user.click(filterButton)

    const clearAllButton = screen.getByRole('button', { name: /alle filter löschen/i })
    await user.click(clearAllButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith([])
  })

  it('should close dropdown when close button is clicked', async () => {
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

    const closeButton = screen.getByRole('button', { name: /filter menü schließen/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /filter menü/i })).not.toBeInTheDocument()
    })
  })

  it('should close dropdown when apply button is clicked', async () => {
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

    const applyButton = screen.getByRole('button', { name: /filter anwenden/i })
    await user.click(applyButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /filter menü/i })).not.toBeInTheDocument()
    })
  })

  it('should close dropdown when backdrop is clicked', async () => {
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

    const backdrop = screen.getByRole('dialog', { name: /filter menü/i })
    await user.click(backdrop)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /filter menü/i })).not.toBeInTheDocument()
    })
  })

  it('should close dropdown when escape key is pressed', async () => {
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

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /filter menü/i })).not.toBeInTheDocument()
    })
  })

  it('should prevent body scroll when dropdown is open', async () => {
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

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('should restore body scroll when dropdown is closed', async () => {
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

    const closeButton = screen.getByRole('button', { name: /filter menü schließen/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  it('should apply custom className', () => {
    render(
      <MobileFilterButton
        filters={mockFilters}
        activeFilters={[]}
        onFilterChange={mockOnFilterChange}
        className="custom-class"
      />
    )

    const filterButton = screen.getByRole('button', { name: /filter options/i })
    expect(filterButton).toHaveClass('custom-class')
  })
})