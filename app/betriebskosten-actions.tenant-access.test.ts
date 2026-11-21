// Unmock the module we are testing because it is globally mocked in jest.setup.js
jest.unmock('./betriebskosten-actions');
jest.unmock('@/app/betriebskosten-actions');

import { getMeterModalDataAction, getWasserzaehlerByHausAndYearAction } from './betriebskosten-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { safeRpcCall } from '@/lib/error-handling';
import { checkPermission } from '@/lib/permissions';
import { fetchMeterReadingsByHausAndYear } from '../lib/data-fetching';

/**
 * Betriebskosten-Wasserzähler-Modal: Die Zeilen sind Mieter (Name, ID). Sie verlassen die Actions nur mit
 * mieter:ansehen (fail-closed bei denied und bei Prüfungsfehler nach einem Retry). Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logging-middleware', () => ({ logAction: jest.fn() }));
jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn().mockReturnValue({ capture: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/lib/posthog-logger', () => ({ posthogLogger: { flush: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.mock('@/lib/error-handling', () => ({
  safeRpcCall: jest.fn(),
  withRetry: jest.fn((fn) => fn()),
  generateUserFriendlyErrorMessage: jest.fn((err) => err.message),
}));
jest.mock('../lib/data-fetching', () => ({ fetchMeterReadingsByHausAndYear: jest.fn() }));

const mockCheck = checkPermission as jest.Mock;
const mockRpc = safeRpcCall as jest.Mock;
const mockFetchReadings = fetchMeterReadingsByHausAndYear as jest.Mock;

const NAME = 'Test Mieter';
const modalRow = {
  mieter_id: 't1',
  mieter_name: NAME,
  wohnung_name: 'Wohnung 1A',
  wohnung_groesse: 60,
  meter_id: 'm1',
  meter_type: 'kaltwasser',
  custom_id: 'Z-001',
  current_reading: null,
  previous_reading: null,
};

const nebenkosten = { haeuser_id: 'h1', startdatum: '2024-01-01', enddatum: '2024-12-31' };
const fallbackTenant = {
  id: 't1',
  name: NAME,
  einzug: '2023-01-01',
  auszug: null,
  wohnung_id: 'w1',
  Wohnungen: { id: 'w1', name: 'Wohnung 1A', groesse: 60, haus_id: 'h1' },
};

/** Supabase mock for the fallback path; records which tables were read. */
function mockSupabaseTables() {
  const tables: string[] = [];
  const builderFor = (table: string) => {
    tables.push(table);
    let data: unknown = [];
    if (table === 'Nebenkosten') data = nebenkosten;
    if (table === 'Mieter') data = [fallbackTenant];
    if (table === 'Zaehler') data = [{ id: 'm1', wohnung_id: 'w1', zaehler_typ: 'kaltwasser', custom_id: 'Z-001' }];
    const result = { data, error: null };
    const builder: any = {};
    for (const method of ['select', 'eq', 'in', 'lte', 'gte', 'lt', 'or', 'order']) {
      builder[method] = jest.fn(() => builder);
    }
    builder.single = jest.fn(() => Promise.resolve(result));
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return builder;
  };
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }) },
    from: jest.fn(builderFor),
  });
  return tables;
}

const setupRpc = () => {
  mockSupabaseTables();
  mockRpc.mockResolvedValue({ success: true, data: [modalRow] });
};

const setupFallback = () => {
  const tables = mockSupabaseTables();
  mockRpc.mockResolvedValue({ success: false, message: 'function get_meter_modal_data does not exist' });
  return tables;
};

