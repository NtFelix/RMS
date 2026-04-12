import { getPlanDetails } from "@/lib/stripe-server"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { getUserDisplayData } from "@/lib/utils/user"

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
    return {
      user: null,
      userName: 'Gast',
      userEmail: '',
      userInitials: 'G',
      apartmentCount: 0,
      apartmentLimit: 0, // Default to 0 instead of null to avoid "Unlimited" interpretation
    }
  }

  // Use shared utility for display name and initials
  const displayData = getUserDisplayData(user);

  // Parallel fetch for apartment count and profile if not provided
  const [countResult, secondaryProfileResult] = await Promise.all([
    supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
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

  if (activeProfile?.stripe_subscription_status === 'active' && activeProfile?.stripe_price_id) {
    try {
        const plans = await getPlanDetails(activeProfile.stripe_price_id);
        apartmentLimit = plans?.limitWohnungen ?? null;
    } catch (e) {
        console.error("[getSidebarUserData] Failed to fetch plan details:", e);
    }
  }

  return {
    user,
    ...displayData,
    apartmentCount: countResult.count || 0,
    apartmentLimit,
  }
}
