import { type User, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export type AuthResult = {
  user: User;
  supabase: SupabaseClient;
};

/**
 * Ensures the user is authenticated in a server action.
 * Throws an error if not authenticated.
 */
export async function ensureAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Nicht authentifiziert. Bitte melden Sie sich an.");
  }
  
  return { user, supabase };
}

/**
 * Safer version that returns null instead of throwing.
 */
export async function getAuth() {
  try {
    return await ensureAuth();
  } catch (error) {
    return null;
  }
}

export type ResolveUserAndOrgResult =
  | { user: User; orgId: string; userJwt?: string; errorResponse: null }
  | { user: null; orgId: ''; userJwt?: undefined; errorResponse: Response };

/**
 * Resolves the authenticated Supabase user and validates their active organization.
 * Ensures the organization ID is verified against the user's active memberships.
 */
export async function resolveUserAndOrg(req?: NextRequest): Promise<ResolveUserAndOrgResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    if (req) {
      console.error('[resolveUserAndOrg] Auth failed:', {
        authError: authError?.message || authError,
        hasUser: !!user,
      });
    }
    return {
      user: null,
      orgId: '',
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userJwt = session?.access_token;

  let requestedOrgId: string | null = null;
  if (req) {
    const { searchParams } = new URL(req.url);
    requestedOrgId = searchParams.get('orgId');
  }

  let orgId: string | null = null;

  // 1. If explicit orgId requested in query params, verify user membership
  if (requestedOrgId) {
    const { data: requestedMembership } = await supabase
      .from('Organisation_Mitglieder')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('organisation_id', requestedOrgId)
      .eq('status', 'aktiv')
      .maybeSingle();

    if (requestedMembership) {
      orgId = requestedMembership.organisation_id;
    }
  }

  // 2. Fallback to RPC current_organisation_id (verified against active user memberships)
  if (!orgId) {
    const { data: rpcOrgId } = await supabase.rpc('current_organisation_id');
    if (rpcOrgId) {
      const { data: rpcMembership } = await supabase
        .from('Organisation_Mitglieder')
        .select('organisation_id')
        .eq('user_id', user.id)
        .eq('organisation_id', rpcOrgId)
        .eq('status', 'aktiv')
        .maybeSingle();

      if (rpcMembership) {
        orgId = rpcMembership.organisation_id;
      }
    }
  }

  // 3. Fallback to first active membership
  if (!orgId) {
    const { data: membership } = await supabase
      .from('Organisation_Mitglieder')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .limit(1)
      .maybeSingle();

    orgId = membership?.organisation_id || null;
  }

  if (!orgId) {
    return {
      user: null,
      orgId: '',
      errorResponse: NextResponse.json({ error: 'No active organization found' }, { status: 400 }),
    };
  }

  return { user, orgId, userJwt, errorResponse: null };
}
