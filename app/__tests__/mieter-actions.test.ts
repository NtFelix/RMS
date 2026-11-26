/**
 * @jest-environment node
 */
import {
  handleSubmit,
  deleteTenantAction,
  getMieterByHausIdAction,
  updateTenantApartment,
} from '../mieter-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
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
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      auth: mockAuth,
    };

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('handleSubmit', () => {
    it('creates a new tenant successfully via mieter_anlegen (GH-30: Person + Mieter)', async () => {
      const formData = new FormData();
      formData.append('anrede', 'herr');
      formData.append('vorname', 'Max');
      formData.append('nachname', 'Mustermann');
      formData.append('email', 'max@test.com');

      mockSupabase.rpc.mockResolvedValue({ data: { mieter_id: 'new-id', person_id: 'p-1' }, error: null });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mieter_anlegen', expect.objectContaining({
        p_person: expect.objectContaining({ anrede: 'herr', vorname: 'Max', nachname: 'Mustermann', email: 'max@test.com' }),
      }));
      // Die Altspalten an "Mieter" werden nicht mehr geschrieben.
      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('updates an existing tenant successfully via mieter_aktualisieren', async () => {
      const formData = new FormData();
      formData.append('id', 'existing-id');
      formData.append('nachname', 'Neuer Name');

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mieter_aktualisieren', expect.objectContaining({
        p_mieter_id: 'existing-id',
        p_person: expect.objectContaining({ nachname: 'Neuer Name' }),
      }));
      expect(mockSupabase.update).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles JSON parsing error for nebenkosten', async () => {
      const formData = new FormData();
      formData.append('nachname', 'Test');
      formData.append('nebenkosten', '{invalid-json');

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Ungültiges JSON-Format');
    });

    it('rejects a new tenant without first or last name', async () => {
      const formData = new FormData();
      formData.append('email', 'ohne-name@test.com');

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('mieter_anlegen', expect.anything());
    });

    it('handles RPC error during create', async () => {
      const formData = new FormData();
      formData.append('nachname', 'Test');

      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Insert failed');
    });
  });

  describe('deleteTenantAction', () => {
    it('deletes tenant successfully via soft delete', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await deleteTenantAction('t1');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Mieter',
        p_record_id: 't1',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles deletion error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Delete failed' } });

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
      mockSupabase.select.mockReturnThis();

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

  describe('updateTenantApartment', () => {
    it('translates the blocked apartment change (23503, fk_mieter_mietverhaeltnis) into a clear message', async () => {
      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { code: '23503', message: 'update violates foreign key constraint "fk_mieter_mietverhaeltnis"' },
        }),
      });

      const result = await updateTenantApartment('t1', 'w2');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Die Wohnung kann hier nicht geändert werden, weil der Mieter zu einem Mietverhältnis gehört. Nutzen Sie im Abschnitt Mietverhältnis den Punkt „Umzug in eine andere Wohnung“.');
    });

    it('updates tenant apartment link', async () => {
      mockSupabase.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      const result = await updateTenantApartment('t1', 'w1');

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.update).toHaveBeenCalledWith({ wohnung_id: 'w1' });
    });
  });

});
