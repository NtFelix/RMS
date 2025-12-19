import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createNebenkosten,
  updateNebenkosten,
  deleteNebenkosten,
  bulkDeleteNebenkosten,
  getNebenkostenDetailsAction,
  createRechnungenBatch
} from '@/app/betriebskosten-actions';
import { logger } from '@/utils/logger';

// Unmock the module we are testing (it's mocked globally in jest.setup.js)
jest.unmock('@/app/betriebskosten-actions');

// Mocks
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }
}));

jest.mock('@/app/posthog-server.mjs', () => ({
    getPostHogServer: jest.fn(() => ({
        capture: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined),
    }))
}));

jest.mock('@/lib/posthog-logger', () => ({
    posthogLogger: {
        flush: jest.fn().mockResolvedValue(undefined),
    }
}));

describe('Betriebskosten Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock object where chaining returns the same object
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      },
    };

    // Explicitly return mockSupabase for chaining methods
    mockSupabase.from = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.insert = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.select = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.single = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.update = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.delete = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.eq = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.in = jest.fn().mockReturnValue(mockSupabase);

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createNebenkosten', () => {
    const formData = {
      startdatum: '2023-01-01',
      enddatum: '2023-12-31',
      nebenkostenart: ['Grundsteuer'],
      betrag: [100],
      berechnungsart: ['qm'],
      haeuser_id: 'house-123',
    };

    it('should create nebenkosten successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'new-id', ...formData },
        error: null
      });

      const result = await createNebenkosten(formData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          ...formData,
          user_id: 'test-user-id'
        })
      ]));
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should return error if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await createNebenkosten(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not authenticated');
    });

    it('should return error if database insert fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'DB Error' }
      });

      const result = await createNebenkosten(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('DB Error');
    });
  });

  describe('updateNebenkosten', () => {
    const updateData = {
        betrag: [200]
    };

    it('should update successfully', async () => {
        mockSupabase.single.mockResolvedValue({
            data: { id: 'nk-123', ...updateData },
            error: null
        });

        const result = await updateNebenkosten('nk-123', updateData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
        expect(mockSupabase.update).toHaveBeenCalledWith(updateData);
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nk-123');
        expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should handle errors during update', async () => {
        mockSupabase.single.mockResolvedValue({
            data: null,
            error: { message: 'Update Failed' }
        });

        const result = await updateNebenkosten('nk-123', updateData);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Update Failed');
    });
  });

  describe('deleteNebenkosten', () => {
      it('should delete successfully', async () => {
          // delete() returns builder (mockSupabase), eq() returns builder (mockSupabase)
          // The promise resolves to mockSupabase.
          // We need { error: null } to be returned when awaited.
          // Since we are mocking chaining by returning the object itself,
          // any method call that is "final" (awaited) needs to have properties like 'data' or 'error'
          // if the code destructures it.
          // In deleteNebenkosten: const { error } = await supabase...delete().eq(...)

          // So mockSupabase needs 'error' property.
          mockSupabase.error = null;

          const result = await deleteNebenkosten('nk-123');

          expect(result.success).toBe(true);
          expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
          expect(mockSupabase.delete).toHaveBeenCalled();
          expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nk-123');
          expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
      });

      it('should handle deletion error', async () => {
        mockSupabase.error = { message: 'Delete Failed' };

        const result = await deleteNebenkosten('nk-123');

        expect(result.success).toBe(false);
        expect(result.message).toBe('Delete Failed');
      });
  });

  describe('bulkDeleteNebenkosten', () => {
      it('should bulk delete successfully', async () => {
          mockSupabase.count = 2;
          mockSupabase.error = null;

          const result = await bulkDeleteNebenkosten(['id1', 'id2']);

          expect(result.success).toBe(true);
          expect(result.count).toBe(2);
          expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
          expect(mockSupabase.delete).toHaveBeenCalled();
          expect(mockSupabase.in).toHaveBeenCalledWith('id', ['id1', 'id2']);
          expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
      });

      it('should handle empty list', async () => {
          const result = await bulkDeleteNebenkosten([]);
          expect(result.success).toBe(false);
          expect(result.message).toBe("Keine IDs zum Löschen angegeben");
      });

      it('should handle error', async () => {
          mockSupabase.error = { message: 'Bulk Delete Failed' };

          const result = await bulkDeleteNebenkosten(['id1']);

          expect(result.success).toBe(false);
          expect(result.message).toBe('Bulk Delete Failed');
      });
  });

  describe('getNebenkostenDetailsAction', () => {
      it('should fetch details successfully', async () => {
          const mockData = { id: 'nk-123', user_id: 'test-user-id' };
          // single() overrides the default 'return this' behavior for this test
          mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

          const result = await getNebenkostenDetailsAction('nk-123');

          expect(result.success).toBe(true);
          expect(result.data).toEqual(mockData);
          expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
          expect(mockSupabase.select).toHaveBeenCalled();
          expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nk-123');
      });

      it('should handle not found', async () => {
          mockSupabase.single.mockResolvedValue({ data: null, error: null });

          const result = await getNebenkostenDetailsAction('nk-123');

          expect(result.success).toBe(false);
          expect(result.message).toBe('Nebenkosten not found.');
      });
  });

  describe('createRechnungenBatch', () => {
      const batchData = [
          { nebenkosten_id: 'nk-1', mieter_id: 'm-1', betrag: 50, name: 'R1' },
          { nebenkosten_id: 'nk-1', mieter_id: 'm-2', betrag: 60, name: 'R2' }
      ];

      it('should create batch successfully', async () => {
          // For createRechnungenBatch:
          // .insert(data).select()
          // We need select() to return a promise with { data, error }

          // Re-mock select for this specific flow if needed, OR relies on single/select specifics
          // The code calls: await ...insert(...).select()
          // My mock: insert returns mockSupabase, select returns mockSupabase.
          // await mockSupabase returns mockSupabase (since it's an object, awaiting it just yields the object unless it has a 'then')
          // So result is mockSupabase.
          // The code destructures: const { data, error } = ...

          mockSupabase.data = [{ id: 'r-1' }, { id: 'r-2' }];
          mockSupabase.error = null;

          const result = await createRechnungenBatch(batchData);

          expect(result.success).toBe(true);
          expect(mockSupabase.from).toHaveBeenCalledWith('Rechnungen');
          expect(mockSupabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
              expect.objectContaining({ ...batchData[0], user_id: 'test-user-id' }),
              expect.objectContaining({ ...batchData[1], user_id: 'test-user-id' })
          ]));
          expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
      });
  });

});
