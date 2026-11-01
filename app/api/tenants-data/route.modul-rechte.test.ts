/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/tenants-data liefert Mieter plus Mietzahlungen (Finanzen) und braucht deshalb mieter:ansehen UND
 * finanzen:ansehen. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type Result = { data: unknown; error: { message: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq', 'order']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function setupClient() {
  const mieterBuilder = createBuilder({
    data: [{ id: 'mieter-1', name: 'Erika Beispiel', wohnung_id: 'wohnung-1', einzug: '2023-01-01', auszug: null, Wohnungen: { id: 'wohnung-1', miete: 500 } }],
    error: null,
  });
  const finanzenBuilder = createBuilder({ data: [], error: null });
  const from = jest.fn((table: string) => (table === 'Mieter' ? mieterBuilder : finanzenBuilder));
  const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC nicht verfügbar' } });
  const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) };
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc, auth });
  return { from, rpc };
}

type Result3 = 'allowed' | 'denied' | 'error';

function mockRights(rights: { mieter: Result3; finanzen: Result3 }) {
  (checkPermission as jest.Mock).mockImplementation(async (modul: 'mieter' | 'finanzen') => rights[modul] ?? 'allowed');
}

const call = () => GET(new Request('http://localhost/api/tenants-data'));

describe('GET /api/tenants-data: mieter:ansehen und finanzen:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('liefert mit beiden Rechten die Mieter wie bisher', async () => {
    mockRights({ mieter: 'allowed', finanzen: 'allowed' });
    setupClient();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    expect(checkPermission).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0]).toEqual(expect.objectContaining({ id: 'mieter-1', name: 'Erika Beispiel', paid: false }));
  });

  it.each([
    ['mieter:ansehen', { mieter: 'denied', finanzen: 'allowed' }],
    ['finanzen:ansehen', { mieter: 'allowed', finanzen: 'denied' }],
    ['beiden Rechten', { mieter: 'denied', finanzen: 'denied' }],
  ] as const)('antwortet ohne %s mit 403 PERMISSION_DENIED und liest nichts', async (_label, rights) => {
    mockRights(rights);
    const { from, rpc } = setupClient();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Erika Beispiel');
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['mieter:ansehen', { mieter: 'error', finanzen: 'allowed' }],
    ['finanzen:ansehen', { mieter: 'allowed', finanzen: 'error' }],
  ] as const)('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von %s fehlschlaegt', async (_label, rights) => {
    mockRights(rights);
    const { from, rpc } = setupClient();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
