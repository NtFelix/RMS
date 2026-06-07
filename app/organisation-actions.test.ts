import { createEinladungAction, revokeEinladungAction, setMitgliedRolleAction, setMitgliedStatusAction, removeMitgliedAction } from './organisation-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
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
      expect(result).toEqual({ success: true, data: 'success' });
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
});
