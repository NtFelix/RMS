// Unmock the module we are testing because it is globally mocked in jest.setup.js
jest.unmock('./betriebskosten-actions');
jest.unmock('@/app/betriebskosten-actions');

import {
  createNebenkosten,
  updateNebenkosten,
  deleteNebenkosten,
  getNebenkostenDetailsAction,
  bulkDeleteNebenkosten,
  deleteRechnungenByNebenkostenId,
  createRechnungenBatch
} from './betriebskosten-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

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
  getPostHogServer: jest.fn().mockReturnValue({
    capture: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  }),
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
    warn: jest.fn(),
  },
}));

// Mock error handling
jest.mock('@/lib/error-handling', () => ({
  safeRpcCall: jest.fn(),
  withRetry: jest.fn((fn) => fn()),
  generateUserFriendlyErrorMessage: jest.fn((err) => err.message),
}));

// Mock data types and utils that are imported but not used directly in the tests we write
jest.mock('../lib/data-fetching', () => ({
    // Mock exports if needed
}));

describe('betriebskosten-actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createNebenkosten', () => {
    const mockFormData = {
      startdatum: '2023-01-01',
      enddatum: '2023-12-31',
      nebenkostenart: ['Grundsteuer'],
      betrag: [100],
      berechnungsart: ['qm'],
      haeuser_id: 'house1',
    };

    it('should create nebenkosten when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'nb1', ...mockFormData },
        error: null,
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ id: 'nb1' }),
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({ ...mockFormData, user_id: 'user123' })
      ]);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: false,
        message: 'User not authenticated',
        data: null,
      });
    });

    it('should handle insert error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await createNebenkosten(mockFormData);

      expect(result).toEqual({
        success: false,
        message: 'Insert failed',
        data: null,
      });
    });
  });

  describe('updateNebenkosten', () => {
    it('should update nebenkosten', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'nb1' },
        error: null,
      });

      const result = await updateNebenkosten('nb1', { wasserkosten: 50 });

      expect(result).toEqual({
        success: true,
        data: { id: 'nb1' },
      });
      expect(mockSupabase.update).toHaveBeenCalledWith({ wasserkosten: 50 });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nb1');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should handle update error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateNebenkosten('nb1', { wasserkosten: 50 });

      expect(result).toEqual({
        success: false,
        message: 'Update failed',
        data: null,
      });
    });
  });

  describe('deleteNebenkosten', () => {
    it('should delete nebenkosten', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await deleteNebenkosten('nb1');

      expect(result).toEqual({
        success: true,
        message: 'Nebenkosten erfolgreich gelöscht',
      });
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'nb1');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should handle delete error', async () => {
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await deleteNebenkosten('nb1');

      expect(result).toEqual({
        success: false,
        message: 'Delete failed',
      });
    });
  });

  describe('bulkDeleteNebenkosten', () => {
    it('should delete multiple nebenkosten', async () => {
      mockSupabase.in.mockResolvedValue({ count: 2, error: null });

      const result = await bulkDeleteNebenkosten(['id1', 'id2']);

      expect(result).toEqual({
        success: true,
        count: 2,
        message: '2 Betriebskostenabrechnungen erfolgreich gelöscht',
      });
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['id1', 'id2']);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/betriebskosten');
    });

    it('should return error if no ids provided', async () => {
      const result = await bulkDeleteNebenkosten([]);
      expect(result).toEqual({
        success: false,
        count: 0,
        message: 'Keine IDs zum Löschen angegeben',
      });
    });
  });

  describe('createRechnungenBatch', () => {
    const mockRechnungen = [
      { nebenkosten_id: 'nb1', mieter_id: 'm1', betrag: 100, name: 'R1' },
    ];

    it('should create batch rechnungen', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.select.mockResolvedValue({ data: [{}], error: null });

      const result = await createRechnungenBatch(mockRechnungen);

      expect(result).toEqual({ success: true, data: [{}] });
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'user123', nebenkosten_id: 'nb1' }),
      ]);
    });

    it('should handle error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.select.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await createRechnungenBatch(mockRechnungen);

      expect(result).toEqual({ success: false, message: 'Error', data: null });
    });
  });

  describe('getNebenkostenDetailsAction', () => {
    it('should return details', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const mockData = { id: 'nb1', user_id: 'user123' };
      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getNebenkostenDetailsAction('nb1');

      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should handle error', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user123' } },
            error: null,
          });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await getNebenkostenDetailsAction('nb1');

      expect(result).toEqual({ success: false, message: 'Not found' });
    });
  });

  describe('deleteRechnungenByNebenkostenId', () => {
    it('should delete rechnungen', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user123' } },
            error: null,
          });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await deleteRechnungenByNebenkostenId('nb1');

      expect(result).toEqual({ success: true });
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('nebenkosten_id', 'nb1');
    });
  });
});
