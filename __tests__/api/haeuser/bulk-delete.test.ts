import { POST } from '@/app/api/haeuser/bulk-delete/route';
import { requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds } from '@/lib/object-scope';
import { softDeleteEntryAction } from '@/lib/papierkorb/utils';

jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
}));

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn(),
}));

jest.mock('@/lib/papierkorb/utils', () => ({
  softDeleteEntryAction: jest.fn(),
}));

describe('POST /api/haeuser/bulk-delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should return 403 if getAccessibleHaeuserIds denies scope', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['accessible-id-1']);

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['inaccessible-id'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Permission denied');
  });

  it('should call softDeleteEntryAction for each ID and return success', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null); // unrestricted
    (softDeleteEntryAction as jest.Mock).mockResolvedValue(undefined);

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1', 'id-2'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.successCount).toBe(2);

    expect(softDeleteEntryAction).toHaveBeenCalledTimes(2);
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(1, 'Haeuser', 'id-1');
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(2, 'Haeuser', 'id-2');
  });

  it('should return 500 if softDeleteEntryAction fails', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
    (softDeleteEntryAction as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Database error');
  });
});
