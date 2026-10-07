import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { HouseContextMenu } from './house-context-menu';
import { deleteHouseAction } from '@/app/(dashboard)/haeuser/actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import { useModalStore } from '@/hooks/use-modal-store';

jest.mock('@/app/(dashboard)/haeuser/actions', () => ({
  deleteHouseAction: jest.fn(),
}));
jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));

const mockDelete = deleteHouseAction as jest.Mock;
const mockStart = starteLoeschenMitKautionen as jest.Mock;

const house = { id: 'house-1', name: 'Haus Alpha', ort: 'Berlin' };

function renderMenu(onRefresh = jest.fn()) {
  render(
    <HouseContextMenu house={house} onEdit={jest.fn()} onRefresh={onRefresh}>
      <div data-testid="trigger">Haus</div>
    </HouseContextMenu>
  );
  fireEvent.contextMenu(screen.getByTestId('trigger'));
}

async function klickeLoeschen() {
  const eintrag = await screen.findByRole('menuitem', { name: 'Löschen' });
  // act: der Handler läuft (mit gemockten Helfern) sofort weiter und setzt Zustand
  await act(async () => {
    fireEvent.click(eintrag);
  });
}

describe('HouseContextMenu delete with Kautionen overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useModalStore as unknown as jest.Mock).mockReturnValue({ openHausOverviewModal: jest.fn() });
    mockDelete.mockResolvedValue({ success: true });
  });

  it('loads the impact first, with the clicked house', async () => {
    renderMenu();
    await klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Haeuser', ['house-1'], expect.any(Object)));
  });

  it('without booked deposits: shows the usual question and deletes without checksum after it', async () => {
    renderMenu();
    await klickeLoeschen();

    expect(await screen.findByText('Haus löschen?')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
    const buttons = await screen.findAllByRole('button', { name: 'Löschen' });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', undefined));
    await waitFor(() => expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument());
  });

  it('with booked deposits: no second question, the confirmed overview deletes with the checksum', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ 'house-1': 'abc' }));
    const onRefresh = jest.fn();
    renderMenu(onRefresh);
    await klickeLoeschen();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', 'abc'));
    expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
    // Handler vollständig durchgelaufen (Zustand im finally zurückgesetzt), sonst endet der Test mit Updates außerhalb von act()
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it('cancelled overview or error: nothing is deleted and no question is shown', async () => {
    mockStart.mockImplementationOnce(async () => undefined);
    renderMenu();
    await klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
  });
});
