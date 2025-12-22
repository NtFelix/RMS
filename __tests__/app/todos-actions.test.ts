
import { aufgabeServerAction, toggleTaskStatusAction, bulkUpdateTaskStatusesAction, bulkDeleteTasksAction, deleteTaskAction } from '@/app/todos-actions';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

// Mock Supabase
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();
const mockUpdateIn = jest.fn();
const mockDeleteIn = jest.fn();

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockSingle = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Todos Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();

    mockSingle.mockReturnThis();

    // Wiring
    mockSelect.mockReturnValue({
        eq: mockSelectEq,
        single: mockSingle,
    });

    mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
        in: mockUpdateIn
    });

    mockUpdateEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockUpdateIn.mockReturnValue({
        select: jest.fn().mockReturnValue({
            data: [{ id: 't1' }, { id: 't2' }]
        })
    });

    mockDelete.mockReturnValue({
        eq: mockDeleteEq,
        in: mockDeleteIn
    });

    // Default resolutions
    mockSingle.mockResolvedValue({ data: { id: 'task-1', name: 'Task 1' }, error: null });
    mockDeleteEq.mockResolvedValue({ data: null, error: null });
    mockDeleteIn.mockResolvedValue({ count: 2, error: null });
  });

  describe('aufgabeServerAction', () => {
    const validData = {
      name: 'New Task',
      beschreibung: 'Description',
      ist_erledigt: false,
    };

    it('should create a new task', async () => {
      const result = await aufgabeServerAction(null, validData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Aufgaben');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Task',
        ist_erledigt: false
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/todos');
      expect(result.success).toBe(true);
    });

    it('should update an existing task', async () => {
      const result = await aufgabeServerAction('task-1', validData);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'task-1');
      expect(result.success).toBe(true);
    });

    it('should fail if name is empty', async () => {
      const invalidData = { ...validData, name: '' };
      const result = await aufgabeServerAction(null, invalidData);
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Name ist erforderlich.');
    });

    it('should handle db errors', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });
        const result = await aufgabeServerAction(null, validData);
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('DB Error');
    });
  });

  describe('toggleTaskStatusAction', () => {
    it('should toggle status', async () => {
        const result = await toggleTaskStatusAction('task-1', true);

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            ist_erledigt: true
        }));
        expect(mockUpdateEq).toHaveBeenCalledWith('id', 'task-1');
        expect(result.success).toBe(true);
    });
  });

  describe('bulkUpdateTaskStatusesAction', () => {
      it('should update multiple tasks', async () => {
          mockUpdateIn.mockReturnValue({
             select: jest.fn().mockResolvedValue({ data: [{id: 't1'}, {id: 't2'}], error: null })
          });

          const result = await bulkUpdateTaskStatusesAction(['t1', 't2'], true);

          expect(mockUpdate).toHaveBeenCalled();
          expect(mockUpdateIn).toHaveBeenCalledWith('id', ['t1', 't2']);
          expect(result.success).toBe(true);
          expect(result.updatedCount).toBe(2);
      });

      it('should fail if no tasks provided', async () => {
          const result = await bulkUpdateTaskStatusesAction([], true);
          expect(result.success).toBe(false);
      });
  });

  describe('bulkDeleteTasksAction', () => {
      it('should delete multiple tasks', async () => {
          const result = await bulkDeleteTasksAction(['t1', 't2']);

          expect(mockDelete).toHaveBeenCalled();
          expect(mockDeleteIn).toHaveBeenCalledWith('id', ['t1', 't2']);
          expect(result.success).toBe(true);
          expect(result.deletedCount).toBe(2);
      });
  });

  describe('deleteTaskAction', () => {
      it('should delete a task', async () => {
          const result = await deleteTaskAction('task-1');

          expect(mockDelete).toHaveBeenCalled();
          expect(mockDeleteEq).toHaveBeenCalledWith('id', 'task-1');
          expect(result.success).toBe(true);
      });
  });
});
