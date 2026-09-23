// Unmock the module we are testing because it is globally mocked in jest.setup.js
jest.unmock('./betriebskosten-actions');
jest.unmock('@/app/betriebskosten-actions');

import {
  getAbrechnungModalDataAction,
  createAbrechnungCalculationAction,
  createAbrechnungCalculationOptimizedAction
} from './betriebskosten-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { safeRpcCall } from '@/lib/error-handling';

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
  requirePermission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn().mockResolvedValue(null),
  getAccessibleWohnungIds: jest.fn().mockResolvedValue(null),
  applyHaeuserScope: jest.fn((query) => query),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn().mockReturnValue({
    capture: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/error-handling', () => ({
  safeRpcCall: jest.fn(),
  withRetry: jest.fn((fn) => fn()),
  generateUserFriendlyErrorMessage: jest.fn((err) => err.message),
}));

jest.mock('../lib/data-fetching', () => ({}));

const nebenkosten = {
  id: 'nk1',
  haeuser_id: 'h1',
  startdatum: '2023-01-01',
  enddatum: '2023-12-31',
  nebenkostenart: ['Schornstein'],
  betrag: [300], // sum of all tenants' Einzelbeträge
  berechnungsart: ['nach Rechnung'],
  vorauszahlungs_art: 'soll'
};

const tenants = [
  { id: 'a', name: 'A', einzug: '2020-01-01', auszug: null, wohnung_id: 'wa', Wohnungen: { name: 'WA', groesse: 50, haus_id: 'h1' } },
  { id: 'b', name: 'B', einzug: '2020-01-01', auszug: null, wohnung_id: 'wb', Wohnungen: { name: 'WB', groesse: 50, haus_id: 'h1' } }
];

const rechnungen = [
  { id: 'r1', nebenkosten_id: 'nk1', mieter_id: 'a', name: 'Schornstein', betrag: 100 },
  { id: 'r2', nebenkosten_id: 'nk1', mieter_id: 'b', name: 'Schornstein', betrag: 200 }
];

/**
 * Supabase mock whose query builders resolve to a per-table result,
 * both when awaited directly and via .single().
 */
function mockSupabaseWithTables(tables: Record<string, { data: unknown; error: unknown }>) {
  const builderFor = (table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const builder: any = {};
    for (const method of ['select', 'eq', 'in', 'lte', 'gte', 'or', 'is', 'order']) {
      builder[method] = jest.fn(() => builder);
    }
    builder.single = jest.fn(() => Promise.resolve(result));
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return builder;
  };

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } }, error: null }),
    },
    from: jest.fn((table: string) => builderFor(table)),
  };
  (createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase);
  return supabase;
}

const sharesByTenant = (result: any) =>
  Object.fromEntries(
    result.data.tenantCalculations.map((t: any) => [t.tenantId, t.operatingCosts.costItems[0].tenantShare])
  );

describe('Abrechnung actions — nach Rechnung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails in the fallback path when Rechnungen cannot be loaded for a nach Rechnung item', async () => {
    mockSupabaseWithTables({
      Nebenkosten: { data: nebenkosten, error: null },
      Mieter: { data: tenants, error: null },
      Rechnungen: { data: null, error: { message: 'timeout' } }
    });
    (safeRpcCall as jest.Mock).mockResolvedValue({ success: false, message: 'rpc down' });

    const result = await getAbrechnungModalDataAction('nk1');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Fehler beim Laden der Einzelrechnungen.');
  });

  it('still loads in the fallback path when Rechnungen fail but no item is nach Rechnung', async () => {
    mockSupabaseWithTables({
      Nebenkosten: { data: { ...nebenkosten, berechnungsart: ['pro Fläche'] }, error: null },
      Mieter: { data: tenants, error: null },
      Rechnungen: { data: null, error: { message: 'timeout' } }
    });
    (safeRpcCall as jest.Mock).mockResolvedValue({ success: false, message: 'rpc down' });

    const result = await getAbrechnungModalDataAction('nk1');

    expect(result.success).toBe(true);
    expect(result.data?.rechnungen).toEqual([]);
  });

  it('createAbrechnungCalculationAction bills each tenant their own Einzelbetrag', async () => {
    mockSupabaseWithTables({});
    (safeRpcCall as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ nebenkosten_data: nebenkosten, tenants, rechnungen, meters: [], readings: [] }]
    });

    const result = await createAbrechnungCalculationAction('nk1');

    expect(result.success).toBe(true);
    expect(sharesByTenant(result)).toEqual({ a: 100, b: 200 });
  });

  it('createAbrechnungCalculationOptimizedAction bills each tenant their own Einzelbetrag', async () => {
    mockSupabaseWithTables({});
    (safeRpcCall as jest.Mock).mockResolvedValue({
      success: true,
      data: [{
        nebenkosten_data: { ...nebenkosten },
        tenants_with_occupancy: tenants,
        rechnungen,
        wasserzaehler_meters: [],
        wasserzaehler_readings: [],
        house_metrics: { totalArea: 100 }
      }]
    });

    const result = await createAbrechnungCalculationOptimizedAction('nk1');

    expect(result.success).toBe(true);
    expect(sharesByTenant(result)).toEqual({ a: 100, b: 200 });
  });
});
