import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApartmentContextMenu } from '../apartment-context-menu';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock the server action
jest.mock('@/app/(dashboard)/wohnungen/actions', () => ({
  loescheWohnung: jest.fn(),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('ApartmentContextMenu - Overview Functionality', () => {
  const mockOpenWohnungOverviewModal = jest.fn();
  const mockApartment = {
    id: 'test-apartment-id',
    name: 'Test Apartment',
    groesse: 50,
    miete: 800,
    haus_id: 'test-house-id',
    hausName: 'Test House',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseModalStore.mockReturnValue({
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);
  });

  it('should render the Mieter-Übersicht menu item with Users icon', () => {
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={jest.fn()}
        onRefresh={jest.fn()}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Right-click to open context menu
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);

    // Check if the overview menu item exists
    const overviewMenuItem = screen.getByText('Mieter-Übersicht');
    expect(overviewMenuItem).toBeInTheDocument();

    // Check if the Users icon is present
    const usersIcon = overviewMenuItem.parentElement?.querySelector('svg');
    expect(usersIcon).toBeInTheDocument();
  });

  it('should call openWohnungOverviewModal with correct apartment ID when overview is clicked', () => {
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={jest.fn()}
        onRefresh={jest.fn()}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Right-click to open context menu
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);

    // Click the overview menu item
    const overviewMenuItem = screen.getByText('Mieter-Übersicht');
    fireEvent.click(overviewMenuItem);

    // Verify that the modal store function was called with the correct apartment ID
    expect(mockOpenWohnungOverviewModal).toHaveBeenCalledWith(mockApartment.id);
    expect(mockOpenWohnungOverviewModal).toHaveBeenCalledTimes(1);
  });

  it('should have the correct menu structure with overview option', () => {
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={jest.fn()}
        onRefresh={jest.fn()}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Right-click to open context menu
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);

    // Check that all expected menu items are present
    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByText('Mieter-Übersicht')).toBeInTheDocument();
    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });
});