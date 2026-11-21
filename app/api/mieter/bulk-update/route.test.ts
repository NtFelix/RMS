/**
 * @jest-environment node
 */
import { PATCH } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6) und Personen-Stammdaten (GH-30) für PATCH /api/mieter/bulk-update.
 * Jeder Mieter wird über die RPC mieter_aktualisieren geändert.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string; code?: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'update', 'in', 'eq']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function jsonRequest(body: unknown): Request {
  const req = new Request('http://localhost/api/mieter/bulk-update', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  (req as { json: () => Promise<unknown> }).json = async () => body;
  return req;
}

const KAUTION_ALTFELD = { amount: 1500, paymentDate: '2025-01-01', status: 'Erhalten' };

describe('PATCH /api/mieter/bulk-update', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function mockClient(rpcResult?: (id: string) => Result) {
    const checkBuilder = createBuilder({ data: [{ wohnung_id: null }], error: null });
    const from = jest.fn().mockReturnValueOnce(checkBuilder);
    mockRpc.mockImplementation(async (_name: string, args: { p_mieter_id: string }) => {
      const ergebnis = rpcResult?.(args.p_mieter_id) ?? { data: null, error: null };
      return ergebnis;
    });
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc: mockRpc });
    return { from };
  }

  it('verwirft "kaution" in den Updates und ändert jeden Mieter über die RPC', async () => {
    const { from } = mockClient();

    const res = await PATCH(jsonRequest({ ids: ['m1', 'm2'], updates: { wohnung_id: 'w1', kaution: KAUTION_ALTFELD } }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ successCount: 2 });
    expect(from).toHaveBeenCalledWith('Mieter');
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', { p_mieter_id: 'm1', p_person: {}, p_mieter: { wohnung_id: 'w1' } });
    expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', { p_mieter_id: 'm2', p_person: {}, p_mieter: { wohnung_id: 'w1' } });
  });

  it('übernimmt Personenfelder mit name -> nachname und telefonnummer -> telefon', async () => {
    mockClient();

    await PATCH(jsonRequest({ ids: ['m1'], updates: { telefonnummer: '0301' } }));

    expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', { p_mieter_id: 'm1', p_person: { telefon: '0301' }, p_mieter: {} });
  });

  it('lehnt die Anfrage ab (400), wenn nur das Altfeld "kaution" aktualisiert werden soll', async () => {
    const { from } = mockClient();

    const res = await PATCH(jsonRequest({ ids: ['m1'], updates: { kaution: KAUTION_ALTFELD } }));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('übersetzt den Wohnungswechsel-Fehler (23503, fk_mieter_mietverhaeltnis) in eine verständliche Meldung', async () => {
    mockClient(() => ({
      data: null,
      error: { message: 'update violates foreign key constraint "fk_mieter_mietverhaeltnis"', code: '23503' },
    }));

    const res = await PATCH(jsonRequest({ ids: ['m1'], updates: { wohnung_id: 'w2' } }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Die Wohnung kann hier nicht geändert werden, weil der Mieter zu einem Mietverhältnis gehört. Nutzen Sie im Abschnitt Mietverhältnis den Punkt „Umzug in eine andere Wohnung“.',
      successCount: 0,
    });
  });

  it('meldet einen Teilerfolg mit der Anzahl der geänderten Mieter', async () => {
    mockClient((id) => (id === 'm2' ? { data: null, error: { code: 'PE003', message: 'PERSON_NICHT_GEFUNDEN: Mieter nicht gefunden.' } } : { data: null, error: null }));

    const res = await PATCH(jsonRequest({ ids: ['m1', 'm2'], updates: { notiz: 'Neu' } }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Mieter nicht gefunden.', successCount: 1 });
  });

  it('lehnt fehlende Updates ab (400) statt mit einem Serverfehler zu antworten', async () => {
    const { from } = mockClient();

    const res = await PATCH(jsonRequest({ ids: ['m1'] }));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
