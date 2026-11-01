/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/search, Kategorie "apartment": `current_tenant` (Name, Einzug) nur mit mieter:ansehen.
 * Ohne das Recht bleibt der Status (rented/free) erhalten. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const wohnungRows = [
  { id: 'w1', name: 'Wohnung 1', groesse: 50, miete: 500, Haeuser: { name: 'Musterhaus' },
    Mieter: [{ name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null }] },
  { id: 'w2', name: 'Wohnung 2', groesse: 60, miete: 600, Haeuser: { name: 'Musterhaus' },
    Mieter: [{ name: 'Max Muster', einzug: '2015-01-01', auszug: '2016-01-01' }] },
];

/** Filtert die verschachtelten Mieterspalten nach dem `Mieter!left(...)`-Teil des Selects (wie PostgREST). */
function filterByEmbeddedColumns(columns: string) {
  const match = columns.match(/Mieter!left\(([^)]*)\)/);
  const wanted = match ? match[1].split(',').map(c => c.trim()) : [];
  return wohnungRows.map(w => ({
    ...w,
    Mieter: w.Mieter.map(m => Object.fromEntries(Object.entries(m).filter(([k]) => wanted.includes(k)))),
  }));
}

function setup() {
  const selects: string[] = [];
  let wohnungenCalls = 0;
  const from = jest.fn((table: string) => {
    let rows: unknown[] = [];
    if (table === 'Wohnungen') {
      wohnungenCalls += 1;
    }
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn((columns: string) => {
      if (table === 'Wohnungen') {
        selects.push(columns);
        // erster Aufruf = Namenssuche, weitere (Haus-Namenssuche) liefern nichts Neues
        rows = wohnungenCalls === 1 ? filterByEmbeddedColumns(columns) : [];
      }
      return builder;
    });
    for (const method of ['or', 'order', 'limit', 'not', 'eq', 'in', 'ilike']) {
      builder[method] = jest.fn(() => builder);
    }
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    return builder;
  });
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({
    from,
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
  });
  return { selects };
}

function mockMieterAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? result : 'allowed'));
}

const search = (categories = 'apartment') =>
  GET(new NextRequest(`http://localhost/api/search?q=Wohnung&categories=${categories}`));

describe('GET /api/search (apartment): mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  it('liefert mit mieter:ansehen current_tenant wie bisher', async () => {
    mockMieterAnsehen('allowed');
    const { selects } = setup();

    const res = await search();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(selects[0]).toContain('Mieter!left(name, einzug, auszug)');
    const [w1, w2] = data.results.apartment;
    expect(w1).toEqual(expect.objectContaining({ name: 'Wohnung 1', status: 'rented' }));
    expect(w1.current_tenant).toEqual({ name: 'Erika Beispiel', move_in_date: '2020-01-01' });
    expect(w1).not.toHaveProperty('tenant_access');
    expect(w2.status).toBe('free'); // ausgezogener Mieter: kein aktueller Mieter
    expect(w2.current_tenant).toBeUndefined();
  });

  it('liefert ohne mieter:ansehen kein current_tenant (nur auszug selektiert), aber den Status', async () => {
    mockMieterAnsehen('denied');
    const { selects } = setup();

    const res = await search();
    const data = await res.json();
    const text = JSON.stringify(data);

    expect(res.status).toBe(200);
    expect(selects[0]).toContain('Mieter!left(auszug)');
    expect(selects[0]).not.toMatch(/Mieter!left\([^)]*name/);
    const [w1, w2] = data.results.apartment;
    expect(w1).toEqual(expect.objectContaining({ name: 'Wohnung 1', status: 'rented', tenant_access: false }));
    expect(w2).toEqual(expect.objectContaining({ name: 'Wohnung 2', status: 'free', tenant_access: false }));
    for (const apt of data.results.apartment) {
      expect(apt.current_tenant).toBeUndefined();
    }
    for (const forbidden of ['Erika Beispiel', 'Max Muster', '2020-01-01']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von mieter:ansehen fehlschlaegt (Kategorie apartment)', async () => {
    mockMieterAnsehen('error');
    setup();

    const res = await search();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
  });

  it('prueft mieter:ansehen nicht, wenn die Kategorie apartment nicht gesucht wird', async () => {
    mockMieterAnsehen('error');
    setup();

    const res = await search('house');

    expect(res.status).toBe(200);
    expect(checkPermission).not.toHaveBeenCalledWith('mieter', 'ansehen');
  });
});
