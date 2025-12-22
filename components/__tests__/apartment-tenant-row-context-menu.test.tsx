import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApartmentTenantRowContextMenu } from '@/components/apartments/apartment-tenant-row-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('ApartmentTenantRowContextMenu', () => {
  const mockProps = {
    apartmentId: 'apartment-1',
    tenantId: 'tenant-1',
    apartmentData: {
      id: 'apartment-1',
      name: 'Wohnung 1A',
      groesse: 75,
      miete: 1200,
    },
    tenantData: {
      id: 'tenant-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefon: '+49123456789',
      einzug: '2023-01-01',
    },
    onEditApartment: jest.fn(),
    onEditTenant: jest.fn(),
    onViewDetails: jest.fn(),
  }

  const mockModalStore = {
    openApartmentTenantDetailsModal: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue(mockModalStore as any)
  })

  it('renders context menu trigger with children', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('shows context menu when right-clicked', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
  })

  it('calls onEditApartment when apartment edit is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    const editApartmentItem = screen.getByText('Wohnung bearbeiten')
    fireEvent.click(editApartmentItem)

    expect(mockProps.onEditApartment).toHaveBeenCalledTimes(1)
  })

  it('calls onEditTenant when tenant edit is clicked and tenant exists', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    const editTenantItem = screen.getByText('Mieter bearbeiten')
    fireEvent.click(editTenantItem)

    expect(mockProps.onEditTenant).toHaveBeenCalledTimes(1)
  })

  it('disables tenant edit when no tenant exists', () => {
    const propsWithoutTenant = {
      ...mockProps,
      tenantId: undefined,
      tenantData: undefined,
    }

    render(
      <ApartmentTenantRowContextMenu {...propsWithoutTenant}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    const editTenantItem = screen.getByText('Mieter bearbeiten')
    // Check if the parent element has the disabled attribute (Radix UI implementation)
    const menuItem = editTenantItem.closest('[role="menuitem"]')
    expect(menuItem).toHaveAttribute('data-disabled')
  })

  it('calls onViewDetails when details view is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    const viewDetailsItem = screen.getByText('Details anzeigen')
    fireEvent.click(viewDetailsItem)

    expect(mockProps.onViewDetails).toHaveBeenCalledTimes(1)
  })

  it('renders correct icons for each menu item', () => {
    render(
      <ApartmentTenantRowContextMenu {...mockProps}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    // Check for SVG elements with specific classes or data attributes
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThanOrEqual(3) // At least 3 icons

    // Check that the menu items exist with their text
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
  })

  it('handles context menu without tenant data gracefully', () => {
    const propsWithoutTenant = {
      ...mockProps,
      tenantId: undefined,
      tenantData: undefined,
      onEditTenant: jest.fn(),
    }

    render(
      <ApartmentTenantRowContextMenu {...propsWithoutTenant}>
        <div data-testid="child-content">Test Content</div>
      </ApartmentTenantRowContextMenu>
    )

    const trigger = screen.getByTestId('child-content')
    fireEvent.contextMenu(trigger)

    // Should still render all menu items
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()

    // Tenant edit should be disabled
    const editTenantItem = screen.getByText('Mieter bearbeiten')
    fireEvent.click(editTenantItem)
    expect(propsWithoutTenant.onEditTenant).not.toHaveBeenCalled()
  })
})