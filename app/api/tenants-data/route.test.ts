/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getAccessibleWohnungIds } from '@/lib/object-scope';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6): Der Fallback der Route (ohne RPC bzw. bei eingeschränktem
 * Objektzugriff) liest Mieter mit expliziter Spaltenliste ohne "kaution".
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
  const mieterBuilder = createBuilder({ data: [], error: null });
  const finanzenBuilder = createBuilder({ data: [], error: null });
  const from = jest.fn((table: string) => (table === 'Mieter' ? mieterBuilder : finanzenBuilder));
  const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC nicht verfügbar' } });
  const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) };
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc, auth });
  return { from, rpc, mieterBuilder };
}

describe('GET /api/tenants-data (Fallback)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('liest Mieter im Fallback mit expliziter Spaltenliste ohne "kaution" und ohne Wildcard', async () => {
    const { rpc, mieterBuilder } = setupClient();

    const res = await GET(new Request('http://localhost/api/tenants-data'));

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('fetch_tenant_payment_dashboard_data');

    const selectArg: string = mieterBuilder.select.mock.calls[0][0];
    expect(selectArg).not.toMatch(/\*|kaution/i);
    expect(selectArg).toContain('Wohnungen');
    expect(selectArg).toContain('telefonnummer');
  });

  it('verwendet bei eingeschränktem Objektzugriff ebenfalls die explizite Spaltenliste (ohne RPC)', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValueOnce(['wohnung-1']);
    const { rpc, mieterBuilder } = setupClient();

    const res = await GET(new Request('http://localhost/api/tenants-data'));

    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
    expect(mieterBuilder.in).toHaveBeenCalledWith('wohnung_id', ['wohnung-1']);
    expect(mieterBuilder.select.mock.calls[0][0]).not.toMatch(/\*|kaution/i);
  });
});
