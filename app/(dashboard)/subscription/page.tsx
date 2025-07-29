// app/(dashboard)/subscription/page.tsx
export const runtime = 'edge';
import { createSupabaseServerClient as createClient } from '@/lib/supabase-server';
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

  // Determine if the trial is active based on Stripe subscription status only
  const isTrialCurrentlyActive = baseProfile.stripe_subscription_status === 'trialing';


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
