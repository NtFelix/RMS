import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApartmentContextMenu } from '@/components/apartments/apartment-context-menu';
import { useModalStore } from '@/hooks/use-modal-store';

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock the server action
jest.mock('@/app/(dashboard)/wohnungen/actions', () => ({
  loescheWohnung: jest.fn(),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock useModalStore
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}));

describe('ApartmentContextMenu', () => {
  const mockApartment = {
    id: 'test-apartment-id',
    name: 'Test Apartment',
    groesse: 50,
    miete: 800,
    haus_id: 'test-house-id',
    hausName: 'Test House',
    status: 'frei' as const,
  };

  const mockOnEdit = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openZaehlerModal: jest.fn(),
    } as any);
  });

  it('should render the context menu with correct items', () => {
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={mockOnEdit}
        onRefresh={mockOnRefresh}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Right-click to open context menu
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);

    // Check that all expected menu items are present
    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByText('Löschen')).toBeInTheDocument();
    
    // Check that the menu items have the correct icons (Lucide React icons render as SVG)
    const editItem = screen.getByText('Bearbeiten').closest('div');
    expect(editItem).toContainElement(editItem?.querySelector('svg') as SVGElement | null);
    
    const deleteItem = screen.getByText('Löschen').closest('div');
    expect(deleteItem).toContainElement(deleteItem?.querySelector('svg') as SVGElement | null);
  });

  it('should call onEdit when edit menu item is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={mockOnEdit}
        onRefresh={mockOnRefresh}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Open context menu and click edit
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);
    await user.click(screen.getByText('Bearbeiten'));

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should open delete confirmation dialog when delete is clicked', () => {
    render(
      <ApartmentContextMenu
        apartment={mockApartment}
        onEdit={mockOnEdit}
        onRefresh={mockOnRefresh}
      >
        <div>Test Child</div>
      </ApartmentContextMenu>
    );

    // Open context menu and click delete
    const trigger = screen.getByText('Test Child');
    fireEvent.contextMenu(trigger);
    fireEvent.click(screen.getByText('Löschen'));

    // Check that the delete confirmation dialog is shown
    expect(screen.getByText('Wohnung löschen?')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('Möchten Sie die Wohnung') && content.includes(mockApartment.name) && content.includes('wirklich löschen');
    })).toBeInTheDocument();
  });
});