import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WohnungEditModal } from '@/components/apartments/wohnung-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { loescheWohnung } from '@/app/(dashboard)/wohnungen/actions';
import { bestaetigeLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

jest.mock('@/app/(dashboard)/wohnungen/actions', () => ({
  loescheWohnung: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  bestaetigeLoeschenMitKautionen: jest.fn(),
}));

jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ completeStep: jest.fn() }) },
}));

// Dropdown ohne Popover rendern, damit der Löschen-Eintrag direkt klickbar ist
jest.mock('@/components/ui/custom-dropdown', () => ({
  CustomDropdown: ({ children }: any) => <div>{children}</div>,
  CustomDropdownItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  CustomDropdownSeparator: () => <hr />,
}));

const mockUseModalStore = useModalStore as unknown as jest.Mock;
const mockLoescheWohnung = loescheWohnung as jest.Mock;
const mockBestaetige = bestaetigeLoeschenMitKautionen as jest.Mock;

describe('WohnungEditModal - Löschen mit Kautionen-Bestätigung', () => {
  const wohnung = { id: 'wohnung-1', name: 'Wohnung A', groesse: 50, miete: 800, haus_id: 'haus-1' };
  const closeWohnungModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      isWohnungModalOpen: true,
      closeWohnungModal,
      wohnungInitialData: wohnung,
      wohnungModalHaeuser: [{ id: 'haus-1', name: 'Haus 1' }],
      wohnungModalOnSuccess: jest.fn(),
      isWohnungModalDirty: false,
      setWohnungModalDirty: jest.fn(),
      openZaehlerModal: jest.fn(),
    });
  });

  const loeschenBestaetigen = async () => {
    render(<WohnungEditModal serverAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Löschen/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
  };

  it('löscht nicht, wenn die Kautionen-Bestätigung abgebrochen wird', async () => {
    mockBestaetige.mockResolvedValue({ ok: false });
    await loeschenBestaetigen();

    await waitFor(() => expect(mockBestaetige).toHaveBeenCalledWith('Wohnungen', [wohnung.id]));
    expect(mockLoescheWohnung).not.toHaveBeenCalled();
    // Ladezustand zurückgesetzt, Dialog geschlossen
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('übergibt die Prüfsumme an loescheWohnung, wenn bestätigt wird', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: { [wohnung.id]: 'abc' } });
    mockLoescheWohnung.mockResolvedValue({ success: true });
    await loeschenBestaetigen();

    await waitFor(() => expect(mockLoescheWohnung).toHaveBeenCalledWith(wohnung.id, 'abc'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
