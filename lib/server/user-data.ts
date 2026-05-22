import { getPlanDetails } from "@/lib/stripe-server"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { getUserDisplayData } from "@/lib/utils/user"
import { getEffectiveApartmentLimit } from "@/lib/utils/subscription"

export interface SidebarUserData {
  user: User | null;
  userName: string;
  userEmail: string;
  userInitials: string;
  apartmentCount: number;
  apartmentLimit: number | typeof Infinity | null;
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
    }
  }

  // Use shared utility for display name and initials
  const displayData = getUserDisplayData(user);

  // Parallel fetch for apartment count and profile if not provided
  const [countResult, secondaryProfileResult] = await Promise.all([
    supabase
      .from('Wohnungen')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Only fetch profile if it wasn't provided
    !profile ? supabase
      .from('profiles')
      .select('stripe_subscription_status, stripe_price_id')
      .eq('id', user.id)
      .single() : Promise.resolve({ data: profile })
  ]);

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
  }
}
