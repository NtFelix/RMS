/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/haeuser/[id]/overview: `currentTenant` je Wohnung nur mit mieter:ansehen.
 * Ohne das Recht bleiben Status und Zaehler (Vermietet/Frei) erhalten. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const hausId = '550e8400-e29b-41d4-a716-446655440000';

/** Zeilen enthalten alle Mieterspalten; geliefert werden nur die im verschachtelten Select angeforderten. */
const hausRow = {
  id: hausId,
  name: 'Musterhaus',
  strasse: 'Beispielweg 1',
  plz: 12345,
  ort: 'Beispielstadt',
  groesse: 200,
  Wohnungen: [
    {
      id: 'w1', name: 'Wohnung 1', groesse: 50, miete: 500,
      Mieter: [{ id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null }],
    },
    {
      id: 'w2', name: 'Wohnung 2', groesse: 60, miete: 600,
      Mieter: [{ id: 'm2', name: 'Max Muster', einzug: '2015-01-01', auszug: '2016-01-01' }],
    },
    { id: 'w3', name: 'Wohnung 3', groesse: 70, miete: 700, Mieter: [] },
  ],
};

function setup() {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn((columns: string) => {
    const match = columns.match(/Mieter \(([^)]*)\)/);
    const wanted = match ? match[1].split(',').map(c => c.trim()) : [];
    const filtered = {
      ...hausRow,
      Wohnungen: hausRow.Wohnungen.map(w => ({
        ...w,
        Mieter: w.Mieter.map(m => Object.fromEntries(Object.entries(m).filter(([k]) => wanted.includes(k)))),
      })),
    };
    builder.single = jest.fn(async () => ({ data: filtered, error: null }));
    return builder;
  });
  builder.eq = jest.fn(() => builder);
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });
  return builder;
}

function mockMieterAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/haeuser/${hausId}/overview`), { params: Promise.resolve({ id: hausId }) });

describe('GET /api/haeuser/[id]/overview: mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit mieter:ansehen currentTenant (id, name, einzug) wie bisher', async () => {
    mockMieterAnsehen('allowed');
    const builder = setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(builder.select.mock.calls[0][0]).toContain('Mieter (id, name, einzug, auszug)');
    expect(body.wohnungen[0]).toEqual(expect.objectContaining({
      status: 'vermietet',
      currentTenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01' },
    }));
    expect(body.wohnungen[1].status).toBe('frei');
    expect(body.wohnungen[2].status).toBe('frei');
    expect(body.tenantCount).toBe(1);
    expect(body).not.toHaveProperty('tenantAccess');
  });

  it('liefert ohne mieter:ansehen kein currentTenant (nur auszug selektiert), aber Status und Zaehler', async () => {
    mockMieterAnsehen('denied');
    const builder = setup();

    const res = await call();
    const body = await res.json();
    const text = JSON.stringify(body);

    expect(res.status).toBe(200);
    expect(builder.select.mock.calls[0][0]).toContain('Mieter (auszug)');
    expect(builder.select.mock.calls[0][0]).not.toMatch(/Mieter \([^)]*(name|id|einzug)/);
    expect(body.tenantAccess).toBe(false);
    expect(body.wohnungen.map((w: { status: string }) => w.status)).toEqual(['vermietet', 'frei', 'frei']);
    for (const w of body.wohnungen) {
      expect(w).not.toHaveProperty('currentTenant');
    }
    expect(body.tenantCount).toBe(1);
    expect(body.summaryStats.occupancyRate).toBeCloseTo(33.33, 1);
    expect(body.totalRent).toBe(500);
    for (const forbidden of ['Erika Beispiel', 'Max Muster', 'm1', '2020-01-01']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von mieter:ansehen fehlschlaegt, und laedt nichts', async () => {
    mockMieterAnsehen('error');
    const builder = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(builder.select).not.toHaveBeenCalled();
  });
});
