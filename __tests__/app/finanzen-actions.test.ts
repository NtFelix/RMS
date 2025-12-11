
import { financeServerAction, toggleFinanceStatusAction, deleteFinanceAction } from '../../app/finanzen-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock Dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));
jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

describe('app/finanzen-actions', () => {
  const mockEq = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockSingle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Define mock results
    const singleResult = { data: { id: 'f1', name: 'Test Finance' }, error: null };

    // Chains:
    // Insert: insert().select().single()
    // Update: update().eq().select().single()
    // Delete: delete().eq()
    // Toggle: update().eq().select().single()

    mockSingle.mockResolvedValue(singleResult);

    // Select chain
    const selectObject = { single: mockSingle };
    mockSelect.mockReturnValue(selectObject);

    // Eq chain (can return select object OR result for delete)
    // delete().eq() returns promise
    mockEq.mockImplementation((key, val) => {
        // If part of update/toggle chain, it likely needs to return select object
        // If part of delete, it returns promise.
        // But `update().eq().select()` vs `delete().eq()`
        // We can make eq return an object that is both awaitable (for delete) AND has select (for update)
        // Or we check context. Simpler to just add select to returned object and assume delete ignores it.
        const res: any = Promise.resolve({ error: null });
        res.select = jest.fn().mockReturnValue(selectObject);
        return res;
    });

    // Update chain
    mockUpdate.mockReturnValue({ eq: mockEq });

    // Insert chain
    mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue(selectObject) });

    // Delete chain
    mockDelete.mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    (createClient as jest.Mock).mockResolvedValue({
      from: mockFrom,
    });
  });

  describe('financeServerAction', () => {
    it('creates a new finance entry successfully', async () => {
      const payload = {
        name: 'Mieteinnahme',
        betrag: 1000,
        ist_einnahmen: true,
        wohnung_id: 'w1',
      };

      const result = await financeServerAction(null, payload);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Mieteinnahme',
        betrag: 1000,
        ist_einnahmen: true,
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('updates an existing finance entry successfully', async () => {
      const payload = {
        name: 'Reparatur',
        betrag: 200,
        ist_einnahmen: false,
      };

      const result = await financeServerAction('f1', payload);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Reparatur',
        betrag: 200,
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'f1');
    });

    it('validates input', async () => {
      const payload = {
        name: '', // Invalid
        betrag: 100,
        ist_einnahmen: true,
      };

      const result = await financeServerAction(null, payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Name ist erforderlich');
    });

    it('handles database errors', async () => {
      mockSingle.mockResolvedValueOnce({ error: { message: 'DB Error' } });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const payload = {
        name: 'Test',
        betrag: 100,
        ist_einnahmen: true,
      };

      const result = await financeServerAction(null, payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('DB Error');

      consoleSpy.mockRestore();
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('toggles status successfully', async () => {
      const result = await toggleFinanceStatusAction('f1', true);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ist_einnahmen: false,
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'f1');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });
  });

  describe('deleteFinanceAction', () => {
    it('deletes entry successfully', async () => {
      const result = await deleteFinanceAction('f1');

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'f1');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });
  });
});
