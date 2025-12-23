import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ApartmentTenantRow } from '@/components/apartments/apartment-tenant-row'
import { ApartmentTenantRowContextMenu } from '@/components/apartments/apartment-tenant-row-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('ApartmentTenantRow in Modal Context', () => {
  const mockApartment = {
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

  const mockProps = {
    hausName: 'Test House',
    onEditApartment: jest.fn(),
    onEditTenant: jest.fn(),
    onViewDetails: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the modal store
    mockUseModalStore.mockReturnValue({
      openApartmentTenantDetailsModal: jest.fn(),
    } as any)
  })

  it('should properly forward refs when wrapped in context menu', () => {
    const { container } = render(
      <ApartmentTenantRowContextMenu
        apartmentId={mockApartment.id}
        tenantId={mockApartment.currentTenant?.id}
        apartmentData={mockApartment}
        tenantData={mockApartment.currentTenant}
        {...mockProps}
      >
        <ApartmentTenantRow
          apartment={mockApartment}
          {...mockProps}
        />
      </ApartmentTenantRowContextMenu>
    )

    // The row should be rendered
    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()

    // Should be able to trigger context menu via right-click
    const rowElement = screen.getByText('Wohnung 1A').closest('div.flex')
    expect(rowElement).toBeInTheDocument()
    
    // Simulate right-click
    fireEvent.contextMenu(rowElement!)

    // Context menu should appear
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
  })

  it('should work within a dialog/modal', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle className="sr-only">Test Modal</DialogTitle>
          <ApartmentTenantRowContextMenu
            apartmentId={mockApartment.id}
            tenantId={mockApartment.currentTenant?.id}
            apartmentData={mockApartment}
            tenantData={mockApartment.currentTenant}
            {...mockProps}
          >
            <ApartmentTenantRow
              apartment={mockApartment}
              {...mockProps}
            />
          </ApartmentTenantRowContextMenu>
        </DialogContent>
      </Dialog>
    )

    // The row should be rendered within the dialog
    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    
    // Find the row element within the dialog - look for the main content div
    const rowElement = screen.getByText('Wohnung 1A').closest('div.flex')
    expect(rowElement).toBeInTheDocument()
    
    // Simulate right-click
    fireEvent.contextMenu(rowElement!)

    // Context menu should appear even within a dialog
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
  })

  it('should handle expandable rows with context menu', () => {
    const expandedContent = <div>Expanded details</div>

    render(
      <ApartmentTenantRowContextMenu
        apartmentId={mockApartment.id}
        tenantId={mockApartment.currentTenant?.id}
        apartmentData={mockApartment}
        tenantData={mockApartment.currentTenant}
        {...mockProps}
      >
        <ApartmentTenantRow
          apartment={mockApartment}
          {...mockProps}
          expandable={true}
          expandedContent={expandedContent}
        />
      </ApartmentTenantRowContextMenu>
    )

    // The row should be rendered
    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()

    // Find the collapsible trigger
    const trigger = document.querySelector('.cursor-pointer')
    expect(trigger).toBeInTheDocument()

    // Right-click should still work
    fireEvent.contextMenu(trigger!)
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
  })
})
