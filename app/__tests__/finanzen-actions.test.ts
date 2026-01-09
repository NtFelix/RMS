/**
 * @jest-environment node
 */
import {
  financeServerAction,
  toggleFinanceStatusAction,
  deleteFinanceAction,
} from '../finanzen-actions';
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
    flush: jest.fn(),
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    flush: jest.fn(),
  },
}));

describe('finanzen-actions', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    // Helper to allow deep chaining
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockChain),
      auth: mockAuth,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('financeServerAction', () => {
    const validData = {
      name: 'Miete',
      betrag: 500,
      ist_einnahmen: true,
      wohnung_id: 'w1',
      datum: '2024-01-01',
    };

    it('creates finance record successfully', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: { id: 'fin-1', ...validData }, error: null });

      const result = await financeServerAction(null, validData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Miete',
        betrag: 500,
        ist_einnahmen: true,
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('updates finance record successfully', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: { id: 'fin-1', ...validData }, error: null });

      const result = await financeServerAction('fin-1', validData);

      expect(result.success).toBe(true);
      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'fin-1');
    });

    it('validates name', async () => {
      const result = await financeServerAction(null, { ...validData, name: '' });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name ist erforderlich');
    });

    it('validates amount', async () => {
      const result = await financeServerAction(null, { ...validData, betrag: 'invalid' as any });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Betrag muss eine Zahl sein');
    });

    it('handles database error', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await financeServerAction(null, validData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('toggles status successfully', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: { id: 'fin-1', ist_einnahmen: false }, error: null });

      const result = await toggleFinanceStatusAction('fin-1', true);

      expect(result.success).toBe(true);
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        ist_einnahmen: false
      }));
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'fin-1');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('handles toggle error', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      const result = await toggleFinanceStatusAction('fin-1', true);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Update failed');
    });
  });

  describe('deleteFinanceAction', () => {
    it('deletes finance record successfully', async () => {
      const mockChain = mockSupabase.from();
      mockChain.eq.mockResolvedValue({ error: null });

      const result = await deleteFinanceAction('fin-1');

      expect(result.success).toBe(true);
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'fin-1');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('handles deletion error', async () => {
      const mockChain = mockSupabase.from();
      mockChain.eq.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await deleteFinanceAction('fin-1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Delete failed');
    });
  });
});
