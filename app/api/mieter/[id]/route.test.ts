/**
 * @jest-environment node
 */
import { GET, PATCH } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MIETER_SPALTEN_OHNE_KAUTION } from '@/lib/mieter-columns';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6) für GET/PATCH /api/mieter/[id].
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

describe('/api/mieter/[id]', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET', () => {
    it('liest mit expliziter Spaltenliste ohne "kaution" (und mit eingebetteter Wohnung)', async () => {
      const builder = createBuilder({ data: { id: 'm1', name: 'Beispiel Mieter', wohnung_id: null }, error: null });
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });

      const res = await GET(new Request('http://localhost/api/mieter/m1') as never, { params });

      expect(res.status).toBe(200);
      const selectArg: string = builder.select.mock.calls[0][0];
      expect(selectArg).toBe(`${MIETER_SPALTEN_OHNE_KAUTION}, Wohnungen(id, name)`);
      expect(selectArg).not.toMatch(/\*|kaution/i);
    });
  });

  describe('PATCH', () => {
    function mockClient(updateResult: Result) {
      const checkBuilder = createBuilder({ data: { wohnung_id: null }, error: null });
      const updateBuilder = createBuilder(updateResult);
      const from = jest.fn().mockReturnValueOnce(checkBuilder).mockReturnValueOnce(updateBuilder);
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
      return { from, updateBuilder };
    }

    it('verwirft "kaution" im Body und liest ohne Altfeld zurück', async () => {
      const { updateBuilder } = mockClient({ data: [{ id: 'm1', notiz: 'Neu' }], error: null });

      const res = await PATCH(jsonRequest('PATCH', { notiz: 'Neu', kaution: KAUTION_ALTFELD }), { params });

      expect(res.status).toBe(200);
      expect(updateBuilder.update).toHaveBeenCalledWith({ notiz: 'Neu' });
      expect(updateBuilder.select).toHaveBeenCalledWith(MIETER_SPALTEN_OHNE_KAUTION);
    });

    it('lehnt eine Änderung ab (400), wenn nur das Altfeld "kaution" gesendet wird', async () => {
      const { from } = mockClient({ data: [], error: null });

      const res = await PATCH(jsonRequest('PATCH', { kaution: KAUTION_ALTFELD }), { params });

      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    });
  });
});
