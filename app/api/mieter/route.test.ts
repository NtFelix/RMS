/**
 * @jest-environment node
 */
import { GET, POST, PUT } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MIETER_LESE_SELECT } from '@/lib/mieter-schreibpfad';
import { checkPermission } from '@/lib/permissions';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6) und Personen-Stammdaten (GH-30): Die Route liest ohne Altfeld und
 * ohne Personenspalten an "Mieter" (Person eingebettet), schreibt Personen- und Mieterfelder über die RPCs und nimmt
 * das Altfeld nicht an.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string; code?: string } | null };

/** Minimaler, verkettbarer Query-Builder; `then` liefert das Ergebnis (wie PostgREST), `single` ebenfalls. */
function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'match', 'eq', 'in']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => result);
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function jsonRequest(url: string, method: string, body: unknown): Request {
  const req = new Request(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  (req as { json: () => Promise<unknown> }).json = async () => body;
  return req;
}

/** Mieterzeile wie aus der Datenbank (Person eingebettet). */
const zeile = {
  id: 'm1',
  wohnung_id: null,
  person: { id: 'p1', anrede: 'keine_angabe', vorname: null, nachname: 'Beispiel Mieter', email: 'beispiel@example.invalid', telefon: null },
};

const KAUTION_ALTFELD = { amount: 1500, paymentDate: '2025-01-01', status: 'Erhalten' };

describe('/api/mieter', () => {
  let mockRpc: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (checkPermission as jest.Mock).mockResolvedValue('allowed');
    mockRpc = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET', () => {
    it('liest ohne Altfeld und ohne Personenspalten an "Mieter" und bildet die Person ab', async () => {
      const builder = createBuilder({ data: [zeile], error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

      const res = await GET();

      expect(res.status).toBe(200);
      expect(builder.select).toHaveBeenCalledWith(MIETER_LESE_SELECT);
      const select: string = builder.select.mock.calls[0][0];
      expect(select).not.toMatch(/\*|kaution/i);
      expect(select.split(', person:')[0]).not.toMatch(/\b(name|email|telefonnummer|status|bewerbung_\w+)\b/);
      const json = await res.json();
      expect(json[0]).toMatchObject({ id: 'm1', name: 'Beispiel Mieter', email: 'beispiel@example.invalid', telefonnummer: null });
    });
  });

  describe('GET ohne mieter:ansehen', () => {
    it('antwortet 403 und fragt die Datenbank nicht ab', async () => {
      (checkPermission as jest.Mock).mockImplementation(async (modul: string, aktion: string) => (modul === 'mieter' && aktion === 'ansehen' ? 'denied' : 'allowed'));
      const from = jest.fn();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

      const res = await GET();

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
      expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('GET wenn die Rechtepruefung selbst fehlschlaegt', () => {
    it('antwortet 503 PERMISSION_CHECK_FAILED statt 403 und fragt die Datenbank nicht ab', async () => {
      (checkPermission as jest.Mock).mockResolvedValue('error');
      const from = jest.fn();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

      const res = await GET();

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    const url = 'http://localhost/api/mieter';

    function mockClient(rpcResult: Result, leseResult: Result = { data: zeile, error: null }) {
      const builder = createBuilder(leseResult);
      mockRpc.mockResolvedValue(rpcResult);
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder), rpc: mockRpc });
      return { builder };
    }

    it('legt Person und Mieter über die RPC an, verwirft "kaution" und Systemfelder und liest ohne Altfeld zurück', async () => {
      const { builder } = mockClient({ data: { mieter_id: 'm1', person_id: 'p1' }, error: null });

      const res = await POST(
        jsonRequest(url, 'POST', {
          name: 'Beispiel Mieter',
          email: 'beispiel@example.invalid',
          kaution: KAUTION_ALTFELD,
          organisation_id: 'fremde-organisation',
          geloescht_am: '2025-01-01T00:00:00Z',
        })
      );

      expect(res.status).toBe(201);
      expect(mockRpc).toHaveBeenCalledWith('mieter_anlegen', {
        p_person: { nachname: 'Beispiel Mieter', email: 'beispiel@example.invalid' },
        p_mieter: {},
      });
      expect(builder.select).toHaveBeenCalledWith(MIETER_LESE_SELECT);
      expect(builder.eq).toHaveBeenCalledWith('id', 'm1');
    });

    it('legt bei status "bewerber" einen Bewerber über die RPC an', async () => {
      mockRpc.mockResolvedValue({ data: { bewerber_id: 'b1', person_id: 'p1' }, error: null });
      const from = jest.fn();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc: mockRpc });

      const res = await POST(jsonRequest(url, 'POST', { vorname: 'Bea', nachname: 'Neu', status: 'bewerber', wohnung_id: 'w1' }));

      expect(res.status).toBe(201);
      expect(mockRpc).toHaveBeenCalledWith('bewerber_anlegen', {
        p_person: { vorname: 'Bea', nachname: 'Neu' },
        p_bewerber: { wohnung_id: 'w1' },
      });
      expect(from).not.toHaveBeenCalled();
    });

    it('übersetzt den Fehler der RPC (fehlende Berechtigung) in 403 ohne technisches Präfix', async () => {
      mockClient({ data: null, error: { code: '42501', message: 'PERSON_KEIN_RECHT: Keine Berechtigung für Mieter.' } });

      const res = await POST(jsonRequest(url, 'POST', { nachname: 'Beispiel' }));

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Keine Berechtigung für Mieter.', code: '42501' });
    });

    it('protokolliert den Body nicht (keine personenbezogenen Daten in den Logs)', async () => {
      mockClient({ data: null, error: { code: 'PE004', message: 'PERSON_EINGABE_UNGUELTIG: Ungültige Anrede.' } });

      await POST(jsonRequest(url, 'POST', { name: 'Beispiel Mieter', email: 'beispiel@example.invalid' }));

      const logged = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(logged).not.toContain('Beispiel Mieter');
      expect(logged).not.toContain('beispiel@example.invalid');
    });

    it.each([[[]], [[{ name: 'a' }]], ['text'], [null]])('lehnt einen ungültigen Body ab (400): %p', async (body) => {
      const from = jest.fn();
      const rpc = jest.fn();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc });

      const res = await POST(jsonRequest(url, 'POST', body));

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    const url = 'http://localhost/api/mieter?id=m1';

    function mockClient(rpcResult: Result, leseResult: Result = { data: zeile, error: null }) {
      const checkBuilder = createBuilder({ data: { wohnung_id: null }, error: null });
      const leseBuilder = createBuilder(leseResult);
      const from = jest.fn().mockReturnValueOnce(checkBuilder).mockReturnValueOnce(leseBuilder);
      mockRpc.mockResolvedValue(rpcResult);
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc: mockRpc });
      return { from, leseBuilder };
    }

    it('ändert den Namen über die RPC (name wird Nachname), verwirft "kaution" und liest ohne Altfeld zurück', async () => {
      const { leseBuilder } = mockClient({ data: null, error: null });

      const res = await PUT(jsonRequest(url, 'PUT', { name: 'Neuer Name', kaution: KAUTION_ALTFELD }));

      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', {
        p_mieter_id: 'm1',
        p_person: { nachname: 'Neuer Name' },
        p_mieter: {},
      });
      expect(leseBuilder.select).toHaveBeenCalledWith(MIETER_LESE_SELECT);
    });

    it('übernimmt telefonnummer als Telefon und Anrede/Vorname/Nachname unverändert', async () => {
      mockClient({ data: null, error: null });

      await PUT(jsonRequest(url, 'PUT', { telefonnummer: '0171 1', anrede: 'herr', vorname: 'Max', nachname: 'Muster', notiz: 'Neu' }));

      expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', {
        p_mieter_id: 'm1',
        p_person: { telefon: '0171 1', anrede: 'herr', vorname: 'Max', nachname: 'Muster' },
        p_mieter: { notiz: 'Neu' },
      });
    });

    it('lehnt eine Änderung ab (400), wenn nur das Altfeld "kaution" gesendet wird', async () => {
      const { from } = mockClient({ data: null, error: null });

      const res = await PUT(jsonRequest(url, 'PUT', { kaution: KAUTION_ALTFELD }));

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
