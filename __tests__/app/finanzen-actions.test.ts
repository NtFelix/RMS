import {
  financeServerAction,
  toggleFinanceStatusAction,
  deleteFinanceAction,
} from '../../app/finanzen-actions';

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

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

describe('Finanzen Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      from: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('financeServerAction (Create/Update)', () => {
    const validData = {
      name: 'Miete',
      betrag: 1000,
      ist_einnahmen: true,
      datum: '2024-01-01',
    };

    it('creates finance entry successfully', async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'fin-1', ...validData }, error: null })
        })
      });

      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await financeServerAction(null, validData);
      expect(result.success).toBe(true);
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Miete',
        betrag: 1000
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('updates finance entry successfully', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'fin-1', ...validData }, error: null })
          })
        })
      });

      mockSupabase.from.mockReturnValue({ update: updateMock });

      const result = await financeServerAction('fin-1', validData);
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Miete'
      }));
    });

    it('validates required fields', async () => {
      const invalidData = { ...validData, name: '' };
      const result = await financeServerAction(null, invalidData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name ist erforderlich');
    });

    it('handles database errors', async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
        })
      });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await financeServerAction(null, validData);
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('toggles status successfully', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'fin-1', ist_einnahmen: false }, error: null })
            })
        })
      });

      mockSupabase.from.mockReturnValue({ update: updateMock });

      const result = await toggleFinanceStatusAction('fin-1', true);
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        ist_einnahmen: false
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });
  });

  describe('deleteFinanceAction', () => {
    it('deletes finance entry successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await deleteFinanceAction('fin-1');
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('handles delete errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete Failed' } })
        })
      });

      const result = await deleteFinanceAction('fin-1');
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Delete Failed');
    });
  });
});
