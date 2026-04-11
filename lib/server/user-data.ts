import { createClient } from "@/utils/supabase/server"
import { getPlanDetails } from "@/lib/stripe-server"
import { User } from "@supabase/supabase-js"

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
 * This prevents the "flash of unstyled/empty content" by providing initial data
 * during the first server-side render.
 */
export async function getSidebarUserData(): Promise<SidebarUserData> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      userName: 'Gast',
      userEmail: '',
      userInitials: 'G',
      apartmentCount: 0,
      apartmentLimit: null,
    }
  }

  // Derive name/initials (must match useUserProfile logic)
  const { first_name: rawFirstName, last_name: rawLastName } = user.user_metadata || {};
  const firstName = (typeof rawFirstName === 'string' ? rawFirstName.trim() : '');
  const lastName = (typeof rawLastName === 'string' ? rawLastName.trim() : '');

  let userName = 'Namen in Einstellungen festlegen';
  let userInitials = '?';

  if (firstName && lastName) {
    userName = `${firstName} ${lastName}`;
    userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  } else if (firstName) {
    userName = firstName;
    userInitials = firstName.charAt(0).toUpperCase();
  }

  // Parallel fetch for apartment count and profile
  const [countResult, profileResult] = await Promise.all([
    supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('stripe_subscription_status, stripe_price_id')
      .eq('id', user.id)
      .single()
  ]);

  let apartmentLimit: number | null = null;
  const profile = profileResult.data;

  if (profile?.stripe_subscription_status === 'active' && profile?.stripe_price_id) {
    try {
        const plans = await getPlanDetails(profile.stripe_price_id);
        apartmentLimit = plans?.limitWohnungen ?? null;
    } catch (e) {
        console.error("[getSidebarUserData] Failed to fetch plan details:", e);
    }
  }

  return {
    user,
    userName,
    userEmail: user.email || 'Keine E-Mail',
    userInitials,
    apartmentCount: countResult.count || 0,
    apartmentLimit,
  }
}
