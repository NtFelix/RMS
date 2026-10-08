import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApartmentContextMenu } from '@/components/apartments/apartment-context-menu';
import { useModalStore } from '@/hooks/use-modal-store';
import { loescheWohnung } from '@/app/(dashboard)/wohnungen/actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockLoescheWohnung = loescheWohnung as jest.Mock;
const mockStart = starteLoeschenMitKautionen as jest.Mock;

// Mock the server action
jest.mock('@/app/(dashboard)/wohnungen/actions', () => ({
  loescheWohnung: jest.fn(),
}));

// Mock the Kautionen overview helper (default: no booked deposit affected -> the usual question is shown)
jest.mock('@/lib/kautionen-loeschen', () => ({
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
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

  it('should open delete confirmation dialog when delete is clicked', async () => {
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

    // Check that the delete confirmation dialog is shown (after the impact lookup)
    expect(await screen.findByText('Wohnung löschen?')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('Möchten Sie die Wohnung') && content.includes(mockApartment.name) && content.includes('wirklich löschen');
    })).toBeInTheDocument();
  });

  describe('Kautionen-Übersicht beim Löschen', () => {
    const klickeLoeschen = () => {
      render(
        <ApartmentContextMenu apartment={mockApartment} onEdit={mockOnEdit} onRefresh={mockOnRefresh}>
          <div>Test Child</div>
        </ApartmentContextMenu>
      );
      fireEvent.contextMenu(screen.getByText('Test Child'));
      fireEvent.click(screen.getByText('Löschen'));
    };

    it('lädt zuerst die Auswirkung mit ("Wohnungen", [id])', async () => {
      klickeLoeschen();

      await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Wohnungen', [mockApartment.id], expect.any(Object)));
    });

    it('ohne gebuchte Kaution: üblicher Dialog, danach Löschen ohne Prüfsumme', async () => {
      mockLoescheWohnung.mockResolvedValue({ success: true });
      klickeLoeschen();

      const dialog = await screen.findByRole('alertdialog');
      expect(mockLoescheWohnung).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => expect(mockLoescheWohnung).toHaveBeenCalledWith(mockApartment.id, undefined));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht löscht mit der Prüfsumme', async () => {
      mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ [mockApartment.id]: 'abc' }));
      mockLoescheWohnung.mockResolvedValue({ success: true });
      klickeLoeschen();

      await waitFor(() => expect(mockLoescheWohnung).toHaveBeenCalledWith(mockApartment.id, 'abc'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      // Handler vollständig durchgelaufen (Zustand im finally zurückgesetzt), sonst endet der Test mit Updates außerhalb von act()
      await waitFor(() => expect(mockOnRefresh).toHaveBeenCalled());
    });

    it('löscht nichts und zeigt keine Frage, wenn abgebrochen wird', async () => {
      mockStart.mockImplementationOnce(async () => undefined);
      klickeLoeschen();

      await waitFor(() => expect(mockStart).toHaveBeenCalled());
      expect(mockLoescheWohnung).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
