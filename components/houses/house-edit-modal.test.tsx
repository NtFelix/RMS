import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseEditModal } from './house-edit-modal';
import { deleteHouseAction } from '@/app/(dashboard)/haeuser/actions';
import { bestaetigeLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import { useModalStore } from '@/hooks/use-modal-store';

jest.mock('@/app/(dashboard)/haeuser/actions', () => ({
  deleteHouseAction: jest.fn(),
}));
jest.mock('@/lib/kautionen-loeschen', () => ({
  bestaetigeLoeschenMitKautionen: jest.fn(),
}));
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(jest.fn(() => ({})), { getState: () => ({ completeStep: jest.fn() }) }),
}));

// jsdom kennt ResizeObserver nicht (ScrollArea)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const mockDelete = deleteHouseAction as jest.Mock;
const mockBestaetige = bestaetigeLoeschenMitKautionen as jest.Mock;

const closeHouseModal = jest.fn();
const houseModalOnSuccess = jest.fn();

async function openDeleteDialogAndConfirm() {
  const user = userEvent.setup();
  render(<HouseEditModal serverAction={jest.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Aktionen' }));
  await user.click(await screen.findByText('Löschen'));
  await user.click(await screen.findByRole('button', { name: 'Löschen' }));
}

describe('HouseEditModal delete with Kautionen confirmation', () => {
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

  it('does not delete when the confirmation is cancelled', async () => {
    mockBestaetige.mockResolvedValue({ ok: false });
    await openDeleteDialogAndConfirm();

    await waitFor(() => expect(mockBestaetige).toHaveBeenCalledWith('Haeuser', ['house-1']));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(houseModalOnSuccess).not.toHaveBeenCalled();
    // Dialog wird geschlossen, kein hängender Ladezustand
    await waitFor(() => expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument());
    expect(screen.queryByText('Löschen...')).not.toBeInTheDocument();
  });

  it('passes the checksum to deleteHouseAction when confirmed', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: { 'house-1': 'abc' } });
    await openDeleteDialogAndConfirm();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('house-1', 'abc'));
    expect(mockBestaetige).toHaveBeenCalledWith('Haeuser', ['house-1']);
    await waitFor(() => expect(houseModalOnSuccess).toHaveBeenCalledWith({ deleted: true, id: 'house-1' }));
  });
});
