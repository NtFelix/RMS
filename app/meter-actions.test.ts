
import {
  getMeterForHausAction,
  createZaehler,
  updateZaehler,
  deleteZaehler
} from '@/app/meter-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';
import { capturePostHogEvent } from '@/lib/posthog-helpers';
import { checkPermission } from '@/lib/permissions';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn()
}));

jest.mock('@/lib/posthog-helpers', () => ({
  capturePostHogEvent: jest.fn()
}));

// Mock console to avoid noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('meter-actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user1' };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
      },
      rpc: jest.fn(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getMeterForHausAction', () => {
    it('uses RPC when available', async () => {
      const mockData = [{
        wohnungen: [],
        meters: [],
        readings: [],
        mieter: []
      }];
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await getMeterForHausAction('house1');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_zaehler_for_haus', {
        haus_id_param: 'house1'
      });
    });

    it('falls back to manual queries if RPC not found (42883)', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '42883' } });

      mockSupabase.from.mockImplementation((table: string) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: (resolve: any) => {
            let data: any[] = [];
            if (table === 'Wohnungen') data = [{ id: 'w1', haus_id: 'house1' }];
            if (table === 'Zaehler') data = [{ id: 'm1', wohnung_id: 'w1' }];
            if (table === 'Zaehler_Ablesungen') data = [{ id: 'r1', zaehler_id: 'm1' }];
            if (table === 'Mieter') data = [{ id: 't1', wohnung_id: 'w1' }];
            resolve({ data, error: null });
          }
        };
        return chain;
      });

      const result = await getMeterForHausAction('house1');

      expect(result.success).toBe(true);
      expect(result.data?.meters).toHaveLength(1);
    });

    it('returns error on unexpected RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await getMeterForHausAction('house1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('DB Error');
    });
  });

  describe('getMeterForHausAction: Mieterdaten nur mit mieter:ansehen', () => {
    // Synthetische Daten
    const tenant = { id: 't1', name: 'Test Mieter', wohnung_id: 'w1', einzug: '2024-01-01', auszug: null };
    const mockCheck = checkPermission as jest.Mock;

    afterEach(() => {
      mockCheck.mockReset();
      mockCheck.mockResolvedValue('allowed');
    });

    const mockRpcWithTenant = () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ wohnungen: [{ id: 'w1' }], meters: [{ id: 'm1', wohnung_id: 'w1' }], readings: [], mieter: [tenant] }],
        error: null
      });
    };

    const mockFallbackWithTenant = () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '42883' } });
      const tables: string[] = [];
      mockSupabase.from.mockImplementation((table: string) => {
        tables.push(table);
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: (resolve: any) => {
            let data: any[] = [];
            if (table === 'Wohnungen') data = [{ id: 'w1', haus_id: 'house1' }];
            if (table === 'Zaehler') data = [{ id: 'm1', wohnung_id: 'w1' }];
            if (table === 'Mieter') data = [tenant];
            resolve({ data, error: null });
          }
        };
      });
      return tables;
    };

    describe.each([
      ['RPC', mockRpcWithTenant],
      ['Fallback', mockFallbackWithTenant]
    ])('%s', (_name, setup) => {
      it('liefert die Mieter mit mieter:ansehen', async () => {
        mockCheck.mockResolvedValue('allowed');
        setup();

        const result = await getMeterForHausAction('house1');

        expect(result.success).toBe(true);
        expect(result.data?.mieter).toEqual([expect.objectContaining({ id: 't1', name: 'Test Mieter' })]);
        expect(result.data).not.toHaveProperty('tenantAccess');
        expect(mockCheck).toHaveBeenCalledWith('mieter', 'ansehen');
      });

      it('hält die Mieter ohne mieter:ansehen zurück (Zähler bleiben)', async () => {
        mockCheck.mockResolvedValue('denied');
        setup();

        const result = await getMeterForHausAction('house1');

        expect(result.success).toBe(true);
        expect(result.data?.meters).toHaveLength(1);
        expect(result.data?.mieter).toEqual([]);
        expect(result.data?.tenantAccess).toBe(false);
        expect(result.data).not.toHaveProperty('permissionCheckFailed');
        expect(JSON.stringify(result)).not.toContain('Test Mieter');
        expect(mockCheck).toHaveBeenCalledTimes(1);
      });

      it('fail-closed: schlägt die Prüfung (auch nach Wiederholung) fehl, bleiben die Mieter zurückgehalten und es wird permissionCheckFailed gemeldet', async () => {
        mockCheck.mockResolvedValue('error');
        setup();

        const result = await getMeterForHausAction('house1');

        expect(result.success).toBe(true);
        expect(result.data?.meters).toHaveLength(1);
        expect(result.data?.mieter).toEqual([]);
        expect(result.data?.tenantAccess).toBe(false);
        expect(result.data?.permissionCheckFailed).toBe(true);
        expect(JSON.stringify(result)).not.toContain('Test Mieter');
        expect(mockCheck).toHaveBeenCalledTimes(2);
      });

      it('wiederholt eine fehlgeschlagene Prüfung einmal; danach allowed liefert die Mieter', async () => {
        mockCheck.mockResolvedValueOnce('error').mockResolvedValueOnce('allowed');
        setup();

        const result = await getMeterForHausAction('house1');

        expect(result.data?.mieter).toEqual([expect.objectContaining({ id: 't1' })]);
        expect(result.data).not.toHaveProperty('tenantAccess');
      });
    });

    describe('Prüfung von mieter:ansehen auf Pfaden ohne Mieterdaten', () => {
      const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
      // Longer than the retry pause (200 ms): an unaborted retry would have run by then
      const PAST_RETRY_PAUSE_MS = 350;

      it('RPC-Fehler: die ausgefallene Prüfung wird nicht wiederholt (kein Retry im Hintergrund)', async () => {
        mockCheck.mockResolvedValue('error');
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

        const result = await getMeterForHausAction('house1');
        await sleep(PAST_RETRY_PAUSE_MS);

        expect(result).toEqual({ success: false, message: 'DB Error' });
        expect(mockCheck).toHaveBeenCalledTimes(1);
      });

      it('"Keine Daten gefunden.": die ausgefallene Prüfung wird nicht wiederholt', async () => {
        mockCheck.mockResolvedValue('error');
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

        const result = await getMeterForHausAction('house1');
        await sleep(PAST_RETRY_PAUSE_MS);

        expect(result).toEqual({ success: false, message: 'Keine Daten gefunden.' });
        expect(mockCheck).toHaveBeenCalledTimes(1);
      });

      it('wirft die Prüfung selbst und die RPC schlägt fehl: die Aktion antwortet normal, keine unbehandelte Ablehnung', async () => {
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => unhandled.push(reason);
        process.on('unhandledRejection', onUnhandled);
        try {
          mockCheck.mockRejectedValue(new Error('check boom'));
          mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

          const result = await getMeterForHausAction('house1');
          await sleep(50);

          expect(result).toEqual({ success: false, message: 'DB Error' });
          expect(unhandled).toEqual([]);
        } finally {
          process.off('unhandledRejection', onUnhandled);
        }
      });

      it('Ausnahme der RPC: die ausgefallene Prüfung wird nicht wiederholt', async () => {
        mockCheck.mockResolvedValue('error');
        mockSupabase.rpc.mockRejectedValue(new Error('network'));

        const result = await getMeterForHausAction('house1');
        await sleep(PAST_RETRY_PAUSE_MS);

        expect(result.success).toBe(false);
        expect(mockCheck).toHaveBeenCalledTimes(1);
      });

      it('Fallback ohne Wohnungen im Haus: die ausgefallene Prüfung wird nicht wiederholt', async () => {
        mockCheck.mockResolvedValue('error');
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '42883' } });
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], error: null })
        }));

        const result = await getMeterForHausAction('house1');
        await sleep(PAST_RETRY_PAUSE_MS);

        expect(result.success).toBe(true);
        expect(mockCheck).toHaveBeenCalledTimes(1);
      });

      it('Normalfall bleibt parallel: die Prüfung läuft, während die RPC noch aussteht', async () => {
        mockCheck.mockResolvedValue('allowed');
        let resolveRpc: (value: unknown) => void = () => {};
        mockSupabase.rpc.mockReturnValue(new Promise(resolve => { resolveRpc = resolve; }));

        const pending = getMeterForHausAction('house1');
        await sleep(20);

        expect(mockSupabase.rpc).toHaveBeenCalled();
        expect(mockCheck).toHaveBeenCalledWith('mieter', 'ansehen'); // already started, RPC still open

        resolveRpc({ data: [{ wohnungen: [], meters: [], readings: [], mieter: [tenant] }], error: null });
        expect((await pending).data?.mieter).toEqual([expect.objectContaining({ id: 't1' })]);
      });

      it('Fallback wartet mit den Wohnungs-/Zähler-Abfragen nicht auf die Prüfung', async () => {
        let resolveCheck: (value: string) => void = () => {};
        mockCheck.mockReturnValue(new Promise(resolve => { resolveCheck = resolve; }));
        const tables = mockFallbackWithTenant();

        const pending = getMeterForHausAction('house1');
        await sleep(20);

        expect(tables).toEqual(['Wohnungen', 'Zaehler']); // queried while the check is still open, Mieter not yet

        resolveCheck('allowed');
        const result = await pending;
        expect(tables).toContain('Mieter');
        expect(result.data?.mieter).toEqual([expect.objectContaining({ id: 't1' })]);
      });
    });

    it('Fallback liest die Mieter-Tabelle ohne mieter:ansehen gar nicht', async () => {
      mockCheck.mockResolvedValue('denied');
      const tables = mockFallbackWithTenant();

      await getMeterForHausAction('house1');

      expect(tables).not.toContain('Mieter');
    });
  });

  describe('createZaehler', () => {
    it('creates a meter successfully', async () => {
      const payload = { wohnung_id: 'w1', custom_id: 'M1' } as any;
      mockSupabase.single.mockResolvedValue({ data: { id: 'm1', ...payload }, error: null });

      const result = await createZaehler(payload);

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith([payload]);
      expect(capturePostHogEvent).toHaveBeenCalled();
    });
  });

  describe('updateZaehler', () => {
    it('updates a meter successfully', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'm1' }, error: null }) // For pre-check
          .mockResolvedValueOnce({ data: { id: 'm1', custom_id: 'New' }, error: null }) // For update result
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await updateZaehler('m1', { custom_id: 'New' });

      expect(result.success).toBe(true);
      expect(chain.update).toHaveBeenCalled();
      expect(chain.single).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteZaehler', () => {
    it('deletes a meter successfully', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'm1' }, error: null })
      };
      mockSupabase.from.mockReturnValue(chain);
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await deleteZaehler('m1');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Zaehler',
        p_record_id: 'm1',
      });
    });
  });
});
