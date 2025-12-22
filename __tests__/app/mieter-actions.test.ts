
import { handleSubmit, deleteTenantAction, getMieterByHausIdAction, updateKautionAction } from '@/app/mieter-actions';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

// Mock dependencies
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

// Mock Supabase
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockSingle = jest.fn();
const mockIn = jest.fn();
const mockOr = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Mieter Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default chainable mocks
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();

    mockSelectEq.mockReturnThis();
    mockUpdateEq.mockReturnThis();
    mockDeleteEq.mockReturnThis();

    mockSingle.mockReturnThis();
    mockIn.mockReturnThis();
    mockOr.mockReturnThis();

    // Default return values for chains
    mockSelect.mockReturnValue({
      eq: mockSelectEq,
      in: mockIn,
      or: mockOr,
      single: mockSingle,
    });

    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    mockUpdate.mockReturnValue({
      eq: mockUpdateEq
    });

    mockDelete.mockReturnValue({
      eq: mockDeleteEq
    });

    // Select chain
    mockSelectEq.mockReturnValue({
      single: mockSingle,
      data: [],
      error: null
    });

    // Default leaf resolutions
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
    mockDeleteEq.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: {}, error: null });
  });

  describe('handleSubmit', () => {
    it('should create a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      mockSingle.mockResolvedValueOnce({ data: { id: 'new-tenant-id' }, error: null });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(logAction).toHaveBeenCalledWith('createTenant', 'success', expect.anything());
      expect(result).toEqual({ success: true });
    });

    it('should update an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'tenant-123');
      formData.append('name', 'Jane Doe');

      mockUpdateEq.mockResolvedValueOnce({ error: null });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Jane Doe',
      }));
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'tenant-123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(logAction).toHaveBeenCalledWith('updateTenant', 'success', expect.anything());
      expect(result).toEqual({ success: true });
    });

    it('should return error if insert fails', async () => {
      const formData = new FormData();
      formData.append('name', 'Fail User');

      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

      const result = await handleSubmit(formData);

      expect(result).toEqual({ success: false, error: { message: 'Insert failed' } });
    });
  });

  describe('deleteTenantAction', () => {
    it('should delete a tenant successfully', async () => {
      mockDeleteEq.mockResolvedValueOnce({ error: null });

      const result = await deleteTenantAction('tenant-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'tenant-123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(result).toEqual({ success: true });
    });

    it('should return error if delete fails', async () => {
      mockDeleteEq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

      const result = await deleteTenantAction('tenant-123');

      expect(result).toEqual({ success: false, error: { message: 'Delete failed' } });
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('should fetch tenants by house id', async () => {
      // Mock step 1: fetch wohnungen
      mockSelectEq.mockResolvedValueOnce({ data: [{ id: 'w1' }, { id: 'w2' }], error: null });

      // Mock step 2: fetch mieter
      mockIn.mockResolvedValueOnce({ data: [{ id: 't1', name: 'Tenant 1' }], error: null });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return error if fetching wohnungen fails', async () => {
      mockSelectEq.mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed' } });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });
  });

  describe('updateKautionAction', () => {
    it('should update kaution successfully', async () => {
      const formData = new FormData();
      formData.append('tenantId', 't1');
      formData.append('amount', '1000');
      formData.append('status', 'Erhalten');

      // Mock fetch existing tenant (select chain)
      mockSingle.mockResolvedValueOnce({ data: { kaution: { createdAt: 'old-date' } }, error: null });

      // Mock update (update chain)
      mockUpdateEq.mockResolvedValueOnce({ error: null });

      const result = await updateKautionAction(formData);

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should fail with invalid amount', async () => {
      const formData = new FormData();
      formData.append('tenantId', 't1');
      formData.append('amount', 'invalid');

      const result = await updateKautionAction(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Betrag muss eine positive Zahl sein');
    });
  });
});
