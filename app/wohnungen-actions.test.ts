/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/utils/supabase/server');
jest.mock('next/cache');

import { wohnungServerAction } from './wohnungen-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const mockCreateClient = createClient as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('Wohnungen Server Action', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({}),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('wohnungServerAction validation', () => {
    it('should return a validation error if name is missing', async () => {
      const payload = { name: '', groesse: 80, miete: 1200, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Name ist erforderlich.' } });
    });

    it('should return a validation error for non-positive groesse', async () => {
      const payload = { name: 'W1', groesse: 0, miete: 1200, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Größe muss eine positive Zahl sein.' } });
    });

    it('should return a validation error for negative miete', async () => {
      const payload = { name: 'W1', groesse: 80, miete: -1, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Miete muss eine Zahl sein.' } });
    });
  });

  describe('wohnungServerAction database operations', () => {
    const validPayload = { name: 'Wohnung 1', groesse: '80', miete: '1200', haus_id: 'h1' };
    const mockData = { ...validPayload, id: 'new-id', created_at: new Date().toISOString() };

    beforeEach(() => {
        // Setup mock for a successful DB call
        const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        mockSupabase.from.mockReturnValue({
            insert: jest.fn().mockReturnValue({ select: mockSelect }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ select: mockSelect }) }),
        });
    });

    it('successfully creates a new apartment', async () => {
      const result = await wohnungServerAction(null, validPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({ name: 'Wohnung 1', groesse: 80, miete: 1200, haus_id: 'h1' });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/wohnungen');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser/h1');
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('successfully updates an existing apartment', async () => {
      const result = await wohnungServerAction('w1', validPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ name: 'Wohnung 1', groesse: 80, miete: 1200, haus_id: 'h1' });
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('handles database error on creation', async () => {
        const dbError = { message: 'Insert failed' };
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        mockSupabase.from.mockReturnValue({ insert: jest.fn().mockReturnValue({ select: mockSelect }) });

        const result = await wohnungServerAction(null, validPayload);
        expect(result).toEqual({ success: false, error: dbError });
    });

    it('handles database error on update', async () => {
        const dbError = { message: 'Update failed' };
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        mockSupabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ select: mockSelect }) }) });

        const result = await wohnungServerAction('w1', validPayload);
        expect(result).toEqual({ success: false, error: dbError });
    });
  });
});
