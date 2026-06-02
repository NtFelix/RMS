import { financeServerAction, toggleFinanceStatusAction, deleteFinanceAction } from '@/app/finanzen-actions';
import { revalidatePath } from 'next/cache';

// Mock dependencies
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

// Create a stable chain object
const createMockChain = () => {
  const chain = {
    eq: jest.fn(),
    select: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.single.mockResolvedValue({ data: { id: 'fin-1', betrag: 100 }, error: null });
  chain.order.mockReturnValue(chain);
  chain.range.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  
  return chain;
};

let activeChain = createMockChain();

const mockSupabase = {
  from: jest.fn(() => activeChain),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Finanzen Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeChain = createMockChain();
  });

  describe('financeServerAction', () => {
    const validData = {
      name: 'Miete Jan',
      betrag: 500,
      ist_einnahmen: true,
      datum: '2023-01-01',
    };

    it('should create a new finance record', async () => {
      const result = await financeServerAction(null, validData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(activeChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Miete Jan',
        betrag: 500,
        ist_einnahmen: true
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result.success).toBe(true);
    });

    it('should update an existing finance record', async () => {
      const result = await financeServerAction('fin-123', validData);

      expect(activeChain.update).toHaveBeenCalled();
      expect(activeChain.eq).toHaveBeenCalledWith('id', 'fin-123');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result.success).toBe(true);
    });

    it('should fail with validation errors', async () => {
      const invalidName = { ...validData, name: '' };
      const res1 = await financeServerAction(null, invalidName);
      expect(res1.success).toBe(false);
      expect(res1.error?.message).toContain('Name ist erforderlich');

      const invalidAmount = { ...validData, betrag: 'invalid' as any };
      const res2 = await financeServerAction(null, invalidAmount);
      expect(res2.success).toBe(false);
      expect(res2.error?.message).toContain('Betrag muss eine Zahl sein');
    });

    it('should handle database errors', async () => {
        activeChain.single.mockResolvedValue({ data: null, error: { message: 'DB Error' } });
        const result = await financeServerAction(null, validData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Ein unbekannter Fehler ist aufgetreten.');
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('should toggle status', async () => {
        const result = await toggleFinanceStatusAction('fin-123', true);

        expect(activeChain.update).toHaveBeenCalledWith(expect.objectContaining({
            ist_einnahmen: false
        }));
        expect(activeChain.eq).toHaveBeenCalledWith('id', 'fin-123');
        expect(result.success).toBe(true);
    });
  });

  describe('deleteFinanceAction', () => {
    it('should delete a record', async () => {
        const result = await deleteFinanceAction('fin-123');

        expect(activeChain.delete).toHaveBeenCalled();
        expect(activeChain.eq).toHaveBeenCalledWith('id', 'fin-123');
        expect(result.success).toBe(true);
    });

    it('should return error if delete fails', async () => {
        activeChain.eq.mockReturnValue({
           ...activeChain,
           then: (resolve: any) => resolve({ error: { message: 'Delete failed' } })
        });
        // Simplest way for async mock with chain
        activeChain.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

        const result = await deleteFinanceAction('fin-123');
        expect(result.success).toBe(false);
    });
  });
});
