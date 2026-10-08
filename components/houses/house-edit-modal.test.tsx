import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseEditModal } from './house-edit-modal';
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
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(jest.fn(() => ({})), { getState: () => ({ completeStep: jest.fn() }) }),
}));

// jsdom kennt ResizeObserver nicht (ScrollArea)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const mockDelete = deleteHouseAction as jest.Mock;
const mockStart = starteLoeschenMitKautionen as jest.Mock;

const closeHouseModal = jest.fn();
const houseModalOnSuccess = jest.fn();

async function klickeLoeschen() {
  const user = userEvent.setup();
  render(<HouseEditModal serverAction={jest.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Aktionen' }));
  await user.click(await screen.findByText('Löschen'));
  return user;
}

describe('HouseEditModal delete with Kautionen overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useModalStore as unknown as jest.Mock).mockReturnValue({
      isHouseModalOpen: true,
      closeHouseModal,
      houseInitialData: { id: 'house-1', name: 'Haus Alpha', ort: 'Berlin' },
      houseModalOnSuccess,
      isHouseModalDirty: false,
      setHouseModalDirty: jest.fn(),
      openHausOverviewModal: jest.fn(),
    });
    mockDelete.mockResolvedValue({ success: true });
  });

  it('loads the impact first, then asks the usual question and deletes without checksum', async () => {
    const user = await klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Haeuser', ['house-1'], expect.any(Object)));
    expect(mockDelete).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', undefined));
    await waitFor(() => expect(houseModalOnSuccess).toHaveBeenCalledWith({ deleted: true, id: 'house-1' }));
  });

  it('with booked deposits: no second question, the confirmed overview deletes with the checksum', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ 'house-1': 'abc' }));
    await klickeLoeschen();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', 'abc'));
    expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
    await waitFor(() => expect(houseModalOnSuccess).toHaveBeenCalledWith({ deleted: true, id: 'house-1' }));
  });

  it('does not delete and shows no question when the overview is cancelled', async () => {
    mockStart.mockImplementationOnce(async () => undefined);
    await klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(mockDelete).not.toHaveBeenCalled();
    expect(houseModalOnSuccess).not.toHaveBeenCalled();
    expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
  });
});
