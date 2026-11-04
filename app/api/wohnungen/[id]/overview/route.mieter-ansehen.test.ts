/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/wohnungen/[id]/overview: die Mieterliste (Name, Kontakt, Ein-/Auszug) nur mit mieter:ansehen.
 * Ohne das Recht bleibt der Status (frei/vermietet) erhalten. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const wohnungId = '550e8400-e29b-41d4-a716-446655440000';

const mieterRows = [
  { id: 'mieter-1', name: 'Erika Beispiel', email: 'erika@example.invalid', telefonnummer: '000', einzug: '2020-01-01', auszug: null },
  { id: 'mieter-2', name: 'Max Muster', email: 'max@example.invalid', telefonnummer: '111', einzug: '2015-01-01', auszug: '2016-01-01' },
];

/** Thenable Builder; `select(spalten)` begrenzt die gelieferten Spalten (wie PostgREST). */
function mieterBuilder(rows: Array<Record<string, unknown>>) {
  let result: unknown[] = rows;
  const builder: Record<string, unknown> = {};
  builder.select = jest.fn((columns: string) => {
    const wanted = columns.split(',').map(c => c.trim());
    result = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => wanted.includes(k))));
    return builder;
  });
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: result, error: null }).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function setup(rows = mieterRows) {
  const wohnungBuilder: Record<string, jest.Mock> = {};
  wohnungBuilder.select = jest.fn(() => wohnungBuilder);
  wohnungBuilder.eq = jest.fn(() => wohnungBuilder);
  wohnungBuilder.single = jest.fn(async () => ({
    data: { id: wohnungId, name: 'Wohnung 1', groesse: 50, miete: 800, haus_id: null, Haeuser: [{ name: 'Musterhaus' }] },
    error: null,
  }));
  const mieter = mieterBuilder(rows);
  const from = jest.fn((table: string) => (table === 'Wohnungen' ? wohnungBuilder : mieter));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { mieter, from };
}

function mockMieterAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/wohnungen/${wohnungId}/overview`), { params: Promise.resolve({ id: wohnungId }) });

describe('GET /api/wohnungen/[id]/overview: mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit mieter:ansehen die Mieterliste wie bisher', async () => {
    mockMieterAnsehen('allowed');
    const { mieter } = setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mieter.select).toHaveBeenCalledWith('id, name, email, telefonnummer, einzug, auszug');
    expect(body.mieter).toEqual([
      expect.objectContaining({ id: 'mieter-1', name: 'Erika Beispiel', email: 'erika@example.invalid', status: 'active' }),
      expect.objectContaining({ id: 'mieter-2', name: 'Max Muster', status: 'moved_out' }),
    ]);
    expect(body).not.toHaveProperty('tenantAccess');
    expect(body).not.toHaveProperty('status');
  });

  it('liefert ohne mieter:ansehen keine Mieter (nur Auszugsdaten gelesen), markiert tenantAccess:false und behaelt den Status', async () => {
    mockMieterAnsehen('denied');
    const { mieter } = setup();

    const res = await call();
    const body = await res.json();
    const text = JSON.stringify(body);

    expect(res.status).toBe(200);
    expect(mieter.select).toHaveBeenCalledTimes(1);
    expect(mieter.select).toHaveBeenCalledWith('auszug');
    expect(body.mieter).toEqual([]);
    expect(body.tenantAccess).toBe(false);
    expect(body.status).toBe('vermietet');
    expect(body).toEqual(expect.objectContaining({ id: wohnungId, name: 'Wohnung 1', hausName: 'Musterhaus' }));
    for (const forbidden of ['Erika Beispiel', 'Max Muster', 'example.invalid', 'mieter-1', '2020-01-01']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('meldet ohne mieter:ansehen den Status frei, wenn alle Mieter ausgezogen sind', async () => {
    mockMieterAnsehen('denied');
    setup([mieterRows[1]]);

    const body = await (await call()).json();

    expect(body.status).toBe('frei');
    expect(body.tenantAccess).toBe(false);
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von mieter:ansehen fehlschlaegt, und liest keine Mieter', async () => {
    mockMieterAnsehen('error');
    const { mieter } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(mieter.select).not.toHaveBeenCalled();
  });
});
