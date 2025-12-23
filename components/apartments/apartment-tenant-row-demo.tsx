import React from 'react'
import { render } from '@testing-library/react'
import { ApartmentTenantRow } from '@/components/apartments/apartment-tenant-row'
import { ApartmentTenantRowContextMenu } from '@/components/apartments/apartment-tenant-row-context-menu'

// Demo component showing how to use ApartmentTenantRow with context menu
export function ApartmentTenantRowDemo() {
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

  const handleEditApartment = () => {
    console.log('Edit apartment clicked')
  }

  const handleEditTenant = () => {
    console.log('Edit tenant clicked')
  }

  const handleViewDetails = () => {
    console.log('View details clicked')
  }

  const expandedContent = (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div>
        <strong>Zusätzliche Details:</strong>
      </div>
      <div>• Balkon: Ja</div>
      <div>• Keller: Nein</div>
      <div>• Letzte Renovierung: 2022</div>
    </div>
  )

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">ApartmentTenantRow Demo</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-md font-medium mb-2">Occupied Apartment (with context menu)</h3>
          <ApartmentTenantRowContextMenu
            apartment={mockApartmentWithTenant}
            onEditApartment={handleEditApartment}
            onEditTenant={handleEditTenant}
            onViewDetails={handleViewDetails}
          >
            <ApartmentTenantRow
              apartment={mockApartmentWithTenant}
              hausName="Musterstraße 123"
              onEditApartment={handleEditApartment}
              onEditTenant={handleEditTenant}
              onViewDetails={handleViewDetails}
            />
          </ApartmentTenantRowContextMenu>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Vacant Apartment (with context menu)</h3>
          <ApartmentTenantRowContextMenu
            apartment={mockVacantApartment}
            onEditApartment={handleEditApartment}
            onEditTenant={handleEditTenant}
            onViewDetails={handleViewDetails}
          >
            <ApartmentTenantRow
              apartment={mockVacantApartment}
              hausName="Musterstraße 123"
              onEditApartment={handleEditApartment}
              onEditTenant={handleEditTenant}
              onViewDetails={handleViewDetails}
            />
          </ApartmentTenantRowContextMenu>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Expandable Row (with additional details)</h3>
          <ApartmentTenantRowContextMenu
            apartment={mockApartmentWithTenant}
            onEditApartment={handleEditApartment}
            onEditTenant={handleEditTenant}
            onViewDetails={handleViewDetails}
          >
            <ApartmentTenantRow
              apartment={mockApartmentWithTenant}
              hausName="Musterstraße 123"
              onEditApartment={handleEditApartment}
              onEditTenant={handleEditTenant}
              onViewDetails={handleViewDetails}
              expandable={true}
              expandedContent={expandedContent}
            />
          </ApartmentTenantRowContextMenu>
        </div>
      </div>
    </div>
  )
}

// Add a simple test to satisfy Jest
describe('ApartmentTenantRowDemo', () => {
  it('component exists', () => {
    expect(ApartmentTenantRowDemo).toBeDefined();
  });
});