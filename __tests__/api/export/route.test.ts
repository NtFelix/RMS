/**
 * @jest-environment node
 */

/**
 * GET /api/export liefert ganze Tabellen und ist deshalb nur für Inhaber (owner) und Administratoren (admin) der
 * Organisation erlaubt, unabhängig von Modulrechten. Die Rolle entscheidet die Datenbankfunktion is_org_admin_or_owner;
 * sie ist hier als Fake nachgebaut. Alle Daten sind synthetische Platzhalter.
 */

import { GET } from '@/app/api/export/route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ensureAuth } from '@/lib/auth-utils';
import { AuthLookupError } from '@/lib/auth-errors';
import { checkPermission } from '@/lib/permissions';
import { generateZIP } from '@/lib/worker-client';
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('@/lib/auth-utils', () => ({ ensureAuth: jest.fn() }));
jest.mock('@/lib/worker-client', () => ({ generateZIP: jest.fn() }));
// The real role check (checkOrgAdminOrOwner) runs; module rights are stubbed to "everything allowed" so that a
// regular member holds every module right and only the role can make the difference.
jest.mock('@/lib/permissions', () => ({
  ...jest.requireActual('@/lib/permissions'),
  checkPermission: jest.fn().mockResolvedValue('allowed'),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

type Rolle = 'owner' | 'admin' | 'mitglied';

const mockCreateClient = createSupabaseServerClient as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockCheckPermission = checkPermission as jest.Mock;
const mockGenerateZIP = generateZIP as jest.Mock;
const mockHaeuserIds = getAccessibleHaeuserIds as jest.Mock;
const mockWohnungIds = getAccessibleWohnungIds as jest.Mock;

const from = jest.fn();
const rpc = jest.fn();
const getUser = jest.fn();

/** Fake of the database function: true only for the roles owner and admin */
function setRole(rolle: Rolle) {
  rpc.mockImplementation(async (name: string) =>
    name === 'is_org_admin_or_owner'
      ? { data: rolle === 'owner' || rolle === 'admin', error: null }
      : { data: null, error: { message: `unexpected rpc ${name}` } }
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation();

  const supabase = { auth: { getUser }, rpc, from };
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockCreateClient.mockResolvedValue(supabase);
  mockEnsureAuth.mockResolvedValue({ supabase, user: { id: 'user-1' } });
  mockCheckPermission.mockResolvedValue('allowed');
  mockHaeuserIds.mockResolvedValue(null);
  mockWohnungIds.mockResolvedValue(null);
  // every table query would return one synthetic row
  from.mockImplementation(() => {
    const query: any = {
      select: () => query,
      in: () => query,
      then: (resolve: (v: unknown) => void) => resolve({ data: [{ name: 'Beispiel' }], error: null }),
    };
    return query;
  });
  mockGenerateZIP.mockResolvedValue(new Response('zip-bytes', { status: 200 }));
  setRole('admin');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/export (nur Inhaber/Administratoren)', () => {
  it.each<Rolle>(['admin', 'owner'])('liefert dem Nutzer mit Rolle %s das ZIP', async (rolle) => {
    setRole(rolle);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('is_org_admin_or_owner');
    expect(from).toHaveBeenCalled();
    expect(mockGenerateZIP).toHaveBeenCalledTimes(1);
  });

  it('weist ein normales Mitglied mit allen Modulrechten mit 403 PERMISSION_DENIED ab und liest keine Tabelle', async () => {
    setRole('mitglied');

    const res = await GET();

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(from).not.toHaveBeenCalled();
    expect(mockHaeuserIds).not.toHaveBeenCalled();
    expect(mockGenerateZIP).not.toHaveBeenCalled();
  });

  it('antwortet ohne Anmeldung mit 401, ohne Rolle oder Tabellen abzufragen', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(mockGenerateZIP).not.toHaveBeenCalled();
  });

  it('antwortet mit 503 PERMISSION_CHECK_FAILED, wenn die Rollenabfrage einen Fehler liefert, und exportiert nichts', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
    expect(mockHaeuserIds).not.toHaveBeenCalled();
    expect(mockGenerateZIP).not.toHaveBeenCalled();
  });

  it('antwortet mit 503, wenn die Rollenabfrage eine Exception wirft, und exportiert nichts', async () => {
    rpc.mockRejectedValue(new Error('network down'));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(from).not.toHaveBeenCalled();
    expect(mockGenerateZIP).not.toHaveBeenCalled();
  });

  it('antwortet mit 503, wenn die Nutzerabfrage der Rollenprüfung technisch scheitert (kein Export)', async () => {
    mockEnsureAuth.mockRejectedValue(new AuthLookupError({ cause: new Error('auth service unreachable') }));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(from).not.toHaveBeenCalled();
    expect(mockGenerateZIP).not.toHaveBeenCalled();
  });

  it('verlässt sich nicht auf Modulrechte: checkPermission entscheidet nichts', async () => {
    setRole('mitglied');
    mockCheckPermission.mockResolvedValue('allowed');

    const res = await GET();

    expect(res.status).toBe(403);
    expect(mockCheckPermission).not.toHaveBeenCalled();
  });
});
