import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import WohnungenClientView from './client';
import { useModalStore } from '@/hooks/use-modal-store';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import type { Wohnung } from '@/types/Wohnung';

jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));

jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(
    jest.fn(() => ({ getState: () => ({ completeStep: jest.fn() }) })),
    { getState: jest.fn(() => ({ completeStep: jest.fn() })) }
  ),
}));
jest.mock('@/utils/supabase/client', () => ({ createClient: jest.fn(() => ({})) }));

// Tabelle durch einen Stub ersetzen, der nur die Auswahl auslöst
jest.mock('@/components/tables/apartment-table', () => ({
  ApartmentTable: ({ onSelectionChange }: { onSelectionChange: (s: Set<string>) => void }) => (
    <button onClick={() => onSelectionChange(new Set(['1', '2']))}>Auswahl setzen</button>
  ),
}));

global.fetch = jest.fn();

const mockStart = starteLoeschenMitKautionen as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('WohnungenClientView - Sammellöschen mit Kautionen-Übersicht', () => {
  const props = {
    initialWohnungenData: [] as Wohnung[],
    housesData: [{ id: 'h1', name: 'Haus 1' }],
    serverApartmentCount: 2,
    serverApartmentLimit: 10,
    serverUserIsEligibleToAdd: true,
    serverLimitReason: 'none' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useModalStore as unknown as jest.Mock).mockReturnValue({ openWohnungModal: jest.fn() });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ successCount: 2, reasons: [] }) });
  });

  const waehleUndKlickeLoeschen = async () => {
    render(<WohnungenClientView {...props} />);
    fireEvent.click(screen.getByText('Auswahl setzen'));
    fireEvent.click(await screen.findByRole('button', { name: /^Löschen \(2\)/ }));
  };

  it('lädt zuerst die Auswirkung, fragt dann üblich und sendet leere Prüfsummen', async () => {
    await waehleUndKlickeLoeschen();

    const dialog = await screen.findByRole('alertdialog');
    expect(mockStart).toHaveBeenCalledWith('Wohnungen', ['1', '2'], expect.any(Object));
    expect(mockFetch).not.toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything());
    fireEvent.click(within(dialog).getByRole('button', { name: /Wohnungen löschen/ }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything()));
    const [, init] = mockFetch.mock.calls.find(([url]) => url === '/api/apartments/bulk-delete')!;
    expect(JSON.parse(init.body)).toEqual({ ids: ['1', '2'], pruefsummen: {} });
  });

  it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht sendet ihre Prüfsummen', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ '1': 'abc' }));
    await waehleUndKlickeLoeschen();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything()));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    const [, init] = mockFetch.mock.calls.find(([url]) => url === '/api/apartments/bulk-delete')!;
    expect(JSON.parse(init.body)).toEqual({ ids: ['1', '2'], pruefsummen: { '1': 'abc' } });
  });

  it('ruft die Route nicht auf und zeigt keine Frage, wenn die Übersicht abgebrochen wird', async () => {
    mockStart.mockImplementationOnce(async () => undefined);
    await waehleUndKlickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Wohnungen', ['1', '2'], expect.any(Object)));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything());
    // Auswahl bleibt, Button wieder aktiv
    expect(screen.getByRole('button', { name: /^Löschen \(2\)/ })).toBeEnabled();
  });
});
