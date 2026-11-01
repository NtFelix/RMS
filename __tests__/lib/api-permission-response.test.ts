/**
 * @jest-environment node
 */
import { apiPermissionErrorResponse } from '@/lib/api-permission-response';
import { PermissionCheckError } from '@/lib/permissions-core';

describe('apiPermissionErrorResponse', () => {
  it('missing right: 403 PERMISSION_DENIED', async () => {
    const res = apiPermissionErrorResponse(new Error('Permission denied'));

    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
  });

  it('failed check: 503 PERMISSION_CHECK_FAILED with a fixed text (no internal details)', async () => {
    const res = apiPermissionErrorResponse(new PermissionCheckError());

    expect(res?.status).toBe(503);
    expect(await res?.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
  });

  it('anything else: null, the route handles it as before', () => {
    expect(apiPermissionErrorResponse(new Error('boom'))).toBeNull();
    expect(apiPermissionErrorResponse('Permission denied')).toBeNull();
    expect(apiPermissionErrorResponse(undefined)).toBeNull();
  });
});
