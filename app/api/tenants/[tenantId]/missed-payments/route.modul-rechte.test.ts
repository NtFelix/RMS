/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';

/**
 * GET /api/tenants/[tenantId]/missed-payments braucht mieter:ansehen UND finanzen:ansehen sowie Haus-Scope (ueber die
 * Wohnung des Mieters, vor dem Lesen der Mieteinnahmen). Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const tenantId = 'mieter-1';
const wohnungId = 'wohnung-1';

type Result = { data: unknown; error: { message: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'order']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function setup() {
  const mieterBuilder = createBuilder({
    data: { id: tenantId, name: 'Erika Beispiel', einzug: '2026-01-01', auszug: null, wohnung_id: wohnungId, Wohnungen: { miete: 500 } },
    error: null,
  });
  const finanzenBuilder = createBuilder({ data: [], error: null });
  const from = jest.fn((table: string) => (table === 'Mieter' ? mieterBuilder : finanzenBuilder));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from, mieterBuilder, finanzenBuilder };
}

type Check = 'allowed' | 'denied' | 'error';

function mockRights(rights: { mieter: Check; finanzen: Check }) {
  (checkPermission as jest.Mock).mockImplementation(async (modul: 'mieter' | 'finanzen') => rights[modul] ?? 'allowed');
}

const call = () =>
  GET(new Request(`http://localhost/api/tenants/${tenantId}/missed-payments`), { params: Promise.resolve({ tenantId }) });

describe('GET /api/tenants/[tenantId]/missed-payments: Modulrechte und Haus-Scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRights({ mieter: 'allowed', finanzen: 'allowed' });
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  it('liefert mit beiden Rechten ohne Scope-Einschraenkung wie bisher', async () => {
    const { from } = setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    expect(checkPermission).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(from).toHaveBeenCalledWith('Mieter');
    expect(from).toHaveBeenCalledWith('Finanzen');
    expect(body).toEqual(expect.objectContaining({ missedPayments: expect.any(Object), hasMissingPayments: expect.any(Boolean) }));
  });

  it('liefert mit beiden Rechten, wenn die Wohnung im Scope liegt', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue([wohnungId]);
    setup();

    const res = await call();

    expect(res.status).toBe(200);
  });

  it.each([
    ['mieter:ansehen', { mieter: 'denied', finanzen: 'allowed' }],
    ['finanzen:ansehen', { mieter: 'allowed', finanzen: 'denied' }],
  ] as const)('antwortet ohne %s mit 403 PERMISSION_DENIED und liest nichts', async (_label, rights) => {
    mockRights(rights);
    const { from } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['mieter:ansehen', { mieter: 'error', finanzen: 'allowed' }],
    ['finanzen:ansehen', { mieter: 'allowed', finanzen: 'error' }],
  ] as const)('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von %s fehlschlaegt', async (_label, rights) => {
    mockRights(rights);
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
  });

  it('antwortet 403 und liest keine Mieteinnahmen, wenn die Wohnung des Mieters ausserhalb des Scopes liegt', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['wohnung-anders']);
    const { from } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied' });
    expect(text).not.toContain('Erika Beispiel');
    expect(from).not.toHaveBeenCalledWith('Finanzen');
  });

  it('antwortet 403, wenn der Scope leer ist (kein Haus zugreifbar)', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue([]);
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith('Finanzen');
  });

  it('antwortet bei unbekanntem Mieter weiter mit 404', async () => {
    const mieterBuilder = createBuilder({ data: null, error: { message: 'nicht gefunden' } });
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => mieterBuilder) });

    const res = await call();

    expect(res.status).toBe(404);
  });
});
