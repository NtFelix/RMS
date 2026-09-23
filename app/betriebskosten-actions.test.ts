// Unmock the module we are testing because it is globally mocked in jest.setup.js
jest.unmock('./betriebskosten-actions');
jest.unmock('@/app/betriebskosten-actions');

import {
  createNebenkosten,
  updateNebenkosten,
  deleteNebenkosten,
  getNebenkostenDetailsAction,
  bulkDeleteNebenkosten,
  deleteRechnungenByNebenkostenId,
  createRechnungenBatch,
  getAbrechnungModalDataAction,
  createAbrechnungCalculationAction,
  createAbrechnungCalculationOptimizedAction
} from './betriebskosten-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { safeRpcCall } from '@/lib/error-handling';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

// Mock dependencies
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
  applyHaeuserScope: jest.fn((query, column, ids) => query),
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

// Mock error handling
jest.mock('@/lib/error-handling', () => ({
  safeRpcCall: jest.fn(),
  withRetry: jest.fn((fn) => fn()),
  generateUserFriendlyErrorMessage: jest.fn((err) => err.message),
}));

// Mock data types and utils that are imported but not used directly in the tests we write
jest.mock('../lib/data-fetching', () => ({
    // Mock exports if needed
}));

describe('betriebskosten-actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createNebenkosten', () => {
    const mockFormData = {
      startdatum: '2023-01-01',
      enddatum: '2023-12-31',
      nebenkostenart: ['Grundsteuer'],
      betrag: [100],
      berechnungsart: ['qm'],
      haeuser_id: 'house1',
    };

    it('should create nebenkosten when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'nb1', ...mockFormData },
        error: null,
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ id: 'nb1' }),
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        mockFormData
      ]);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('trims cost names before inserting', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: 'nb1' }, error: null });

      await createNebenkosten({ ...mockFormData, nebenkostenart: [' Grundsteuer '] });

      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({ nebenkostenart: ['Grundsteuer'] })
      ]);
    });

    it('rejects duplicate nach Rechnung names', async () => {
      const result = await createNebenkosten({
        ...mockFormData,
        nebenkostenart: ['Reparatur', 'Reparatur '],
        betrag: [40, 90],
        berechnungsart: ['nach Rechnung', 'nach Rechnung'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('"Reparatur" ist mehrfach');
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: false,
        message: 'Nicht authentifiziert',
        data: null,
      });
    });

    it('should handle insert error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: false,
        message: 'Insert failed',
        data: null,
      });
    });
  });

  describe('updateNebenkosten', () => {
    it('should update nebenkosten', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'nb1' },
        error: null,
      });

      const result = await updateNebenkosten('nb1', { wasserkosten: 50 });

      expect(result).toEqual({
        success: true,
        data: { id: 'nb1' },
      });
      expect(mockSupabase.update).toHaveBeenCalledWith({ wasserkosten: 50 });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nb1');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('rejects duplicate nach Rechnung names on update', async () => {
      const result = await updateNebenkosten('nb1', {
        nebenkostenart: ['Reparatur', 'Reparatur'],
        berechnungsart: ['nach Rechnung', 'nach Rechnung'],
      });

      expect(result.success).toBe(false);
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateNebenkosten('nb1', { wasserkosten: 50 });

      expect(result).toEqual({
        success: false,
        message: 'Update failed',
        data: null,
      });
    });
  });

  describe('deleteNebenkosten', () => {
    it('should delete nebenkosten', async () => {
      const result = await deleteNebenkosten('nb1');

      expect(result).toEqual({
        success: true,
        message: 'Nebenkosten erfolgreich gelöscht',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Nebenkosten',
        p_record_id: 'nb1',
      });
    });

    it('should handle delete error', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await deleteNebenkosten('nb1');

      expect(result).toEqual({
        success: false,
        message: 'Delete failed',
      });
    });
  });

  describe('bulkDeleteNebenkosten', () => {
    it('should delete multiple nebenkosten', async () => {
      const result = await bulkDeleteNebenkosten(['id1', 'id2']);

      expect(result).toEqual({
        success: true,
        count: 2,
        message: '2 Betriebskostenabrechnungen erfolgreich gelöscht',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Nebenkosten',
        p_record_id: 'id1',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Nebenkosten',
        p_record_id: 'id2',
      });
    });

    it('should return error if no ids provided', async () => {
      const result = await bulkDeleteNebenkosten([]);
      expect(result).toEqual({
        success: false,
        count: 0,
        message: 'Keine IDs zum Löschen angegeben',
      });
    });
  });

  describe('createRechnungenBatch', () => {
    const mockRechnungen = [
      { nebenkosten_id: 'nb1', mieter_id: 'm1', betrag: 100, name: 'R1' },
    ];

    it('should create batch rechnungen', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.select.mockResolvedValue({ data: [{}], error: null });

      const result = await createRechnungenBatch(mockRechnungen);

      expect(result).toEqual({ success: true, data: [{}] });
      expect(mockSupabase.insert).toHaveBeenCalledWith(mockRechnungen);
    });

    it('trims Rechnung names before inserting', async () => {
      mockSupabase.select.mockResolvedValue({ data: [{}], error: null });

      await createRechnungenBatch([{ ...mockRechnungen[0], name: 'R1 ' }]);

      expect(mockSupabase.insert).toHaveBeenCalledWith([expect.objectContaining({ name: 'R1' })]);
    });

    it('should handle error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.select.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await createRechnungenBatch(mockRechnungen);

      expect(result).toEqual({ success: false, message: 'Error', data: null });
    });
  });

  describe('getNebenkostenDetailsAction', () => {
    it('should return details', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const mockData = { id: 'nb1', user_id: 'user123' };
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getNebenkostenDetailsAction('nb1');

      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should handle error', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user123' } },
            error: null,
          });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await getNebenkostenDetailsAction('nb1');

      expect(result).toEqual({ success: false, message: 'Not found' });
    });
  });

  describe('deleteRechnungenByNebenkostenId', () => {
    it('should delete rechnungen', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user123' } },
          error: null,
        });

      const result = await deleteRechnungenByNebenkostenId('nb1');

      expect(result).toEqual({ success: true });
    });
  });
});

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
    for (const method of ['select', 'eq', 'in', 'lte', 'gte', 'or']) {
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

  it.each([
    [
      'createAbrechnungCalculationAction',
      createAbrechnungCalculationAction,
      { nebenkosten_data: nebenkosten, tenants, rechnungen, meters: [], readings: [] }
    ],
    [
      'createAbrechnungCalculationOptimizedAction',
      createAbrechnungCalculationOptimizedAction,
      {
        // Copy: the optimized action writes gesamtFlaeche onto nebenkosten_data
        nebenkosten_data: { ...nebenkosten },
        tenants_with_occupancy: tenants,
        rechnungen,
        wasserzaehler_meters: [],
        wasserzaehler_readings: [],
        house_metrics: { totalArea: 100 }
      }
    ]
  ])('%s bills each tenant their own Einzelbetrag', async (_name, action, rpcData) => {
    mockSupabaseWithTables({});
    (safeRpcCall as jest.Mock).mockResolvedValue({ success: true, data: [rpcData] });

    const result = await action('nk1');

    expect(result.success).toBe(true);
    expect(sharesByTenant(result)).toEqual({ a: 100, b: 200 });
  });
});
