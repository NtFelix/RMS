// app/(dashboard)/subscription/page.tsx
import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import SubscriptionClientPage from './client-page';
import type { UserSubscriptionProfile } from './client-page';
import type { Profile } from '@/types/supabase'; // Original Supabase Profile type

// Helper function to fetch user profile and enrich with subscription details
async function getUserProfileWithSubscription(): Promise<{ profile: UserSubscriptionProfile | null; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Error fetching user or user not found:", authError);
    return { profile: null, error: authError?.message || "User not authenticated." };
  }

  const { data: supabaseProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !supabaseProfile) {
    console.error("Error fetching Supabase profile:", profileError);
    return { profile: null, error: profileError?.message || "Profile not found." };
  }

  // Assert supabaseProfile to the original Profile type before enriching
  const baseProfile = supabaseProfile as Profile;

  let activePlanDetails = null;
  if (baseProfile.stripe_price_id && ['active', 'trialing'].includes(baseProfile.stripe_subscription_status || '')) {
    try {
      activePlanDetails = await getPlanDetails(baseProfile.stripe_price_id);
    } catch (e) {
      console.error(`Failed to get plan details for ${baseProfile.stripe_price_id}:`, (e as Error).message);
      // Continue without plan details if fetching fails, but log it
    }
  }

  const now = new Date();
  const trialEndsAt = baseProfile.trial_ends_at ? new Date(baseProfile.trial_ends_at) : null;
  const trialStartsAt = baseProfile.trial_starts_at ? new Date(baseProfile.trial_starts_at) : null;

  // Determine if the trial is active.
  // A trial is active if trial_ends_at is in the future AND stripe_subscription_status is 'trialing' or empty/null (not yet a paid sub).
  // Or, if they have a trial_ends_at and no stripe_subscription_id yet.
  let isTrialCurrentlyActive = false;
  if (trialEndsAt && trialEndsAt > now) {
    // If status is 'trialing', it's definitely an active trial.
    // If status is null/undefined/empty, and trial_ends_at is future, also consider it active trial (pre-Stripe record perhaps).
    if (baseProfile.stripe_subscription_status === 'trialing' || !baseProfile.stripe_subscription_status) {
        isTrialCurrentlyActive = true;
    }
    // If they have a subscription_id but status is not 'trialing' (e.g. 'active', 'past_due'), then trial is not the active state.
    // Exception: if they somehow have an 'active' status but trial_ends_at is future, this logic might need refinement
    // based on exact business rules for transition from trial to paid. For now, 'trialing' status is key for Stripe-managed trials.
  }


  // Construct the UserSubscriptionProfile
  const enrichedProfile: UserSubscriptionProfile = {
    ...baseProfile, // Spread all fields from the fetched Supabase profile
    email: user.email || '', // Ensure email is present
    hasActiveSubscription: ['active', 'trialing'].includes(baseProfile.stripe_subscription_status || ''),
    activePlan: activePlanDetails ? {
      priceId: activePlanDetails.priceId,
      name: activePlanDetails.name,
      price: activePlanDetails.price || 0, // Ensure price is number
      currency: activePlanDetails.currency || 'usd', // Ensure currency is string
      features: activePlanDetails.features || [], // Ensure features is array
      limitWohnungen: activePlanDetails.limitWohnungen,
    } : undefined, // Set to undefined if no active plan details
    isTrialActive: isTrialCurrentlyActive,
    // trial_starts_at and trial_ends_at are already from baseProfile
  };

  return { profile: enrichedProfile };
}


export default async function SubscriptionPage() {
  const { profile, error } = await getUserProfileWithSubscription();

  // If there's an error fetching the profile, or profile is null,
  // we pass this information to the client component to render an error message or loading state.
  if (error || !profile) {
    return <SubscriptionClientPage initialProfile={null} error={error || "Failed to load subscription details."} />;
  }

  return <SubscriptionClientPage initialProfile={profile} />;
}
