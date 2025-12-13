/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('next/cache');

import {
  handleSubmit,
  deleteTenantAction,
  getMieterByHausIdAction,
  updateKautionAction,
  getSuggestedKautionAmount,
} from './mieter-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

const mockCreateClient = createSupabaseServerClient as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('Mieter Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // This mock is designed to handle various chained calls from the Supabase client
    mockSupabase = {
      from: jest.fn(function (this: any, tableName: string) {
        const self = this;
        const mockSingle = jest.fn().mockResolvedValue({ data: {}, error: null });
        const mockEq = jest.fn().mockReturnValue({ single: mockSingle });

        self.select = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
        self.insert = jest.fn().mockResolvedValue({ error: null });
        self.update = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        self.delete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        self.in = jest.fn().mockReturnThis();
        self.or = jest.fn().mockResolvedValue({ data: [], error: null });

        return self;
      }),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('handleSubmit', () => {
    it('successfully creates a new tenant', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john.doe@example.com');

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        wohnung_id: null,
        name: 'John Doe',
        einzug: null,
        auszug: null,
        email: 'john.doe@example.com',
        telefonnummer: null,
        notiz: null,
        nebenkosten: null,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result).toEqual({ success: true });
    });

    it('successfully updates an existing tenant', async () => {
      const formData = new FormData();
      formData.append('id', 'tenant-123');
      formData.append('name', 'John Doe Updated');
      formData.append('email', 'john.doe.updated@example.com');

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({ eq: mockUpdateEq }),
      });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        wohnung_id: null,
        name: 'John Doe Updated',
        einzug: null,
        auszug: null,
        email: 'john.doe.updated@example.com',
        telefonnummer: null,
        notiz: null,
        nebenkosten: null,
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'tenant-123');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result).toEqual({ success: true });
    });

    it('returns an error if tenant creation fails', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      });

      const result = await handleSubmit(formData);

      expect(result).toEqual({ success: false, error: { message: 'Insert failed' } });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('returns an error if tenant update fails', async () => {
      const formData = new FormData();
      formData.append('id', 'tenant-123');
      formData.append('name', 'John Doe Updated');

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({ eq: mockUpdateEq }),
      });

      const result = await handleSubmit(formData);

      expect(result).toEqual({ success: false, error: { message: 'Update failed' } });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('handles invalid JSON for nebenkosten and returns an error', async () => {
        const formData = new FormData();
        formData.append('name', 'Test Tenant');
        formData.append('nebenkosten', 'this-is-not-json');

        const result = await handleSubmit(formData);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Ungültiges JSON-Format für Nebenkosten');
    });
  });

  describe('deleteTenantAction', () => {
    it('successfully deletes a tenant and revalidates paths', async () => {
      const tenantId = 'tenant-123';
      const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({ eq: mockDeleteEq }),
      });

      const result = await deleteTenantAction(tenantId);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith('id', tenantId);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/wohnungen');
      expect(result).toEqual({ success: true });
    });

    it('returns an error if tenant deletion fails', async () => {
      const tenantId = 'tenant-123';
      const mockDeleteEq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      mockSupabase.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({ eq: mockDeleteEq }),
      });

      const result = await deleteTenantAction(tenantId);

      expect(result).toEqual({ success: false, error: { message: 'Delete failed' } });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('successfully fetches tenants for a given house ID', async () => {
        const mockWohnungen = [{ id: 'w1' }];
        const mockMieter = [{ id: 'm1', name: 'Tenant 1' }];

        const mockWohnungenEq = jest.fn().mockResolvedValue({ data: mockWohnungen, error: null });
        const mockMieterIn = jest.fn().mockResolvedValue({ data: mockMieter, error: null });

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'Wohnungen') {
                return { select: jest.fn().mockReturnValue({ eq: mockWohnungenEq }) };
            }
            if (table === 'Mieter') {
                return { select: jest.fn().mockReturnValue({ in: mockMieterIn }) };
            }
            return {};
        });

        const result = await getMieterByHausIdAction('h1');

        expect(mockWohnungenEq).toHaveBeenCalledWith('haus_id', 'h1');
        expect(mockMieterIn).toHaveBeenCalledWith('wohnung_id', ['w1']);
        expect(result).toEqual({ success: true, data: mockMieter });
    });

    it('returns an empty array if a house has no apartments', async () => {
        const mockWohnungenEq = jest.fn().mockResolvedValue({ data: [], error: null });
        mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockWohnungenEq }) });

        const result = await getMieterByHausIdAction('h1');

        expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
        expect(result).toEqual({ success: true, data: [] });
    });

    it('correctly filters tenants by year', async () => {
        const mockWohnungen = [{ id: 'w1' }];
        const mockMieter = [{ id: 'm1', name: 'Tenant 1' }];
        const mockOr = jest.fn().mockResolvedValue({ data: mockMieter, error: null });
        const mockIn = jest.fn().mockReturnValue({ or: mockOr });
        const mockWohnungenEq = jest.fn().mockResolvedValue({ data: mockWohnungen, error: null });

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'Wohnungen') {
                return { select: jest.fn().mockReturnValue({ eq: mockWohnungenEq }) };
            }
            if (table === 'Mieter') {
                return { select: jest.fn().mockReturnValue({ in: mockIn }) };
            }
            return {};
        });

        const result = await getMieterByHausIdAction('h1', '2023');

        expect(mockOr).toHaveBeenCalled();
        expect(result).toEqual({ success: true, data: mockMieter });
    });
  });

  describe('updateKautionAction', () => {
    it('successfully updates kaution data for a tenant', async () => {
        const formData = new FormData();
        formData.append('tenantId', 'tenant-123');
        formData.append('amount', '500');
        formData.append('status', 'Erhalten');

        const mockSingle = jest.fn().mockResolvedValue({ data: { kaution: null }, error: null });
        const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });

        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) }),
            update: jest.fn().mockReturnValue({ eq: mockUpdateEq }),
        });

        const result = await updateKautionAction(formData);

        expect(mockSingle).toHaveBeenCalled();
        expect(mockUpdateEq).toHaveBeenCalledWith('id', 'tenant-123');
        expect(result).toEqual({ success: true });
    });

    it('preserves the createdAt timestamp on subsequent updates', async () => {
        const existingKaution = { createdAt: new Date().toISOString() };
        const mockSingle = jest.fn().mockResolvedValue({ data: { kaution: existingKaution }, error: null });
        const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) }),
            update: mockUpdate,
        });

        const formData = new FormData();
        formData.append('tenantId', 'tenant-123');
        formData.append('amount', '550');
        formData.append('status', 'Zurückgezahlt');

        await updateKautionAction(formData);

        expect(mockUpdate.mock.calls[0][0].kaution.createdAt).toBe(existingKaution.createdAt);
    });

    it('returns a validation error for an invalid amount', async () => {
        const formData = new FormData();
        formData.append('tenantId', 'tenant-123');
        formData.append('amount', '-100');
        formData.append('status', 'Erhalten');

        const result = await updateKautionAction(formData);

        expect(result).toEqual({ success: false, error: { message: 'Betrag muss eine positive Zahl sein' } });
    });
  });

  describe('getSuggestedKautionAmount', () => {
    it('calculates the correct suggested amount based on rent', async () => {
        const tenantData = { wohnung_id: 'w1', Wohnungen: [{ miete: 500 }] };
        const mockSingle = jest.fn().mockResolvedValue({ data: tenantData, error: null });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) })
        });

        const result = await getSuggestedKautionAmount('t1');

        expect(result).toEqual({ success: true, suggestedAmount: 1500 });
    });

    it('returns undefined if apartment has no rent', async () => {
        const tenantData = { Wohnungen: [{ miete: null }] };
        const mockSingle = jest.fn().mockResolvedValue({ data: tenantData, error: null });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) })
        });

        const result = await getSuggestedKautionAmount('t1');

        expect(result).toEqual({ success: true, suggestedAmount: undefined });
    });

    it('returns an error if fetching tenant data fails', async () => {
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) })
        });

        const result = await getSuggestedKautionAmount('t1');

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Fehler beim Laden der Mieterdaten');
    });
  });
});
