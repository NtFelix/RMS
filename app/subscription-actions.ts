'use server';

import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import type { Profile as SupabaseProfile } from '@/types/supabase';

// Define the richer profile type, similar to UserSubscriptionProfile in the original client component
interface UserSubscriptionData extends SupabaseProfile {
  email: string; // From auth.user
  hasActiveSubscription: boolean;
  activePlan?: {
    priceId: string;
    name: string;
    price: number | null; // Ensure price can be null if not available
    currency: string;
    features: string[];
    limitWohnungen?: number | null;
  } | null;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  isTrialActive?: boolean;
  // Ensure all fields from SupabaseProfile are included,
  // plus specific ones needed by the subscription page.
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
}

export async function getSubscriptionPageData(): Promise<UserSubscriptionData | { error: string; details?: any }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in getSubscriptionPageData:', authError);
      return { error: 'Not authenticated', details: authError?.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<SupabaseProfile>(); // Use the base SupabaseProfile here

    if (profileError || !profile) {
      console.error('Profile error in getSubscriptionPageData:', profileError);
      return { error: 'Profile not found', details: profileError?.message };
    }

    let planDetails = null;
    if (profile.stripe_price_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      try {
        planDetails = await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error in getSubscriptionPageData:', stripeError);
        // Do not return error here; client can handle missing planDetails
      }
    }

    const hasActiveSubscription = !!planDetails &&
                                  (profile.stripe_subscription_status === 'active' ||
                                   profile.stripe_subscription_status === 'trialing');

    // Calculate isTrialActive based on trial_ends_at and current date
    // This logic was previously in the client component, now moved to server action
    let isTrialActive = false;
    if (profile.trial_ends_at) {
      const trialEndsDate = new Date(profile.trial_ends_at);
      const now = new Date();
      // Check if trial_ends_at is in the future and subscription status is 'trialing' or not yet active (e.g. user is new)
      // Or, if the user has a specific 'trialing' status from Stripe (though our custom trial logic might override)
      if (trialEndsDate > now && (profile.stripe_subscription_status === 'trialing' || !profile.stripe_subscription_status || profile.stripe_subscription_status === 'active')) {
        // If stripe_subscription_status is 'active' but trial_ends_at is in the future, it implies our custom trial.
        isTrialActive = true;
      }
    }
    // If Stripe says 'trialing', then it's a trial regardless of our custom trial_ends_at
    if (profile.stripe_subscription_status === 'trialing') {
        isTrialActive = true;
    }


    const responseData: UserSubscriptionData = {
      ...profile, // Spreads all fields from the fetched SupabaseProfile
      email: user.email || '', // Ensure email is always a string
      activePlan: planDetails,
      hasActiveSubscription,
      isTrialActive,
      // trial_starts_at and trial_ends_at are already part of SupabaseProfile from ...profile spread
    };

    return responseData;

  } catch (error: any) {
    console.error('Generic server error in getSubscriptionPageData:', error);
    return { error: 'Internal server error', details: error.message };
  }
}
