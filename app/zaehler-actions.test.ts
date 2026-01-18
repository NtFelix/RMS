
import {
  getWasserZaehlerForHausAction,
  createWasserZaehler,
  updateWasserZaehler,
  deleteWasserZaehler
} from '@/app/wasser-zaehler-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';
import { capturePostHogEvent } from '@/lib/posthog-helpers';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
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

describe('wasser-zaehler-actions', () => {
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
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getWasserZaehlerForHausAction', () => {
    it('uses RPC when available', async () => {
      const mockData = [{
        wohnungen: [],
        water_meters: [],
        water_readings: [],
        mieter: []
      }];
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await getWasserZaehlerForHausAction('house1');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_wasser_zaehler_for_haus', {
        haus_id_param: 'house1',
        user_id_param: 'user1'
      });
    });

    it('falls back to manual queries if RPC not found (42883)', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '42883' } });

      // Setup fallback mocks using mockImplementation for `from` to return table-specific chains.
      // Each chain is "thenable" to act like a Promise for the fallback query logic.

      // Let's rely on the fact that different chains are initiated.
      // But `mockReturnThis()` means they share the state.
      // We can use `mockImplementationOnce` on the final `order` or `select` if needed,
      // but the chains are:
      // 1. from('Wohnungen')...order() -> returns Promise
      // 2. from('Zaehler')...order() -> returns Promise
      // 3. from('Zaehler_Ablesungen')...order() -> returns Promise (inside Promise.all)
      // 4. from('Mieter')...order() -> returns Promise (inside Promise.all)

      // We can mock `from` to return different objects based on table name?
      mockSupabase.from.mockImplementation((table: string) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: (resolve: any) => { // Make it thenable to act like a promise
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

      const result = await getWasserZaehlerForHausAction('house1');

      expect(result.success).toBe(true);
      expect(result.data?.waterMeters).toHaveLength(1);
    });

    it('returns error on unexpected RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await getWasserZaehlerForHausAction('house1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('DB Error');
    });
  });

  describe('createWasserZaehler', () => {
    it('creates a meter successfully', async () => {
      const payload = { wohnung_id: 'w1', custom_id: 'M1' } as any;
      mockSupabase.single.mockResolvedValue({ data: { id: 'm1', ...payload }, error: null });

      const result = await createWasserZaehler(payload);

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ user_id: 'user1' })]));
      expect(capturePostHogEvent).toHaveBeenCalled();
    });
  });

  describe('updateWasserZaehler', () => {
    it('updates a meter successfully', async () => {

      // Just reset the single mock to return success for both check and update
      // Actually the implementation calls single() twice.
      // 1. check existing
      // 2. update result

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'm1', user_id: 'user1' }, error: null }) // check
          .mockResolvedValueOnce({ data: { id: 'm1', custom_id: 'New' }, error: null }) // update
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await updateWasserZaehler('m1', { custom_id: 'New' });

      expect(result.success).toBe(true);
      expect(chain.update).toHaveBeenCalled();
    });

    it('prevents update of others meters', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'm1', user_id: 'other' }, error: null })
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await updateWasserZaehler('m1', { custom_id: 'New' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Keine Berechtigung');
    });
  });

  describe('deleteWasserZaehler', () => {
    it('deletes a meter successfully', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'm1', user_id: 'user1' }, error: null })
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await deleteWasserZaehler('m1');

      expect(result.success).toBe(true);
      expect(chain.delete).toHaveBeenCalled();
    });
  });
});