describe('getMeterModalDataAction: Mieter nur mit mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheck.mockReset();
  });

  describe.each([
    ['RPC', setupRpc],
    ['Fallback', setupFallback],
  ])('%s', (_name, setup) => {
    it('liefert die Mieterzeilen mit mieter:ansehen, ohne Sperrsignal', async () => {
      mockCheck.mockResolvedValue('allowed');
      setup();

      const result = await getMeterModalDataAction('nk1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([expect.objectContaining({ mieter_id: 't1', mieter_name: NAME })]);
      expect(result).not.toHaveProperty('tenantAccess');
      expect(mockCheck).toHaveBeenCalledWith('mieter', 'ansehen');
    });

    it('liefert ohne mieter:ansehen keine Mieterzeile und setzt tenantAccess:false', async () => {
      mockCheck.mockResolvedValue('denied');
      setup();

      const result = await getMeterModalDataAction('nk1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.tenantAccess).toBe(false);
      expect(result).not.toHaveProperty('permissionCheckFailed');
      expect(JSON.stringify(result)).not.toContain(NAME);
      expect(mockCheck).toHaveBeenCalledTimes(1); // denied is a decision: no retry
    });

    it('fail-closed: schlägt die Prüfung auch nach dem Retry fehl, bleibt es leer und permissionCheckFailed wird gemeldet', async () => {
      mockCheck.mockResolvedValue('error');
      setup();

      const result = await getMeterModalDataAction('nk1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.tenantAccess).toBe(false);
      expect(result.permissionCheckFailed).toBe(true);
      expect(JSON.stringify(result)).not.toContain(NAME);
      expect(mockCheck).toHaveBeenCalledTimes(2);
    });

    it('wiederholt eine fehlgeschlagene Prüfung einmal; danach allowed liefert die Mieterzeilen', async () => {
      mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');
      setup();

      const result = await getMeterModalDataAction('nk1');

      expect(result.data).toEqual([expect.objectContaining({ mieter_name: NAME })]);
      expect(result).not.toHaveProperty('tenantAccess');
      expect(mockCheck).toHaveBeenCalledTimes(2);
    });
  });

  it.each(['denied', 'error'] as const)('Fallback liest die Mieter-Tabelle bei %s gar nicht', async (decision) => {
    mockCheck.mockResolvedValue(decision);
    const tables = setupFallback();

    await getMeterModalDataAction('nk1');

    expect(tables).toContain('Nebenkosten');
    expect(tables).not.toContain('Mieter');
  });

  it('Fallback liest die Mieter-Tabelle mit mieter:ansehen (Gegenprobe)', async () => {
    mockCheck.mockResolvedValue('allowed');
    const tables = setupFallback();

    await getMeterModalDataAction('nk1');

    expect(tables).toContain('Mieter');
  });

  it('bei einem Fehler der RPC (ohne Fallback) kommen weder Zeilen noch Namen heraus', async () => {
    mockCheck.mockResolvedValue('denied');
    mockSupabaseTables();
    mockRpc.mockResolvedValue({ success: false, message: 'boom' });

    const result = await getMeterModalDataAction('nk1');

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain(NAME);
  });
});

describe('getWasserzaehlerByHausAndYearAction: Mieterliste nur mit mieter:ansehen', () => {
  const tenantRow = { id: 't1', name: NAME, wohnung_id: 'w1', einzug: '2023-01-01', auszug: null };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheck.mockReset();
    mockSupabaseTables();
    mockFetchReadings.mockResolvedValue({ mieterList: [tenantRow], existingReadings: [{ id: 'r1', mieter_id: 't1' }] });
  });

  it('liefert die Mieterliste mit mieter:ansehen', async () => {
    mockCheck.mockResolvedValue('allowed');

    const result = await getWasserzaehlerByHausAndYearAction('h1', '2024');

    expect(result.success).toBe(true);
    expect(result.data?.mieterList).toEqual([expect.objectContaining({ name: NAME })]);
    expect(result.data).not.toHaveProperty('tenantAccess');
  });

  it('liest ohne mieter:ansehen nichts und liefert tenantAccess:false', async () => {
    mockCheck.mockResolvedValue('denied');

    const result = await getWasserzaehlerByHausAndYearAction('h1', '2024');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ mieterList: [], existingReadings: [], tenantAccess: false });
    expect(mockFetchReadings).not.toHaveBeenCalled();
  });

  it('fail-closed: Prüfungsfehler nach Retry liefert nichts und permissionCheckFailed', async () => {
    mockCheck.mockResolvedValue('error');

    const result = await getWasserzaehlerByHausAndYearAction('h1', '2024');

    expect(result.data).toEqual({ mieterList: [], existingReadings: [], tenantAccess: false, permissionCheckFailed: true });
    expect(mockFetchReadings).not.toHaveBeenCalled();
    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it('error, dann allowed: liefert die Mieterliste', async () => {
    mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');

    const result = await getWasserzaehlerByHausAndYearAction('h1', '2024');

    expect(result.data?.mieterList).toHaveLength(1);
    expect(result.data).not.toHaveProperty('tenantAccess');
  });
});

describe('getMeterModalDataAction: Prüfung ohne Mieterdaten', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheck.mockReset();
  });

  it('auf dem RPC-Fehlerpfad bleibt kein Retry zurück (die Prüfung wird abgebrochen)', async () => {
    mockCheck.mockResolvedValue('error');
    mockSupabaseTables();
    mockRpc.mockResolvedValue({ success: false, message: 'boom' });

    const result = await getMeterModalDataAction('nk1');
    await new Promise((resolve) => setTimeout(resolve, 400)); // longer than the retry pause

    expect(result.success).toBe(false);
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });
});
