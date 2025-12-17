import {
  financeServerAction,
  toggleFinanceStatusAction,
  deleteFinanceAction
} from '../../app/finanzen-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({
    capture: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  })),
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
  },
}));

describe('Finanzen Server Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('financeServerAction (Create/Update)', () => {
    const validData = {
      name: 'Test Payment',
      betrag: 100,
      ist_einnahmen: false,
      datum: '2024-01-01',
      notiz: 'Test Note',
      wohnung_id: null
    };

    it('should create a new finance entry successfully', async () => {
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: { id: 'fin-1', ...validData },
        error: null
      });
      mockSupabase.insert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockInsertSingle }) });

      const result = await financeServerAction(null, validData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Test Payment',
          betrag: 100
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('should update an existing finance entry successfully', async () => {
      const mockUpdateSingle = jest.fn().mockResolvedValue({
        data: { id: 'fin-1', ...validData },
        error: null
      });
      // Chain: update().eq().select().single()
      const mockSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      mockSupabase.update.mockReturnValue({ eq: mockEq });

      const result = await financeServerAction('fin-1', validData);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Test Payment'
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'fin-1');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('should validate inputs', async () => {
      const invalidData = { ...validData, name: '' };
      const result = await financeServerAction(null, invalidData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name');
    });

    it('should handle database errors', async () => {
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Error' }
      });
      mockSupabase.insert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockInsertSingle }) });

      const result = await financeServerAction(null, validData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('should toggle status successfully', async () => {
       const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'fin-1' }, error: null });
       const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
       const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
       mockSupabase.update.mockReturnValue({ eq: mockEq });

       const result = await toggleFinanceStatusAction('fin-1', true); // Toggle from true to false

       expect(result.success).toBe(true);
       expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
           ist_einnahmen: false
       }));
    });

    it('should handle errors', async () => {
       const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
       const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
       const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
       mockSupabase.update.mockReturnValue({ eq: mockEq });

       const result = await toggleFinanceStatusAction('fin-1', true);

       expect(result.success).toBe(false);
       expect(result.error.message).toBe('Update failed');
    });
  });

  describe('deleteFinanceAction', () => {
      it('should delete entry successfully', async () => {
          const mockEq = jest.fn().mockResolvedValue({ error: null });
          mockSupabase.delete.mockReturnValue({ eq: mockEq });

          const result = await deleteFinanceAction('fin-1');

          expect(result.success).toBe(true);
          expect(mockSupabase.delete).toHaveBeenCalled();
          expect(mockEq).toHaveBeenCalledWith('id', 'fin-1');
          expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
      });

      it('should handle delete errors', async () => {
          const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
          mockSupabase.delete.mockReturnValue({ eq: mockEq });

          const result = await deleteFinanceAction('fin-1');

          expect(result.success).toBe(false);
          expect(result.error?.message).toBe('Delete failed');
      });
  });
});
