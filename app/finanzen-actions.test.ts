
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

// Mock Supabase
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockSingle = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
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

    // Default chain setups
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();

    mockSelectEq.mockReturnThis();
    mockUpdateEq.mockReturnThis();
    mockDeleteEq.mockReturnThis();
    mockSingle.mockReturnThis();

    // Wiring
    mockSelect.mockReturnValue({
        eq: mockSelectEq,
        single: mockSingle,
    });

    mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
    });

    mockUpdateEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockDelete.mockReturnValue({
        eq: mockDeleteEq
    });

    // Default resolutions
    mockSingle.mockResolvedValue({ data: { id: 'fin-1', betrag: 100 }, error: null });
    mockDeleteEq.mockResolvedValue({ data: null, error: null });
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
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Miete Jan',
        betrag: 500,
        ist_einnahmen: true
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result.success).toBe(true);
    });

    it('should update an existing finance record', async () => {
      const result = await financeServerAction('fin-123', validData);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'fin-123');
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result.success).toBe(true);
    });

    it('should fail with validation errors', async () => {
      const invalidName = { ...validData, name: '' };
      const res1 = await financeServerAction(null, invalidName);
      expect(res1.success).toBe(false);
      expect(res1.error.message).toContain('Name ist erforderlich');

      const invalidAmount = { ...validData, betrag: 'invalid' as any };
      const res2 = await financeServerAction(null, invalidAmount);
      expect(res2.success).toBe(false);
      expect(res2.error.message).toContain('Betrag muss eine Zahl sein');
    });

    it('should handle database errors', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });

        const result = await financeServerAction(null, validData);
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleFinanceStatusAction', () => {
    it('should toggle status', async () => {
        const result = await toggleFinanceStatusAction('fin-123', true);

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            ist_einnahmen: false
        }));
        expect(mockUpdateEq).toHaveBeenCalledWith('id', 'fin-123');
        expect(result.success).toBe(true);
    });
  });

  describe('deleteFinanceAction', () => {
    it('should delete a record', async () => {
        const result = await deleteFinanceAction('fin-123');

        expect(mockDelete).toHaveBeenCalled();
        expect(mockDeleteEq).toHaveBeenCalledWith('id', 'fin-123');
        expect(result.success).toBe(true);
    });

    it('should return error if delete fails', async () => {
        mockDeleteEq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

        const result = await deleteFinanceAction('fin-123');
        expect(result.success).toBe(false);
    });
  });
});
