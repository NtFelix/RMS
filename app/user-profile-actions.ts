'use server';

import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';

// Define the expected return type for clarity, similar to UserProfileWithSubscription
// This helps ensure consistency with what the client-side components expect.
export interface UserProfileForSettings extends SupabaseProfile {
  email?: string; // Email from auth.user
  profileEmail?: string; // Email from profiles table
  activePlan?: {
    priceId: string; // Added
    name: string; // Kept, ensure it's string not string? if always present
    productName?: string;
    description?: string | null;
    price: number | null;
    currency: string;
    interval?: string | null;
    interval_count?: number | null;
    features: string[];
    limitWohnungen: number | null;
  } | null | undefined;
  hasActiveSubscription: boolean;
  currentWohnungenCount: number;
  // Explicitly add fields expected by SettingsModal and other parts of the system
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Supabase typically stores timestampz as ISO strings
  stripe_cancel_at_period_end?: boolean | null;
}

export async function getUserProfileForSettings(): Promise<UserProfileForSettings | { error: string; details?: any }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in getUserProfileForSettings:', authError);
      return { error: 'Not authenticated', details: authError?.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<SupabaseProfile>();

    if (profileError || !profile) {
      console.error('Profile error in getUserProfileForSettings:', profileError);
      return { error: 'Profile not found', details: profileError?.message };
    }

    // Use the new utility function to get the count of Wohnungen
    const currentWohnungenCount = await getCurrentWohnungenCount(supabase, user.id);

    let planDetails = null;
    if (profile.stripe_price_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      try {
        planDetails = await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error in getUserProfileForSettings:', stripeError);
        // Not returning error here, just means plan details couldn't be fetched
        // The client can decide how to handle missing planDetails
      }
    }

    const hasActiveSubscription = !!planDetails &&
                                  (profile.stripe_subscription_status === 'active' ||
                                   profile.stripe_subscription_status === 'trialing');

    // Construct the response, ensuring it matches UserProfileForSettings
    const responseData: UserProfileForSettings = {
      ...profile, // Spreads all fields from the fetched SupabaseProfile.
                  // This includes id, email (from profiles table), stripe_customer_id, etc.,
                  // assuming they are columns in 'profiles' table and part of SupabaseProfile type.

      email: user.email, // Override with the primary email from auth.users if it's different or more authoritative.
                         // If profile.email is preferred, this line can be removed or conditional.

      // Ensure profile specific email is explicitly mapped if needed, though ...profile should cover it.
      // profileEmail: profile.email, // This is already covered by ...profile if 'email' is the column name.
                                   // If UserProfileForSettings expects 'profileEmail' and db column is 'email', then map it:
                                   // profileEmail: profile.email

      // The UserProfileForSettings interface now explicitly lists these Stripe fields.
      // Spreading ...profile should populate them if the column names match and are in SupabaseProfile.
      // No need to re-declare them here if ...profile handles it.
      // stripe_customer_id: profile.stripe_customer_id, (covered by ...profile)
      // stripe_subscription_id: profile.stripe_subscription_id, (covered by ...profile)
      // ... and so on for other fields that are directly from the 'profiles' table.

      activePlan: planDetails,
      hasActiveSubscription,
      currentWohnungenCount,
    };

    return responseData;

  } catch (error: any) {
    console.error('Generic server error in getUserProfileForSettings:', error);
    return { error: 'Internal server error', details: error.message };
  }
}
