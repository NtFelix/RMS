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
    price: number | null; // Changed from string
    currency: string; // Added
    features: string[]; // Added
    limitWohnungen: number | null; // Confirmed
  } | null | undefined; // Added undefined
  hasActiveSubscription: boolean;
  currentWohnungenCount: number;
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
      ...profile, // Spread all fields from the fetched SupabaseProfile
      email: user.email, // Primary email from auth
      profileEmail: profile.email, // Email from the profile table
      activePlan: planDetails,
      hasActiveSubscription,
      currentWohnungenCount,
      // Ensure all required fields from SupabaseProfile are present
      // id is from profile
      // stripe_customer_id is from profile, etc.
    };

    return responseData;

  } catch (error: any) {
    console.error('Generic server error in getUserProfileForSettings:', error);
    return { error: 'Internal server error', details: error.message };
  }
}
