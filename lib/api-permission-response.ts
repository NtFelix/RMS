import { NextResponse } from 'next/server';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import {
  API_PERMISSION_CHECK_FAILED_CODE,
  API_PERMISSION_CHECK_FAILED_MESSAGE,
  API_PERMISSION_DENIED_CODE,
  PermissionCheckError,
} from '@/lib/permissions-core';

/**
 * Answer for an error of requireApiPermission, or null if the error is something else (the route then handles it as
 * before).
 * - missing right:        403 `{ error: 'Permission denied', code: PERMISSION_DENIED }`
 * - check itself failed:  503 `{ error: 'Permission check failed', code: PERMISSION_CHECK_FAILED }` (a retry can help)
 * Both deny access; only status and message differ.
 *
 * Kept apart from api-permissions.ts so that a route can import it statically (api-permissions is loaded lazily).
 */
export function apiPermissionErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof PermissionCheckError) {
    return NextResponse.json(
      { error: API_PERMISSION_CHECK_FAILED_MESSAGE, code: API_PERMISSION_CHECK_FAILED_CODE },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }
  if (error instanceof Error && error.message === 'Permission denied') {
    return NextResponse.json(
      { error: 'Permission denied', code: API_PERMISSION_DENIED_CODE },
      { status: 403, headers: NO_CACHE_HEADERS }
    );
  }
  return null;
}
