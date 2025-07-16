export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPlanDetails } from '@/lib/stripe-server'; // Assuming lib is aliased to @/lib
import { Profile } from '@/types/supabase'; // Import the Profile type
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import { calculateOverallSubscriptionActivity } from '@/lib/utils';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: async (name) => { const cookie = cookieStore.get(name); return cookie?.value; }, set: () => {}, remove: () => {} } });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>(); // Use the imported Profile type

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      // You might want to return a default profile structure or a 404
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Use the new utility function to get the count of Wohnungen
    const currentWohnungenCount = await getCurrentWohnungenCount(supabase, user.id);


    let planDetails = null;
    if (profile.stripe_price_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      try {
        planDetails = await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        // Depending on the error, you might want to return a specific message
        // For now, we'll just indicate that plan details couldn't be fetched
        return NextResponse.json({ error: 'Could not fetch plan details' }, { status: 500 });
      }
    }

    const responseData = {
      // Ensure all fields from the Profile type are potentially available if selected
      // You might want to explicitly pick fields from the profile for the response
      id: profile.id,
      email: user.email, // User's primary email from auth
      profileEmail: profile.email, // Email from profile table, if different or specifically needed
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
      stripe_subscription_status: profile.stripe_subscription_status,
      stripe_price_id: profile.stripe_price_id,
      stripe_current_period_end: profile.stripe_current_period_end,
      activePlan: planDetails, // This will be null if no active plan or error fetching
      hasActiveSubscription: calculateOverallSubscriptionActivity(profile),
      currentWohnungenCount: currentWohnungenCount, // Add this line
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Generic server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
