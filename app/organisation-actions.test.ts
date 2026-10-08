import {
  createEinladungAction,
  revokeEinladungAction,
  setMitgliedRolleAction,
  setMitgliedStatusAction,
  removeMitgliedAction,
  setOrganisationMcpAccessAction
} from './organisation-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    rpc: jest.fn().mockResolvedValue({ error: null })
  }))
}));

jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn()
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

jest.mock('@/lib/logging-middleware', () => ({
  withLogging: (_name: string, fn: any) => fn
}));

describe('organisation-actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      rpc: jest.fn().mockResolvedValue({ error: null, data: 'success' })
    };
    (ensureAuth as jest.Mock).mockResolvedValue({ user: { id: 'test-user-id' }, supabase: mockSupabase });
    (hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('createEinladungAction', () => {
    it('should successfully invite a user', async () => {
      const result = await createEinladungAction('test@example.com', 'mitarbeiter');
      expect(result).toEqual({ success: true, data: 'success', email: { sent: false } });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_einladung', {
        p_email: 'test@example.com',
        p_rolle: 'mitarbeiter',
        p_policy_ids: null
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });

    it('should fail if unauthorized', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await createEinladungAction('test@example.com', 'mitarbeiter');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Keine Berechtigung');
    });
  });

  describe('revokeEinladungAction', () => {
    it('should successfully revoke an invitation', async () => {
      const result = await revokeEinladungAction('invitation-id');
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('revoke_einladung', {
        p_einladung_id: 'invitation-id'
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });
  });

  describe('setMitgliedRolleAction', () => {
    it('should successfully set member role', async () => {
      const result = await setMitgliedRolleAction('member-id', 'admin');
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_mitglied_rolle', {
        p_mitglied_id: 'member-id',
        p_rolle: 'admin'
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });
  });

  describe('setMitgliedStatusAction', () => {
    it('should successfully set member status', async () => {
      const result = await setMitgliedStatusAction('member-id', 'deaktiviert');
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_mitglied_status', {
        p_mitglied_id: 'member-id',
        p_status: 'deaktiviert'
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });
  });

  describe('removeMitgliedAction', () => {
    it('should successfully remove a member', async () => {
      const result = await removeMitgliedAction('member-id');
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('remove_mitglied', {
        p_mitglied_id: 'member-id'
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });
  });

  describe('setOrganisationMcpAccessAction', () => {
    it('should successfully enable MCP access for organisation', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: null,
        data: { success: true, organisation_id: 'org-uuid-1', mcp_zugriff_aktiviert: true }
      });

      const result = await setOrganisationMcpAccessAction('org-uuid-1', true);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, organisation_id: 'org-uuid-1', mcp_zugriff_aktiviert: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_organisation_mcp_access', {
        p_org_id: 'org-uuid-1',
        p_enabled: true
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });

    it('should successfully disable MCP access for organisation', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: null,
        data: { success: true, organisation_id: 'org-uuid-1', mcp_zugriff_aktiviert: false }
      });

      const result = await setOrganisationMcpAccessAction('org-uuid-1', false);
      expect(result.success).toBe(true);
      expect(result.data?.mcp_zugriff_aktiviert).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_organisation_mcp_access', {
        p_org_id: 'org-uuid-1',
        p_enabled: false
      });
      expect(revalidatePath).toHaveBeenCalledWith('/organisation');
    });

    it('should fail when user lacks organisation:verwalten permission', async () => {
      (hasPermission as jest.Mock).mockResolvedValueOnce(false);

      const result = await setOrganisationMcpAccessAction('org-uuid-1', false);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Keine Berechtigung zum Verwalten der Organisation');
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', async () => {
      (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Nicht angemeldet'));

      const result = await setOrganisationMcpAccessAction('org-uuid-1', true);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Nicht angemeldet');
    });

    it('should fail when organisationId is missing or whitespace-only', async () => {
      const resultEmpty = await setOrganisationMcpAccessAction('', true);
      expect(resultEmpty.success).toBe(false);
      expect(resultEmpty.error?.message).toContain('Organisations-ID ist erforderlich');

      const resultWhitespace = await setOrganisationMcpAccessAction('   \t\n  ', true);
      expect(resultWhitespace.success).toBe(false);
      expect(resultWhitespace.error?.message).toContain('Organisations-ID ist erforderlich');

      const resultNull = await setOrganisationMcpAccessAction(null as unknown as string, true);
      expect(resultNull.success).toBe(false);
      expect(resultNull.error?.message).toContain('Organisations-ID ist erforderlich');
    });

    it('should handle RPC error response', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: { message: 'Database error occurred' },
        data: null
      });

      const result = await setOrganisationMcpAccessAction('org-uuid-1', true);
      expect(result.success).toBe(false);
      // Raw DB details must not reach the client (matches the consent actions' sanitization)
      expect(result.error?.message).toBe('MCP-Zugriff für die Organisation konnte nicht geändert werden. Bitte versuchen Sie es erneut.');
    });
  });
});
