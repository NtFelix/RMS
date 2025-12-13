/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('next/cache');

import { financeServerAction, deleteFinanceAction } from './finanzen-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

const mockCreateClient = createSupabaseServerClient as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('Finanzen Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({}),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('financeServerAction', () => {
    const validPayload = {
      name: 'Mieteinnahme Januar',
      betrag: 1200,
      ist_einnahmen: true,
      wohnung_id: 'w1',
      datum: '2023-01-15',
    };

    it('successfully creates a new finance entry', async () => {
      const mockData = { ...validPayload, id: 'new-id' };
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await financeServerAction(null, validPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mieteinnahme Januar' }));
      expect(mockRevalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('successfully updates an existing finance entry', async () => {
      const entryId = 'f1';
      const mockData = { ...validPayload, id: entryId };
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await financeServerAction(entryId, validPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mieteinnahme Januar' }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', entryId);
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('returns validation error for missing name', async () => {
      const result = await financeServerAction(null, { ...validPayload, name: '' });
      expect(result).toEqual({ success: false, error: { message: 'Name ist erforderlich.' } });
    });

    it('returns database error on creation failure', async () => {
      const dbError = { message: 'DB error' };
      mockSupabase.single.mockResolvedValue({ data: null, error: dbError });
      const result = await financeServerAction(null, validPayload);
      expect(result).toEqual({ success: false, error: dbError });
    });
  });

  describe('deleteFinanceAction', () => {
    it('successfully deletes a finance entry', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null });
      const result = await deleteFinanceAction('f1');
      expect(mockSupabase.from).toHaveBeenCalledWith('Finanzen');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/finanzen');
      expect(result).toEqual({ success: true });
    });

    it('returns an error if deletion fails', async () => {
      const dbError = { message: 'Delete failed' };
      mockSupabase.eq.mockResolvedValue({ error: dbError });
      const result = await deleteFinanceAction('f1');
      expect(result).toEqual({ success: false, error: dbError });
    });
  });
});
