/**
 * @jest-environment node
 */
import { PATCH } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6) für PATCH /api/mieter/bulk-update.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string } | null };

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

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function mockClient(updateResult: Result) {
    const checkBuilder = createBuilder({ data: [{ wohnung_id: null }], error: null });
    const updateBuilder = createBuilder(updateResult);
    const from = jest.fn().mockReturnValueOnce(checkBuilder).mockReturnValueOnce(updateBuilder);
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
    return { from, updateBuilder };
  }

  it('verwirft "kaution" in den Updates und liest nur IDs zurück (keine Mieterzeilen)', async () => {
    const { updateBuilder } = mockClient({ data: [{ id: 'm1' }, { id: 'm2' }], error: null });

    const res = await PATCH(jsonRequest({ ids: ['m1', 'm2'], updates: { wohnung_id: 'w1', kaution: KAUTION_ALTFELD } }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ successCount: 2 });
    expect(updateBuilder.update).toHaveBeenCalledWith({ wohnung_id: 'w1' });
    expect(updateBuilder.select).toHaveBeenCalledWith('id');
  });

  it('lehnt die Anfrage ab (400), wenn nur das Altfeld "kaution" aktualisiert werden soll', async () => {
    const { from } = mockClient({ data: [], error: null });

    const res = await PATCH(jsonRequest({ ids: ['m1'], updates: { kaution: KAUTION_ALTFELD } }));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('lehnt fehlende Updates ab (400) statt mit einem Serverfehler zu antworten', async () => {
    const { from } = mockClient({ data: [], error: null });

    const res = await PATCH(jsonRequest({ ids: ['m1'] }));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
