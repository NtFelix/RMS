import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HouseContextMenu } from './house-context-menu';
import { deleteHouseAction } from '@/app/(dashboard)/haeuser/actions';
import { bestaetigeLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import { useModalStore } from '@/hooks/use-modal-store';

jest.mock('@/app/(dashboard)/haeuser/actions', () => ({
  deleteHouseAction: jest.fn(),
}));
jest.mock('@/lib/kautionen-loeschen', () => ({
  bestaetigeLoeschenMitKautionen: jest.fn(),
}));

const mockDelete = deleteHouseAction as jest.Mock;
const mockBestaetige = bestaetigeLoeschenMitKautionen as jest.Mock;

const house = { id: 'house-1', name: 'Haus Alpha', ort: 'Berlin' };

function renderMenu(onRefresh = jest.fn()) {
  render(
    <HouseContextMenu house={house} onEdit={jest.fn()} onRefresh={onRefresh}>
      <div data-testid="trigger">Haus</div>
    </HouseContextMenu>
  );
  fireEvent.contextMenu(screen.getByTestId('trigger'));
}

async function confirmDelete() {
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }));
  const buttons = await screen.findAllByRole('button', { name: 'Löschen' });
  fireEvent.click(buttons[buttons.length - 1]);
  // Dialog schließt am Ende des Handlers (finally)
  await waitFor(() => expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument());
}

describe('HouseContextMenu delete with Kautionen confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useModalStore as unknown as jest.Mock).mockReturnValue({ openHausOverviewModal: jest.fn() });
    mockDelete.mockResolvedValue({ success: true });
  });

  it('does not delete when the confirmation is cancelled', async () => {
    mockBestaetige.mockResolvedValue({ ok: false });
    renderMenu();
    await confirmDelete();

    await waitFor(() => expect(mockBestaetige).toHaveBeenCalledWith('Haeuser', ['house-1']));
    expect(mockDelete).not.toHaveBeenCalled();
    // Dialog wird geschlossen, kein hängender Ladezustand
    await waitFor(() => expect(screen.queryByText('Löschen...')).not.toBeInTheDocument());
  });

  it('passes the checksum to deleteHouseAction when confirmed', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: { 'house-1': 'abc' } });
    renderMenu();
    await confirmDelete();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', 'abc'));
    expect(mockBestaetige).toHaveBeenCalledWith('Haeuser', ['house-1']);
  });

  it('deletes without checksum when no deposits with bookings are affected', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: {} });
    renderMenu();
    await confirmDelete();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', undefined));
  });
});
