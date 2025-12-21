import {
  handleSubmit,
  deleteTenantAction,
  getMieterByHausIdAction,
  updateKautionAction,
  updateTenantApartment,
  getSuggestedKautionAmount,
} from '../../app/mieter-actions';

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
import { logAction } from '@/lib/logging-middleware';

describe('Mieter Actions', () => {
  const mockSupabase = {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('handleSubmit (Create/Update Tenant)', () => {
    it('creates a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Max Mustermann');
      formData.append('email', 'max@example.com');

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        })
      });

      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      const result = await handleSubmit(formData);
      expect(result.success).toBe(true);
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Max Mustermann',
        email: 'max@example.com'
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(logAction).toHaveBeenCalledWith('createTenant', 'success', expect.anything());
    });

    it('updates an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'tenant-123');
      formData.append('name', 'Updated Name');

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const result = await handleSubmit(formData);
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name'
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles database errors during creation', async () => {
      const formData = new FormData();
      formData.append('name', 'Error User');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
          })
        })
      });

      const result = await handleSubmit(formData);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('DB Error');
    });

    it('parses valid Nebenkosten JSON', async () => {
      const formData = new FormData();
      formData.append('name', 'JSON User');
      formData.append('nebenkosten', JSON.stringify({ heizung: 50 }));

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        })
      });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await handleSubmit(formData);

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        nebenkosten: { heizung: 50 }
      }));
    });

    it('returns error for invalid Nebenkosten JSON', async () => {
      const formData = new FormData();
      formData.append('name', 'Bad JSON');
      formData.append('nebenkosten', '{invalid-json');

      const result = await handleSubmit(formData);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Ungültiges JSON-Format');
    });
  });

  describe('deleteTenantAction', () => {
    it('deletes a tenant successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await deleteTenantAction('tenant-123');
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles delete errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete Failed' } })
        })
      });

      const result = await deleteTenantAction('tenant-123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Delete Failed');
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('returns error if hausId is missing', async () => {
      const result = await getMieterByHausIdAction('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Haus ID is required.');
    });

    it('validates date inputs', async () => {
      const result = await getMieterByHausIdAction('haus-1', '2024-02-01', '2024-01-01'); // End before start
      expect(result.success).toBe(false);
      expect(result.error).toContain('Enddatum muss nach dem Startdatum liegen');
    });

    it('fetches tenants correctly', async () => {
      // Mock fetching apartments
      const selectApartments = jest.fn().mockResolvedValue({
        data: [{ id: 'w1' }, { id: 'w2' }],
        error: null
      });

      // Mock fetching tenants
      const selectTenants = jest.fn().mockReturnThis();

      // Make queryBuilder a Promise-like object so it can be awaited
      const queryBuilder: any = {};
      queryBuilder.in = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder.or = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder.then = jest.fn((resolve) => resolve({ data: [{ id: 't1', name: 'Tenant 1' }], error: null }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'Wohnungen') {
          return { select: jest.fn().mockReturnValue({ eq: selectApartments }) };
        }
        if (table === 'Mieter') {
          return { select: selectTenants };
        }
        return {};
      });

      selectTenants.mockReturnValue(queryBuilder);

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateKautionAction', () => {
    it('validates input', async () => {
      const formData = new FormData();
      // Missing tenantId
      const result = await updateKautionAction(formData);
      expect(result.success).toBe(false);
    });

    it('updates kaution successfully', async () => {
      const formData = new FormData();
      formData.append('tenantId', 't1');
      formData.append('amount', '1000');
      formData.append('status', 'Erhalten');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: {}, error: null }) }) }),
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
      });

      const result = await updateKautionAction(formData);
      expect(result.success).toBe(true);
    });
  });
});
