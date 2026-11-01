import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WohnungenClientView from './client';
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from '@/hooks/use-toast';
import type { Wohnung } from '@/types/Wohnung';

/**
 * Hinweis "Rechte konnten nicht geprüft werden" auf der Wohnungen-Seite: nur mit dem Signal `permissionCheckFailed`,
 * und "Erneut laden" holt nur die Mieterdaten neu (kein router.refresh()). Alle Daten sind synthetisch.
 */

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(
    jest.fn(() => ({ getState: () => ({ completeStep: jest.fn() }) })),
    { getState: jest.fn(() => ({ completeStep: jest.fn() })) }
  ),
}));
jest.mock('@/utils/supabase/client', () => ({ createClient: jest.fn(() => ({})) }));
// Tabelle durch einen Stub ersetzen, der die ihr übergebenen Mieterfelder sichtbar macht
jest.mock('@/components/tables/apartment-table', () => ({
  ApartmentTable: ({ initialApartments }: { initialApartments: Wohnung[] }) => (
    <ul>
      {initialApartments.map((a) => (
        <li key={a.id} data-testid={`apt-${a.id}`}>
          {a.name}|{a.tenant ? a.tenant.name : a.tenantAccess === false ? 'kein-zugriff' : 'kein-mieter'}
        </li>
      ))}
    </ul>
  ),
}));

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const MESSAGE = /Rechte konnten nicht geprüft werden, Mieterdaten werden möglicherweise fälschlich ausgeblendet/;

const hidden = (extra: Partial<Wohnung> = {}): Wohnung[] => [
  { id: 'a1', name: 'Wohnung 1', groesse: 50, miete: 500, haus_id: 'h1', status: 'vermietet', Haeuser: { name: 'Musterhaus' }, tenantAccess: false, ...extra },
  { id: 'a2', name: 'Wohnung 2', groesse: 60, miete: 600, haus_id: 'h1', status: 'frei', Haeuser: { name: 'Musterhaus' }, tenantAccess: false, ...extra },
];

const props = (initialWohnungenData: Wohnung[]) => ({
  initialWohnungenData,
  housesData: [{ id: 'h1', name: 'Musterhaus' }],
  serverApartmentCount: initialWohnungenData.length,
  serverApartmentLimit: 10,
  serverUserIsEligibleToAdd: true,
  serverLimitReason: 'none' as const,
});

describe('WohnungenClientView - Hinweis bei fehlgeschlagener Mieter-Rechteprüfung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    (useModalStore as unknown as jest.Mock).mockReturnValue({ openWohnungModal: jest.fn() });
  });

  it('zeigt den Hinweis mit Knopf nur bei permissionCheckFailed', () => {
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut laden/ })).toBeEnabled();
    // Wohnungsdaten sind da, die Mieter sind ausgeblendet
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('Wohnung 1|kein-zugriff');
  });

  it('zeigt bei echtem denied (tenantAccess false, ohne Signal) keinen Hinweis', () => {
    render(<WohnungenClientView {...props(hidden())} />);

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Erneut laden/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
  });

  it('zeigt mit Mieterzugriff keinen Hinweis', () => {
    const data: Wohnung[] = [
      { id: 'a1', name: 'Wohnung 1', groesse: 50, miete: 500, haus_id: 'h1', status: 'vermietet', Haeuser: { name: 'Musterhaus' },
        tenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: '' } },
    ];
    render(<WohnungenClientView {...props(data)} />);

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it('"Erneut laden" holt nur /api/wohnungen, ohne die Seite neu zu laden; bei Erfolg erscheinen Mieter und der Hinweis verschwindet', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'a1', name: 'Wohnung 1', status: 'vermietet', tenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null } },
        { id: 'a2', name: 'Wohnung 2', status: 'frei', tenant: null },
      ]),
    });
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));

    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/wohnungen', expect.anything());
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('Wohnung 1|Erika Beispiel');
    expect(screen.getByTestId('apt-a2')).toHaveTextContent('Wohnung 2|kein-mieter');
  });

  it('bleibt der Check weiter fehlgeschlagen, bleiben Hinweis und Ausblendung bestehen (keine Mieter)', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'a1', name: 'Wohnung 1', status: 'vermietet', tenantAccess: false, permissionCheckFailed: true },
        { id: 'a2', name: 'Wohnung 2', status: 'frei', tenantAccess: false, permissionCheckFailed: true },
      ]),
    });
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
    expect(screen.getByRole('button', { name: /Erneut laden/ })).toBeEnabled();
  });

  it('tenantAccess false hat Vorrang: ein Mieter in einer widerspruechlichen Antwort wird nie uebernommen', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'a1', name: 'Wohnung 1', status: 'vermietet', tenantAccess: false, permissionCheckFailed: true, tenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null } },
      ]),
    });
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
    expect(screen.queryByText(/Erika Beispiel/)).not.toBeInTheDocument();
  });

  it('ergibt der Reload "Recht fehlt" (kein Signal), verschwindet der Hinweis, die Mieter bleiben ausgeblendet', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'a1', name: 'Wohnung 1', status: 'vermietet', tenantAccess: false },
        { id: 'a2', name: 'Wohnung 2', status: 'frei', tenantAccess: false },
      ]),
    });
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));

    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
  });

  it.each([
    ['503 vom Server', { ok: false, status: 503, json: () => Promise.resolve({ code: 'PERMISSION_CHECK_FAILED' }) }],
    ['Netzwerkfehler', null],
  ])('%s: Fehlermeldung, Mieter bleiben ausgeblendet, Hinweis bleibt', async (_label, response) => {
    const user = userEvent.setup();
    if (response) mockFetch.mockResolvedValue(response);
    else mockFetch.mockRejectedValue(new Error('offline'));
    render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
    expect(screen.getByRole('button', { name: /Erneut laden/ })).toBeEnabled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('verwirft das Reload-Ergebnis, wenn der Server neue Daten liefert (router.refresh)', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'a1', name: 'Wohnung 1', status: 'vermietet', tenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null } }]),
    });
    const { rerender } = render(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);
    await user.click(screen.getByRole('button', { name: /Erneut laden/ }));
    await waitFor(() => expect(screen.getByTestId('apt-a1')).toHaveTextContent('Erika Beispiel'));

    // neue Serverdaten: wieder fail-closed mit Signal
    rerender(<WohnungenClientView {...props(hidden({ permissionCheckFailed: true }))} />);

    expect(screen.getByTestId('apt-a1')).toHaveTextContent('kein-zugriff');
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });
});
