import { getPlanDetails } from "@/lib/stripe-server"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { getUserDisplayData } from "@/lib/utils/user"
import { getEffectiveApartmentLimit } from "@/lib/utils/subscription"
import { evaluatePermission } from "@/lib/permissions-core"

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
    const [orgDataResult, ...permChecks] = await Promise.all([
      supabase
        .from('Organisation')
        .select('ist_versteckt')
        .eq('id', orgId)
        .maybeSingle(),
      // Check 'ansehen' permission for each sidebar-gated module in parallel.
      // Owners/admins → evaluatePermission returns true for all.
      // Restricted members → only returns true for explicitly granted modules.
      evaluatePermission(supabase, user.id, orgId, 'haeuser', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'wohnungen', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'mieter', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'finanzen', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'betriebskosten', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'aufgaben', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'dokumente', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'organisation', 'ansehen'),
      evaluatePermission(supabase, user.id, orgId, 'zaehler', 'ansehen'),
    ]);

    isOrganisationHidden = orgDataResult.data?.ist_versteckt ?? false;

    const GATED_MODULES = ['haeuser', 'wohnungen', 'mieter', 'finanzen', 'betriebskosten', 'aufgaben', 'dokumente', 'organisation', 'zaehler'] as const;
    const allAllowed = permChecks.every(r => r === true);

    if (!allAllowed && !isOrganisationHidden) {
      modulePermissions = new Set(
        GATED_MODULES.filter((_, i) => permChecks[i] === true)
      );
    }
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
