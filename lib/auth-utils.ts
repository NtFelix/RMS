import { type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

  // 2. Fallback to RPC current_organisation_id
  if (!orgId) {
    const { data: rpcOrgId } = await supabase.rpc('current_organisation_id');
    if (rpcOrgId) orgId = rpcOrgId;
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
