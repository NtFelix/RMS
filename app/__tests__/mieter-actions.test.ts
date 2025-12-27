/**
 * @jest-environment node
 */
import {
  handleSubmit,
  deleteTenantAction,
  getMieterByHausIdAction,
  updateKautionAction,
  updateTenantApartment,
  getSuggestedKautionAmount,
} from '../mieter-actions';
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

describe('mieter-actions', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: mockAuth,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('handleSubmit', () => {
    it('creates a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Max Mustermann');
      formData.append('email', 'max@test.com');

      mockSupabase.single.mockResolvedValue({ data: { id: 'new-id' }, error: null });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Max Mustermann',
        email: 'max@test.com'
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('updates an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'existing-id');
      formData.append('name', 'Updated Name');

      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name'
      }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'existing-id');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles JSON parsing error for nebenkosten', async () => {
      const formData = new FormData();
      formData.append('name', 'Test');
      formData.append('nebenkosten', '{invalid-json');

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Ungültiges JSON-Format');
    });

    it('handles Supabase error during insert', async () => {
      const formData = new FormData();
      formData.append('name', 'Test');

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Insert failed');
    });
  });

  describe('deleteTenantAction', () => {
    it('deletes tenant successfully', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await deleteTenantAction('t1');

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 't1');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles deletion error', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await deleteTenantAction('t1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Delete failed');
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('returns error if hausId is missing', async () => {
      const result = await getMieterByHausIdAction('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Haus ID is required');
    });

    it('validates date range', async () => {
      const result = await getMieterByHausIdAction('h1', '2024-01-01', '2023-01-01');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Enddatum muss nach dem Startdatum liegen');
    });

    it('fetches tenants successfully', async () => {
      // Step 1: Mock fetching apartments
      mockSupabase.select.mockReturnThis(); // For both queries

      // We need to differentiate the two select calls.
      // Call 1: Fetch Wohnungen
      // Call 2: Fetch Mieter

      // Since jest mockReturnThis returns the same mock object, we control behavior via the chain end.
      // But here the chain structure is different.
      // Query 1: from('Wohnungen').select('id').eq(...)
      // Query 2: from('Mieter').select(...).in(...)

      // We can use mockImplementation to return specific promise for specific calls if needed,
      // but simpler is to mock the resolution of the chain.

      // Mocking the chain resolution is tricky because we reuse the same mock object.
      // A better approach for sequential calls is mockResolvedValueOnce on the final method.

      // Call 1: Fetch Wohnungen (eq is the last call before await in code logic, but wait... Supabase awaits the builder)
      // Actually Supabase returns a Thenable.
      // Our mock setup `eq: jest.fn().mockReturnThis()` implies we await the builder.
      // We can add a `then` method to the mock object or use `mockResolvedValue` if the code awaits the chain result.

      // Let's refine the mock structure for this test
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: jest.fn(),
      };

      // 1st await: Wohnungen query
      mockChain.then.mockImplementationOnce((resolve) => resolve({ data: [{ id: 'w1' }], error: null }));
      // 2nd await: Mieter query
      mockChain.then.mockImplementationOnce((resolve) => resolve({ data: [{ id: 'm1', name: 'Max' }], error: null }));

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await getMieterByHausIdAction('h1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
    });
  });

  describe('updateKautionAction', () => {
    it('updates kaution successfully', async () => {
      const formData = new FormData();
      formData.append('tenantId', 't1');
      formData.append('amount', '1000');
      formData.append('status', 'Erhalten');

      // Mock existing tenant check
      mockSupabase.single.mockResolvedValue({ data: { kaution: null }, error: null });
      // Mock update
      mockSupabase.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      const result = await updateKautionAction(formData);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('validates input', async () => {
      const formData = new FormData();
      // Missing required fields
      const result = await updateKautionAction(formData);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Mieter ID ist erforderlich');
    });
  });

  describe('updateTenantApartment', () => {
    it('updates tenant apartment link', async () => {
      mockSupabase.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      const result = await updateTenantApartment('t1', 'w1');

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.update).toHaveBeenCalledWith({ wohnung_id: 'w1' });
    });
  });

  describe('getSuggestedKautionAmount', () => {
    it('calculates suggested amount', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          wohnung_id: 'w1',
          Wohnungen: [{ miete: 500 }] // Supabase joins return arrays usually
        },
        error: null
      });

      const result = await getSuggestedKautionAmount('t1');

      expect(result.success).toBe(true);
      expect(result.suggestedAmount).toBe(1500); // 3 * 500
    });

    it('returns undefined if no apartment linked', async () => {
       mockSupabase.single.mockResolvedValue({
        data: { wohnung_id: null, Wohnungen: [] },
        error: null
      });

      const result = await getSuggestedKautionAmount('t1');

      expect(result.success).toBe(true);
      expect(result.suggestedAmount).toBeUndefined();
    });
  });
});
