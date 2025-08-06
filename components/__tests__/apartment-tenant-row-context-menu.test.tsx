import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApartmentTenantRowContextMenu } from '../apartment-tenant-row-context-menu'

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
  onEditApartment: jest.fn(),
  onEditTenant: jest.fn(),
  onViewDetails: jest.fn(),
}

describe('ApartmentTenantRowContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all menu items', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
  })

  it('enables tenant actions when apartment has tenant', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    const tenantMenuItem = screen.getByText('Mieter bearbeiten').closest('[role="menuitem"]')
    expect(tenantMenuItem).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('disables tenant actions when apartment is vacant', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockVacantApartment}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    const tenantMenuItem = screen.getByText('Mieter bearbeiten').closest('[role="menuitem"]')
    expect(tenantMenuItem).toHaveClass('disabled:opacity-50')
  })

  it('calls onEditApartment when apartment edit is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    // Click apartment edit
    fireEvent.click(screen.getByText('Wohnung bearbeiten'))
    expect(mockProps.onEditApartment).toHaveBeenCalledTimes(1)
  })

  it('calls onEditTenant when tenant edit is clicked and tenant exists', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    // Click tenant edit
    fireEvent.click(screen.getByText('Mieter bearbeiten'))
    expect(mockProps.onEditTenant).toHaveBeenCalledTimes(1)
  })

  it('calls onViewDetails when details is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    // Click view details
    fireEvent.click(screen.getByText('Details anzeigen'))
    expect(mockProps.onViewDetails).toHaveBeenCalledTimes(1)
  })

  it('renders correct icons for each menu item', () => {
    render(
      <ApartmentTenantRowContextMenu
        apartment={mockApartmentWithTenant}
        {...mockProps}
      >
        <div>Test content</div>
      </ApartmentTenantRowContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Test content')
    fireEvent.contextMenu(trigger)

    // Check that icons are present (they should be rendered as SVG elements)
    const menuItems = screen.getAllByRole('menuitem')
    expect(menuItems).toHaveLength(3)
    
    // Each menu item should have an icon (SVG)
    menuItems.forEach(item => {
      expect(item.querySelector('svg')).toBeInTheDocument()
    })
  })
})