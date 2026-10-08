import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WohnungEditModal } from '@/components/apartments/wohnung-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { loescheWohnung } from '@/app/(dashboard)/wohnungen/actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

jest.mock('@/app/(dashboard)/wohnungen/actions', () => ({
  loescheWohnung: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
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
const mockStart = starteLoeschenMitKautionen as jest.Mock;

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

  const klickeLoeschen = () => {
    render(<WohnungEditModal serverAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Löschen/ }));
  };

  it('lädt zuerst die Auswirkung, fragt dann üblich und löscht ohne Prüfsumme', async () => {
    mockLoescheWohnung.mockResolvedValue({ success: true });
    klickeLoeschen();

    const dialog = await screen.findByRole('alertdialog');
    expect(mockStart).toHaveBeenCalledWith('Wohnungen', [wohnung.id], expect.any(Object));
    expect(mockLoescheWohnung).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(mockLoescheWohnung).toHaveBeenCalledWith(wohnung.id, undefined));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht löscht mit der Prüfsumme', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ [wohnung.id]: 'abc' }));
    mockLoescheWohnung.mockResolvedValue({ success: true });
    klickeLoeschen();

    await waitFor(() => expect(mockLoescheWohnung).toHaveBeenCalledWith(wohnung.id, 'abc'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('löscht nichts und zeigt keine Frage, wenn die Übersicht abgebrochen wird', async () => {
    mockStart.mockImplementationOnce(async () => undefined);
    klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(mockLoescheWohnung).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
