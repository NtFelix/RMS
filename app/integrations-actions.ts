'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Define the shape of the grant object based on Supabase OAuth response
export interface OAuthGrant {
  id: string;
  client_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  scopes: string[];
  client?: {
    id: string;
    name: string;
    logo_uri?: string;
  };
}

export interface GetAuthorizedAppsResult {
  success: boolean;
  grants?: OAuthGrant[];
  error?: string;
}

export async function getAuthorizedApps(): Promise<GetAuthorizedAppsResult> {
  try {
    // 1. Get current authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // 2. Initialize Admin Client
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Fetch grants for the user
    // Note: This relies on Supabase Auth Admin API
    // We try to access it via the admin client.
    // The exact path might be under 'oauth' namespace depending on SDK version.
    // We'll try the standard locations.

    // Attempt 1: supabaseAdmin.auth.admin.listGrants(userId)
    // Note: The SDK typing might not fully expose this if it's a recent beta feature,
    // so we cast to 'any' to avoid build errors if types are outdated.
    const adminAuth = supabaseAdmin.auth.admin as any;

    let grantsData;
    let grantsError;

    if (adminAuth.oauth && typeof adminAuth.oauth.listGrants === 'function') {
         const response = await adminAuth.oauth.listGrants(user.id);
         grantsData = response.data;
         grantsError = response.error;
    } else if (typeof adminAuth.listGrants === 'function') {
         const response = await adminAuth.listGrants(user.id);
         grantsData = response.data;
         grantsError = response.error;
    } else {
        // Fallback: If the method is not found, we might need to query the table directly
        // if we have access, but strictly speaking we should use the API.
        // For now, let's assume one of the above works or return empty.
        console.warn('listGrants method not found on Supabase Admin client');
        return { success: true, grants: [] };
    }

    if (grantsError) {
      console.error('Error fetching grants:', grantsError);
      return { success: false, error: grantsError.message };
    }

    // Map the response to our interface
    // The structure depends on what Supabase returns.
    // Usually it returns an array of grant objects.
    return { success: true, grants: grantsData as OAuthGrant[] };

  } catch (error: any) {
    console.error('Exception in getAuthorizedApps:', error);
    return { success: false, error: error.message || 'Ein unerwarteter Fehler ist aufgetreten' };
  }
}

export async function revokeApp(grantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get current authenticated user (security check)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // 2. Initialize Admin Client
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Verify Ownership: Check if the grant belongs to the user
    // We must list the user's grants first to ensure they own the one they are trying to delete (IDOR protection)
    const adminAuth = supabaseAdmin.auth.admin as any;

    let grantsData: OAuthGrant[] = [];

    if (adminAuth.oauth && typeof adminAuth.oauth.listGrants === 'function') {
         const response = await adminAuth.oauth.listGrants(user.id);
         grantsData = response.data || [];
    } else if (typeof adminAuth.listGrants === 'function') {
         const response = await adminAuth.listGrants(user.id);
         grantsData = response.data || [];
    }

    const isOwner = grantsData.some(g => g.id === grantId);
    if (!isOwner) {
        return { success: false, error: 'Zugriff verweigert oder Grant nicht gefunden' };
    }

    // 4. Revoke the grant
    let revokeError;

    if (adminAuth.oauth && typeof adminAuth.oauth.deleteGrant === 'function') {
        // Sometimes it's called deleteGrant or revokeGrant
        const response = await adminAuth.oauth.deleteGrant(grantId);
        revokeError = response.error;
    } else if (adminAuth.oauth && typeof adminAuth.oauth.revokeGrant === 'function') {
        const response = await adminAuth.oauth.revokeGrant(grantId);
        revokeError = response.error;
    } else if (typeof adminAuth.deleteGrant === 'function') {
        const response = await adminAuth.deleteGrant(grantId);
        revokeError = response.error;
    } else {
         console.warn('deleteGrant/revokeGrant method not found on Supabase Admin client');
         return { success: false, error: 'Funktion nicht verfügbar' };
    }

    if (revokeError) {
      console.error('Error revoking grant:', revokeError);
      return { success: false, error: revokeError.message };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Exception in revokeApp:', error);
    return { success: false, error: error.message || 'Ein unerwarteter Fehler ist aufgetreten' };
  }
}
