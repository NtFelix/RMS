import { POST } from '@/app/api/haeuser/bulk-delete/route';
import { createClient } from '@/utils/supabase/server';
import { requireApiPermission, verifyEntityInScope } from '@/lib/api-permissions';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
  verifyEntityInScope: jest.fn(),
}));

describe('POST /api/haeuser/bulk-delete', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      rpc: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should return 400 if ids is not an array or empty', async () => {
    const request = {
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Mindestens eine Haus-ID ist erforderlich.');
  });

  it('should return 403 if permission check fails', async () => {
    (requireApiPermission as jest.Mock).mockRejectedValue(new Error('Permission denied'));

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Permission denied');
  });

  it('should return 403 if verifyEntityInScope fails', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (verifyEntityInScope as jest.Mock).mockResolvedValue(false);

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Permission denied');
  });

  it('should call soft_delete_record for each ID and return success', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (verifyEntityInScope as jest.Mock).mockResolvedValue(true);
    mockSupabase.rpc.mockResolvedValue({ error: null });

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1', 'id-2'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.successCount).toBe(2);

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'soft_delete_record', {
      p_table_name: 'Haeuser',
      p_record_id: 'id-1',
    });
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'soft_delete_record', {
      p_table_name: 'Haeuser',
      p_record_id: 'id-2',
    });
  });

  it('should return 500 if supabase RPC fails', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (verifyEntityInScope as jest.Mock).mockResolvedValue(true);
    mockSupabase.rpc.mockResolvedValue({ error: { message: 'Database error' } });

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Database error');
  });
});
