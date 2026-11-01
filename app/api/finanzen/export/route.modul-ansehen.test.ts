/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';

/**
 * GET /api/finanzen/export braucht finanzen:ansehen; der vorhandene Objekt-Scope bleibt erhalten.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/lib/worker-client', () => ({
  generateCSV: jest.fn(async (rows: unknown[]) => new Response(JSON.stringify(rows), { status: 200 })),
}));

type Result = { data?: unknown; count?: number; error: { message: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq', 'gte', 'lte', 'or', 'order', 'range']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function setup() {
  let finanzenCalls = 0;
  const countBuilder = createBuilder({ count: 1, error: null });
  const dataBuilder = createBuilder({
    data: [{ name: 'Miete Testwohnung', datum: '2026-01-01', betrag: 500, ist_einnahmen: true, notiz: null, Wohnungen: { name: 'Wohnung 1' } }],
    error: null,
  });
  const emptyBuilder = createBuilder({ data: [], error: null });
  const from = jest.fn((table: string) => {
    if (table !== 'Finanzen') return emptyBuilder;
    finanzenCalls += 1;
    // 1st call: count query, 2nd: first batch, afterwards: empty batch (ends the loop)
    return finanzenCalls === 1 ? countBuilder : finanzenCalls === 2 ? dataBuilder : emptyBuilder;
  });
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from, countBuilder, dataBuilder };
}

function mockFinanzenAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'finanzen' ? result : 'allowed'));
}

const call = () => GET(new Request('http://localhost/api/finanzen/export'));

describe('GET /api/finanzen/export: finanzen:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  it('liefert mit finanzen:ansehen den Export wie bisher', async () => {
    mockFinanzenAnsehen('allowed');
    setup();

    const res = await call();
    const rows = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(rows).toEqual([expect.objectContaining({ Bezeichnung: 'Miete Testwohnung', Wohnung: 'Wohnung 1', Typ: 'Einnahme' })]);
  });

  it('behaelt den Objekt-Scope bei (Filter auf die zugreifbaren Wohnungen)', async () => {
    mockFinanzenAnsehen('allowed');
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['wohnung-1']);
    const { countBuilder, dataBuilder } = setup();

    const res = await call();

    expect(res.status).toBe(200);
    expect(countBuilder.in).toHaveBeenCalledWith('wohnung_id', ['wohnung-1']);
    expect(dataBuilder.in).toHaveBeenCalledWith('wohnung_id', ['wohnung-1']);
  });

  it('antwortet ohne finanzen:ansehen mit 403 PERMISSION_DENIED und liest keine Finanzdaten', async () => {
    mockFinanzenAnsehen('denied');
    const { from } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Miete Testwohnung');
    expect(from).not.toHaveBeenCalled();
  });

  it('antwortet auch bei leerem Scope ohne finanzen:ansehen mit 403 statt leerem CSV', async () => {
    mockFinanzenAnsehen('denied');
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue([]);
    setup();

    const res = await call();

    expect(res.status).toBe(403);
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von finanzen:ansehen fehlschlaegt', async () => {
    mockFinanzenAnsehen('error');
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
  });
});
