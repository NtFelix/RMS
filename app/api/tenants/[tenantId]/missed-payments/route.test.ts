/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6): Die Route liest den Mieter mit expliziter Spaltenliste
 * ohne "kaution" (die Zeile wird nur berechnet, aber nicht ausgeliefert).
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
  for (const method of ['select', 'eq', 'gte', 'order']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

describe('GET /api/tenants/[tenantId]/missed-payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('liest den Mieter mit expliziter Spaltenliste ohne "kaution" und ohne Wildcard', async () => {
    const mieterBuilder = createBuilder({
      data: { id: 'mieter-1', einzug: '2026-01-01', auszug: null, wohnung_id: 'wohnung-1', Wohnungen: { miete: 500 } },
      error: null,
    });
    const finanzenBuilder = createBuilder({ data: [], error: null });
    const from = jest.fn((table: string) => (table === 'Mieter' ? mieterBuilder : finanzenBuilder));
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET(new Request('http://localhost/api/tenants/mieter-1/missed-payments'), {
      params: Promise.resolve({ tenantId: 'mieter-1' }),
    });

    expect(res.status).toBe(200);
    const selectArg: string = mieterBuilder.select.mock.calls[0][0];
    expect(selectArg).not.toMatch(/\*|kaution/i);
    expect(selectArg).toContain('einzug');
    expect(selectArg).toContain('Wohnungen');
  });

  it('antwortet mit 404, wenn der Mieter nicht gefunden wird', async () => {
    const mieterBuilder = createBuilder({ data: null, error: { message: 'nicht gefunden' } });
    const from = jest.fn(() => mieterBuilder);
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET(new Request('http://localhost/api/tenants/mieter-x/missed-payments'), {
      params: Promise.resolve({ tenantId: 'mieter-x' }),
    });

    expect(res.status).toBe(404);
  });
});
