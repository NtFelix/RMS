import {
  handleSubmit,
  deleteTenantAction,
  getMieterByHausIdAction,
  updateKautionAction
} from '../../app/mieter-actions';
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

describe('Mieter Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase Mock
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
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('handleSubmit (Create/Update Tenant)', () => {
    it('should create a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      // No ID implies creation

      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'new-id' }, error: null });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com'
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result.success).toBe(true);
    });

    it('should update an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'existing-id');
      formData.append('name', 'Jane Doe');

      // The key here is to mock the entire chain properly.
      // supabase.from().update().eq() -> returns Promise<{ error: null }>
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.update.mockReturnValue({ eq: mockEq });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Jane Doe'
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'existing-id');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result.success).toBe(true);
    });

    it('should handle errors during creation', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');

      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('DB Error');
    });

    it('should handle errors during update', async () => {
        const formData = new FormData();
        formData.append('id', 'existing-id');
        formData.append('name', 'Jane Doe');

        const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Update Failed' } });
        mockSupabase.update.mockReturnValue({ eq: mockEq });

        const result = await handleSubmit(formData);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Update Failed');
      });
  });

  describe('deleteTenantAction', () => {
    it('should delete a tenant successfully', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.delete.mockReturnValue({ eq: mockEq });

      const result = await deleteTenantAction('tenant-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'tenant-123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      mockSupabase.delete.mockReturnValue({ eq: mockEq });

      const result = await deleteTenantAction('tenant-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Delete failed');
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('should return empty list if no apartments found', async () => {
      // Mock for fetching apartments
      const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.select.mockReturnValue({ eq: mockEq });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should fetch tenants for apartments in the house', async () => {
        const mockIn = jest.fn().mockResolvedValue({
            data: [{ id: 't1', name: 'Tenant 1' }],
            error: null
        });

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'Wohnungen') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ data: [{ id: 'w1' }, { id: 'w2' }], error: null })
                    })
                }
            }
            if (table === 'Mieter') {
                return {
                    select: jest.fn().mockReturnValue({
                        in: mockIn
                    })
                }
            }
            return mockSupabase;
        });

        const result = await getMieterByHausIdAction('haus-1');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(mockIn).toHaveBeenCalledWith('wohnung_id', ['w1', 'w2']);
    });

    it('should handle error when fetching apartments', async () => {
       mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'Wohnungen') {
              return {
                  select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error fetching apartments' } })
                  })
              }
          }
          return mockSupabase;
       });

       const result = await getMieterByHausIdAction('haus-1');
       expect(result.success).toBe(false);
       expect(result.error).toBe('Error fetching apartments');
    });
  });

  describe('updateKautionAction', () => {
      it('should update kaution successfully', async () => {
          const formData = new FormData();
          formData.append('tenantId', 't1');
          formData.append('amount', '1000');
          formData.append('status', 'Erhalten');
          formData.append('paymentDate', '2024-01-01');

          // Mock existing tenant check
          mockSupabase.single.mockResolvedValueOnce({ data: { kaution: null }, error: null });
          // Mock update
          const mockEq = jest.fn().mockResolvedValue({ error: null });
          mockSupabase.update.mockReturnValue({
              eq: mockEq
          });

          const result = await updateKautionAction(formData);

          expect(result.success).toBe(true);
          expect(revalidatePath).toHaveBeenCalledWith('/mieter');
          expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
          // Check if update was called with correct structure
          expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
              kaution: expect.objectContaining({
                  amount: 1000,
                  status: 'Erhalten',
                  paymentDate: '2024-01-01'
              })
          }));
      });

      it('should validate inputs', async () => {
          const formData = new FormData();
          // Missing tenantId

          const result = await updateKautionAction(formData);
          expect(result.success).toBe(false);
          expect(result.error?.message).toContain('Mieter ID');
      });
  });
});
