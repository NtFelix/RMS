
import { aufgabeServerAction, toggleTaskStatusAction, bulkUpdateTaskStatusesAction, bulkDeleteTasksAction, deleteTaskAction } from '@/app/todos-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

// Mock the dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn()
}));

describe('todos-actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('aufgabeServerAction', () => {
    it('creates a new task successfully', async () => {
      const payload = { name: 'New Task', ist_erledigt: false };
      mockSupabase.single.mockResolvedValue({ data: { id: '1', ...payload }, error: null });

      const result = await aufgabeServerAction(null, payload);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Aufgaben');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining(payload));
      expect(revalidatePath).toHaveBeenCalledWith('/todos');
    });

    it('updates an existing task successfully', async () => {
      const payload = { name: 'Updated Task', ist_erledigt: true };
      mockSupabase.single.mockResolvedValue({ data: { id: '1', ...payload }, error: null });

      const result = await aufgabeServerAction('1', payload);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Aufgaben');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Task' }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('validates required name', async () => {
      const payload = { name: '' };
      const result = await aufgabeServerAction(null, payload as any);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Name ist erforderlich.');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'DB Error' } });
      const result = await aufgabeServerAction(null, { name: 'Task' });

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleTaskStatusAction', () => {
    it('toggles task status successfully', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1', ist_erledigt: true }, error: null });

      const result = await toggleTaskStatusAction('1', true);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ ist_erledigt: true }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('handles errors during toggle', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await toggleTaskStatusAction('1', true);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Error');
    });
  });

  describe('bulkUpdateTaskStatusesAction', () => {
    it('updates multiple tasks', async () => {
      mockSupabase.select.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null });
      // Note: .select() is called at the end of the chain

      const result = await bulkUpdateTaskStatusesAction(['1', '2'], true);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['1', '2']);
    });

    it('returns error if no tasks provided', async () => {
      const result = await bulkUpdateTaskStatusesAction([], true);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Keine Aufgaben');
    });
  });

  describe('bulkDeleteTasksAction', () => {
    it('deletes multiple tasks', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.in.mockResolvedValue({ count: 2, error: null });

      const result = await bulkDeleteTasksAction(['1', '2']);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['1', '2']);
    });
  });

  describe('deleteTaskAction', () => {
    it('deletes a single task', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await deleteTaskAction('1');

      expect(result.success).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });
  });
});
