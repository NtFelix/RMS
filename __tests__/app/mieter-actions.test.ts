
import { handleSubmit, deleteTenantAction } from '../../app/mieter-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock Next.js cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock logging middleware to avoid console clutter
jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

describe('app/mieter-actions', () => {
  // Define mock functions for Supabase chain
  const mockEq = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the chain return values
    // Most methods return { error: null } if awaited directly, OR they return a builder that has .eq()

    mockEq.mockResolvedValue({ error: null });

    // update() returns an object that has eq()
    mockUpdate.mockReturnValue({ eq: mockEq });

    // delete() returns an object that has eq()
    mockDelete.mockReturnValue({ eq: mockEq });

    // insert() returns a promise (it's often the end of the chain in some contexts)
    // or it returns a builder. In the action, it seems to be awaited directly or followed by something else?
    // In the action: `await supabase.from('Mieter').insert(payload)`
    // So insert should resolve to { error: null }
    mockInsert.mockResolvedValue({ error: null });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    (createClient as jest.Mock).mockResolvedValue({
      from: mockFrom,
    });
  });

  describe('handleSubmit', () => {
    it('creates a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Max Mustermann');
      formData.append('email', 'max@example.com');

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Max Mustermann',
        email: 'max@example.com',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('updates an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', '123');
      formData.append('name', 'Max Update');

      const result = await handleSubmit(formData);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Max Update',
      }));
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles insertion errors', async () => {
      const formData = new FormData();
      formData.append('name', 'Error Man');

      mockInsert.mockResolvedValue({ error: { message: 'Database error' } });

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Database error');
    });

    it('handles JSON parsing errors for nebenkosten', async () => {
      const formData = new FormData();
      formData.append('name', 'Json Fail');
      formData.append('nebenkosten', '{invalid-json');

      // Spy on console.error to suppress the expected error log
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await handleSubmit(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Ungültiges JSON-Format');

      consoleSpy.mockRestore();
    });
  });

  describe('deleteTenantAction', () => {
    it('deletes a tenant successfully', async () => {
      const result = await deleteTenantAction('123');

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('handles deletion errors', async () => {
      // Mock delete().eq() to return error
      mockEq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deleteTenantAction('123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Delete failed');

      consoleSpy.mockRestore();
    });
  });
});
