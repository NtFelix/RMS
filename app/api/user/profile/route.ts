import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getPlanDetails } from '@/lib/stripe-server'; // Assuming lib is aliased to @/lib
import { Profile } from '@/types/supabase'; // Import the Profile type

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

    // Get the count of Wohnungen for the current user
    let currentWohnungenCount = 0;
    try {
      const { count, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (wohnungenError) {
        console.error('Wohnungen count error:', wohnungenError);
        // Default to 0 if there's an error
      } else {
        currentWohnungenCount = count || 0;
      }
    } catch (error) {
      console.error('Error fetching Wohnungen count:', error);
      // Default to 0 in case of any other error
    }


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
      hasActiveSubscription: !!planDetails && (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing'),
      currentWohnungenCount: currentWohnungenCount, // Add this line
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Generic server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
