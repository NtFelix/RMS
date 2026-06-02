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

describe('betriebskosten-actions', () => {
  let mockSupabase: any;
  let mockChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    // Explicitly make eq and in return the chain to support multiple calls
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.in.mockReturnValue(mockChain);

    // Make the chain thenable to simulate await for non-single calls
    mockChain.then = (onFullfilled: any) => {
      return Promise.resolve(onFullfilled({ data: [], error: null }));
    };

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockChain),
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

      mockChain.single.mockResolvedValue({
        data: { id: 'nb1', ...mockFormData },
        error: null,
      });

      const result = await createNebenkosten(mockFormData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
    });

    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await createNebenkosten(mockFormData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nicht authentifiziert. Bitte melden Sie sich an.');
    });
  });

  describe('updateNebenkosten', () => {
    it('should update nebenkosten', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockChain.single.mockResolvedValue({
        data: { id: 'nb1' },
        error: null,
      });

      const result = await updateNebenkosten('nb1', { wasserkosten: 50 });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Nebenkosten');
    });
  });

  describe('deleteNebenkosten', () => {
    it('should delete nebenkosten', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      // No single() used here, uses thenable
      const result = await deleteNebenkosten('nb1');
      expect(result.success).toBe(true);
    });
  });

  describe('bulkDeleteNebenkosten', () => {
    it('should delete multiple nebenkosten', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await bulkDeleteNebenkosten(['id1', 'id2']);
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });

  describe('deleteRechnungenByNebenkostenId', () => {
    it('should delete rechnungen', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      await deleteRechnungenByNebenkostenId('nb1');

      expect(mockSupabase.from).toHaveBeenCalledWith('Rechnungen');
      expect(mockChain.delete).toHaveBeenCalled();
    });
  });
});
