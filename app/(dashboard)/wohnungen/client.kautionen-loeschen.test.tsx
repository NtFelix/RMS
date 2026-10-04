import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import WohnungenClientView from './client';
import { useModalStore } from '@/hooks/use-modal-store';
import { bestaetigeLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import type { Wohnung } from '@/types/Wohnung';

jest.mock('@/lib/kautionen-loeschen', () => ({
  bestaetigeLoeschenMitKautionen: jest.fn(),
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

const mockBestaetige = bestaetigeLoeschenMitKautionen as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('WohnungenClientView - Sammellöschen mit Kautionen-Bestätigung', () => {
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

  const sammelLoeschenBestaetigen = async () => {
    render(<WohnungenClientView {...props} />);
    fireEvent.click(screen.getByText('Auswahl setzen'));
    fireEvent.click(await screen.findByRole('button', { name: /^Löschen \(2\)/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Wohnungen löschen/ }));
  };

  it('ruft die Route nicht auf, wenn die Kautionen-Bestätigung abgebrochen wird', async () => {
    mockBestaetige.mockResolvedValue({ ok: false });
    await sammelLoeschenBestaetigen();

    await waitFor(() => expect(mockBestaetige).toHaveBeenCalledWith('Wohnungen', ['1', '2']));
    expect(mockFetch).not.toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything());
    // Ladezustand zurückgesetzt: Button wieder aktiv
    await waitFor(() => expect(screen.getByRole('button', { name: /^Löschen \(2\)/ })).toBeEnabled());
  });

  it('sendet die Prüfsummen im Body, wenn bestätigt wird', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: { '1': 'abc' } });
    await sammelLoeschenBestaetigen();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/apartments/bulk-delete', expect.anything()));
    const [, init] = mockFetch.mock.calls.find(([url]) => url === '/api/apartments/bulk-delete')!;
    expect(JSON.parse(init.body)).toEqual({ ids: ['1', '2'], pruefsummen: { '1': 'abc' } });
  });
});
