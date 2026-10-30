/**
 * @jest-environment node
 */
import { GET, POST, PUT } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MIETER_SPALTEN_OHNE_KAUTION } from '@/lib/mieter-columns';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6): Die Route liefert nur explizite Spalten ohne "kaution"
 * und nimmt das Altfeld nicht mehr aus dem Body an (Kautionsdaten sind an das Modul "kautionen" gebunden).
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

const KAUTION_ALTFELD = { amount: 1500, paymentDate: '2025-01-01', status: 'Erhalten' };

describe('/api/mieter', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET', () => {
    it('liest mit expliziter Spaltenliste ohne "kaution" und ohne Wildcard', async () => {
      const builder = createBuilder({ data: [{ id: 'm1', name: 'Beispiel Mieter' }], error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

      const res = await GET();

      expect(res.status).toBe(200);
      expect(builder.select).toHaveBeenCalledWith(MIETER_SPALTEN_OHNE_KAUTION);
      expect(builder.select.mock.calls[0][0]).not.toMatch(/\*|kaution/i);
    });
  });

  describe('POST', () => {
    const url = 'http://localhost/api/mieter';

    it('verwirft "kaution" und Systemfelder aus dem Body, übernimmt die übrigen Felder und liest ohne Altfeld zurück', async () => {
      const builder = createBuilder({ data: [{ id: 'm1', name: 'Beispiel Mieter' }], error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

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
      expect(builder.insert).toHaveBeenCalledWith({ name: 'Beispiel Mieter', email: 'beispiel@example.invalid' });
      expect(builder.select).toHaveBeenCalledWith(MIETER_SPALTEN_OHNE_KAUTION);
    });

    it('protokolliert den Body nicht (keine personenbezogenen Daten in den Logs)', async () => {
      const builder = createBuilder({ data: [{ id: 'm1' }], error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

      await POST(jsonRequest(url, 'POST', { name: 'Beispiel Mieter', email: 'beispiel@example.invalid' }));

      const logged = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(logged).not.toContain('Beispiel Mieter');
      expect(logged).not.toContain('beispiel@example.invalid');
    });

    it.each([[[]], [[{ name: 'a' }]], ['text'], [null]])('lehnt einen ungültigen Body ab (400): %p', async (body) => {
      const from = jest.fn();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

      const res = await POST(jsonRequest(url, 'POST', body));

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    const url = 'http://localhost/api/mieter?id=m1';

    function mockClient(updateResult: Result) {
      const checkBuilder = createBuilder({ data: { wohnung_id: null }, error: null });
      const updateBuilder = createBuilder(updateResult);
      const from = jest.fn().mockReturnValueOnce(checkBuilder).mockReturnValueOnce(updateBuilder);
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
      return { from, updateBuilder };
    }

    it('verwirft "kaution" im Body und liest ohne Altfeld zurück', async () => {
      const { updateBuilder } = mockClient({ data: [{ id: 'm1', name: 'Neuer Name' }], error: null });

      const res = await PUT(jsonRequest(url, 'PUT', { name: 'Neuer Name', kaution: KAUTION_ALTFELD }));

      expect(res.status).toBe(200);
      expect(updateBuilder.update).toHaveBeenCalledWith({ name: 'Neuer Name' });
      expect(updateBuilder.select).toHaveBeenCalledWith(MIETER_SPALTEN_OHNE_KAUTION);
    });

    it('lehnt eine Änderung ab (400), wenn nur das Altfeld "kaution" gesendet wird', async () => {
      const { from } = mockClient({ data: [], error: null });

      const res = await PUT(jsonRequest(url, 'PUT', { kaution: KAUTION_ALTFELD }));

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    });
  });
});
