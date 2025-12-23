import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApartmentTenantRow } from '@/components/apartments/apartment-tenant-row'

// Mock data
const mockApartmentWithTenant = {
  id: '1',
  name: 'Wohnung 1A',
  groesse: 75,
  miete: 1200,
  status: 'vermietet' as const,
  currentTenant: {
    id: 'tenant-1',
    name: 'Max Mustermann',
    einzug: '2023-01-15',
  },
}

const mockVacantApartment = {
  id: '2',
  name: 'Wohnung 2B',
  groesse: 60,
  miete: 1000,
  status: 'frei' as const,
}

const mockProps = {
  hausName: 'Musterstraße 123',
  onEditApartment: jest.fn(),
  onEditTenant: jest.fn(),
  onViewDetails: jest.fn(),
}

describe('ApartmentTenantRow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders apartment information correctly', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
      />
    )

    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.getByText('75 m² • Musterstraße 123')).toBeInTheDocument()
    expect(screen.getByText('1.200,00 €')).toBeInTheDocument()
    expect(screen.getByText('16,00 €/m²')).toBeInTheDocument()
  })

  it('renders tenant information when apartment is occupied', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
      />
    )

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.getByText('Seit 15.1.2023')).toBeInTheDocument()
  })

  it('renders vacant state when apartment is empty', () => {
    render(
      <ApartmentTenantRow
        apartment={mockVacantApartment}
        {...mockProps}
      />
    )

    expect(screen.getByText('Frei')).toBeInTheDocument()
    expect(screen.getByText('Keine Mieter')).toBeInTheDocument()
  })

  it('applies vacant styling for empty apartments', () => {
    const { container } = render(
      <ApartmentTenantRow
        apartment={mockVacantApartment}
        {...mockProps}
      />
    )

    const rowElement = container.querySelector('.border-dashed')
    expect(rowElement).toBeInTheDocument()
  })

  it('renders expandable content when expandable is true', () => {
    const expandedContent = <div>Additional details</div>

    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        expandable={true}
        expandedContent={expandedContent}
      />
    )

    // Should show chevron right initially (look for the SVG element)
    const chevronRight = document.querySelector('.lucide-chevron-right')
    expect(chevronRight).toBeInTheDocument()
  })

  it('toggles expanded content when clicked', () => {
    const expandedContent = <div>Additional details</div>

    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        expandable={true}
        expandedContent={expandedContent}
      />
    )

    // Click to expand - find the clickable trigger element
    const trigger = document.querySelector('.cursor-pointer')
    expect(trigger).toBeInTheDocument()
    
    fireEvent.click(trigger!)

    // Should show expanded content
    expect(screen.getByText('Additional details')).toBeInTheDocument()
  })

  it('formats currency correctly', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
      />
    )

    expect(screen.getByText('1.200,00 €')).toBeInTheDocument()
    expect(screen.getByText('16,00 €/m²')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
      />
    )

    expect(screen.getByText('Seit 15.1.2023')).toBeInTheDocument()
  })

  it('handles missing tenant move-in date gracefully', () => {
    const apartmentWithoutDate = {
      ...mockApartmentWithTenant,
      currentTenant: {
        id: 'tenant-1',
        name: 'Max Mustermann',
      },
    }

    render(
      <ApartmentTenantRow
        apartment={apartmentWithoutDate}
        {...mockProps}
      />
    )

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    // Should not show "Seit" text when no date is available
    expect(screen.queryByText(/Seit/)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        className="custom-row-class"
      />
    )

    const rowElement = container.querySelector('.custom-row-class')
    expect(rowElement).toBeInTheDocument()
  })

  it('calculates rent per square meter correctly', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
      />
    )

    // 1200 / 75 = 16.00
    expect(screen.getByText('16,00 €/m²')).toBeInTheDocument()
  })

  it('handles zero square meters gracefully', () => {
    const apartmentWithZeroSize = {
      ...mockApartmentWithTenant,
      groesse: 0,
    }

    render(
      <ApartmentTenantRow
        apartment={apartmentWithZeroSize}
        {...mockProps}
      />
    )

    expect(screen.getByText('0 m² • Musterstraße 123')).toBeInTheDocument()
    // Should handle division by zero gracefully (shows N/A)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('shows chevron down when expanded', () => {
    const expandedContent = <div>Additional details</div>

    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        expandable={true}
        expandedContent={expandedContent}
      />
    )

    const trigger = document.querySelector('.cursor-pointer')
    fireEvent.click(trigger!)

    // Should show chevron down when expanded
    const chevronDown = document.querySelector('.lucide-chevron-down')
    expect(chevronDown).toBeInTheDocument()
  })

  it('does not show expand indicator when not expandable', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        expandable={false}
      />
    )

    expect(document.querySelector('.lucide-chevron-right')).not.toBeInTheDocument()
    expect(document.querySelector('.lucide-chevron-down')).not.toBeInTheDocument()
  })

  it('renders without expandable content when expandable is true but no content provided', () => {
    render(
      <ApartmentTenantRow
        apartment={mockApartmentWithTenant}
        {...mockProps}
        expandable={true}
      />
    )

    const trigger = document.querySelector('.cursor-pointer')
    fireEvent.click(trigger!)

    // Should not crash and should not show any expanded content
    expect(screen.queryByText('Additional details')).not.toBeInTheDocument()
  })
})