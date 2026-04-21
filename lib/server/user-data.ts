import { getPlanDetails } from "@/lib/stripe-server"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { getUserDisplayData } from "@/lib/utils/user"
import { normalizeApartmentLimit } from "@/lib/utils/subscription"

export interface SidebarUserData {
  user: User | null;
  userName: string;
  userEmail: string;
  userInitials: string;
  apartmentCount: number;
  apartmentLimit: number | null;
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
      apartmentLimit: null, // Guest users should see "Unbegrenzte Wohnungen" instead of 0/0
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

  let apartmentLimit: number | null = null;
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
        const normalizedLimit = normalizeApartmentLimit(plans?.limit_wohnungen);
        
        // For trial users: use max of default (5) or plan limit (allows unlimited plans during trial)
        if (isTrialing && normalizedLimit !== null) {
          apartmentLimit = normalizedLimit === Infinity ? Infinity : Math.max(5, normalizedLimit);
        } else if (isActive) {
          apartmentLimit = normalizedLimit;
        }
    } catch (e) {
        console.error("[getSidebarUserData] Failed to fetch plan details:", e);
        // Fallback: trial users get 5, active users get null
        apartmentLimit = isTrialing ? 5 : null;
    }
  }

  return {
    user,
    ...displayData,
    apartmentCount: countResult.count || 0,
    apartmentLimit,
  }
}
