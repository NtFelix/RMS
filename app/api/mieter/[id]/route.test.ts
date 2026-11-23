/**
 * @jest-environment node
 */
import { GET, PATCH } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MIETER_LESE_SELECT } from '@/lib/mieter-schreibpfad';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6) und Personen-Stammdaten (GH-30) für GET/PATCH /api/mieter/[id].
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string; code?: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'update', 'eq']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => result);
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function jsonRequest(method: string, body: unknown) {
  const req = new Request('http://localhost/api/mieter/m1', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  (req as { json: () => Promise<unknown> }).json = async () => body;
  return req as never;
}

const params = Promise.resolve({ id: 'm1' });
const KAUTION_ALTFELD = { amount: 1500, paymentDate: '2025-01-01', status: 'Erhalten' };
const zeile = {
  id: 'm1',
  wohnung_id: null,
  person: { id: 'p1', anrede: 'frau', vorname: 'Erika', nachname: 'Beispiel', email: null, telefon: null },
};

describe('/api/mieter/[id]', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET', () => {
    it('liest mit expliziter Spaltenliste ohne "kaution" und ohne Personenspalten (mit eingebetteter Wohnung)', async () => {
      const builder = createBuilder({ data: zeile, error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

      const res = await GET(new Request('http://localhost/api/mieter/m1') as never, { params });

      expect(res.status).toBe(200);
      const selectArg: string = builder.select.mock.calls[0][0];
      expect(selectArg).toBe(`${MIETER_LESE_SELECT}, Wohnungen(id, name)`);
      expect(selectArg).not.toMatch(/\*|kaution/i);
      expect(await res.json()).toMatchObject({ id: 'm1', name: 'Erika Beispiel' });
    });
  });

  describe('PATCH', () => {
    function mockClient(rpcResult: Result, leseResult: Result = { data: { ...zeile, notiz: 'Neu' }, error: null }) {
      const checkBuilder = createBuilder({ data: { wohnung_id: null }, error: null });
      const leseBuilder = createBuilder(leseResult);
      const from = jest.fn().mockReturnValueOnce(checkBuilder).mockReturnValueOnce(leseBuilder);
      mockRpc.mockResolvedValue(rpcResult);
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc: mockRpc });
      return { from, leseBuilder };
    }

    it('ändert über die RPC, verwirft "kaution" im Body und liest ohne Altfeld zurück', async () => {
      const { leseBuilder } = mockClient({ data: null, error: null });

      const res = await PATCH(jsonRequest('PATCH', { notiz: 'Neu', kaution: KAUTION_ALTFELD }), { params });

      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', {
        p_mieter_id: 'm1',
        p_person: {},
        p_mieter: { notiz: 'Neu' },
      });
      expect(leseBuilder.select).toHaveBeenCalledWith(MIETER_LESE_SELECT);
    });

    it('lehnt eine Änderung ab (400), wenn nur das Altfeld "kaution" gesendet wird', async () => {
      const { from } = mockClient({ data: null, error: null });

      const res = await PATCH(jsonRequest('PATCH', { kaution: KAUTION_ALTFELD }), { params });

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('übersetzt den Wohnungswechsel-Fehler (23503, fk_mieter_mietverhaeltnis) in eine verständliche Meldung', async () => {
      mockClient({
        data: null,
        error: { code: '23503', message: 'update violates foreign key constraint "fk_mieter_mietverhaeltnis"' },
      });

      const res = await PATCH(jsonRequest('PATCH', { wohnung_id: 'w2' }), { params });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Die Wohnung kann hier nicht geändert werden, weil der Mieter zu einem Mietverhältnis gehört. Nutzen Sie im Abschnitt Mietverhältnis den Punkt „Umzug in eine andere Wohnung“.' });
    });

    it('gibt die Meldung der RPC ohne Präfix zurück (z. B. fehlende Vor- oder Nachnamen)', async () => {
      mockClient({ data: null, error: { code: 'PE004', message: 'PERSON_EINGABE_UNGUELTIG: Vor- oder Nachname ist erforderlich.' } });

      const res = await PATCH(jsonRequest('PATCH', { vorname: '', nachname: '' }), { params });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Vor- oder Nachname ist erforderlich.' });
    });
  });
});
