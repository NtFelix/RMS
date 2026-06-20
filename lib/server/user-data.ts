import { getPlanDetails } from "@/lib/stripe-server"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { getUserDisplayData } from "@/lib/utils/user"
import { getEffectiveApartmentLimit } from "@/lib/utils/subscription"

/**
 * Modules that are gated by permissions in the sidebar.
 * `null` = unrestricted (owner/admin or personal account).
 * A Set means only the listed modules are visible to this user.
 */
export type SidebarModulePermissions = Set<string> | null;

export interface SidebarUserData {
  user: User | null;
  userName: string;
  userEmail: string;
  userInitials: string;
  apartmentCount: number;
  apartmentLimit: number | typeof Infinity | null;
  hasOrganisationPermission: boolean;
  isOrganisationHidden: boolean;
  /** null = no restrictions (personal account or owner/admin). Set = allowed modules. */
  modulePermissions: SidebarModulePermissions;
}

/**
 * Fetches all data required for the dashboard sidebar profile widget on the server.
 * Optimized to accept already-fetched user and profile data to minimize round-trips.
 */
export async function getSidebarUserData(
  supabase: SupabaseClient, 
  user: User | null,
  profile?: { stripe_subscription_status: string | null; stripe_price_id: string | null } | null
): Promise<SidebarUserData> {
  if (!user) {
    const guestData = getUserDisplayData(null);
    return {
      user: null,
      ...guestData,
      apartmentCount: 0,
      apartmentLimit: Infinity, // Guest users = unlimited (consistent with normalizeApartmentLimit)
      hasOrganisationPermission: false,
      isOrganisationHidden: false,
      modulePermissions: null,
    }
  }

  // Use shared utility for display name and initials
  const displayData = getUserDisplayData(user);

  // Parallel fetch for apartment count, profile, organisation info if not provided
  const [countResult, secondaryProfileResult, orgIdResult] = await Promise.all([
    supabase
      .from('Wohnungen')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Only fetch profile if it wasn't provided
    !profile ? supabase
      .from('profiles')
      .select('stripe_subscription_status, stripe_price_id')
      .eq('id', user.id)
      .single() : Promise.resolve({ data: profile }),
    supabase.rpc('current_organisation_id'),
  ]);

  const orgId = orgIdResult.data;
  const hasOrganisationPermission = orgId !== null;
  let isOrganisationHidden = false;
  let modulePermissions: SidebarModulePermissions = null;

  if (orgId) {
    const [orgDataResult, accessibleHaeuserResult, ...permChecks] = await Promise.all([
      supabase
        .from('Organisation')
        .select('ist_versteckt')
        .eq('id', orgId)
        .maybeSingle(),
      // Fetch object-scope house IDs to handle the "object-scope exception":
      // If a member has no module.haeuser permission but has specific house IDs
      // in their object scope, they can still access /haeuser (with filtered data).
      supabase.rpc('get_accessible_haeuser_ids'),
      // Check 'ansehen' permission for each sidebar-gated module in parallel.
      // Owners/admins → check_permission returns true for all.
      // Restricted members → only returns true for explicitly granted modules.
      supabase.rpc('check_permission', { p_modul: 'haeuser', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'wohnungen', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'mieter', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'finanzen', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'betriebskosten', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'aufgaben', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'dokumente', p_aktion: 'ansehen' }),
      supabase.rpc('check_permission', { p_modul: 'organisation', p_aktion: 'ansehen' }),
    ]);

    isOrganisationHidden = orgDataResult.data?.ist_versteckt ?? false;

    const GATED_MODULES = ['haeuser', 'wohnungen', 'mieter', 'finanzen', 'betriebskosten', 'aufgaben', 'dokumente', 'organisation'] as const;
    const allAllowed = permChecks.every(r => r.data === true);

    if (!allAllowed) {
      // At least one module is restricted — build a specific allow-set.
      modulePermissions = new Set(
        GATED_MODULES.filter((_, i) => permChecks[i].data === true)
      );

      // Object-scope exception: if the user has specific house IDs in their object scope
      // (non-empty array from get_accessible_haeuser_ids), grant access to the haeuser,
      // wohnungen, and mieter pages even without the module permission. The data RPCs
      // will further filter by scope. All three page-level guards have this same fallback
      // (see haeuser/page.tsx, wohnungen/page.tsx, mieter/page.tsx).
      const accessibleIds = accessibleHaeuserResult.data;
      const hasObjectScopedHouses = Array.isArray(accessibleIds) && accessibleIds.length > 0;
      if (hasObjectScopedHouses) {
        modulePermissions.add('haeuser');
        modulePermissions.add('wohnungen');
        modulePermissions.add('mieter');
        modulePermissions.add('finanzen');
        modulePermissions.add('betriebskosten');
      }
    }
    // If allAllowed === true, modulePermissions stays null (= unrestricted).
  }


  let apartmentLimit: number | typeof Infinity | null = null;
  const activeProfile = profile || secondaryProfileResult.data;

  const isTrialing = activeProfile?.stripe_subscription_status === 'trialing';
  const isActive = activeProfile?.stripe_subscription_status === 'active';

  // Trial users without price_id get default limit of 5
  if (isTrialing && !activeProfile?.stripe_price_id) {
    apartmentLimit = 5;
  }

  // Both active and trialing users with price_id get plan-based limits
  if ((isActive || isTrialing) && activeProfile?.stripe_price_id) {
    try {
        const plans = await getPlanDetails(activeProfile.stripe_price_id);
        // Use centralized utility for consistent limit calculation
        apartmentLimit = getEffectiveApartmentLimit(plans?.limit_wohnungen, isTrialing);
    } catch (e) {
        console.error("[getSidebarUserData] Failed to fetch plan details:", e);
        // Fallback: trial users get 5, active users get 0 (safer than null which = unlimited)
        apartmentLimit = isTrialing ? 5 : 0;
    }
  }

  return {
    user,
    ...displayData,
    apartmentCount: countResult.count || 0,
    apartmentLimit,
    hasOrganisationPermission,
    isOrganisationHidden,
    modulePermissions,
  }
}
