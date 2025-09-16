export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Import Supabase client

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Moved inside POST

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized or email missing' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The priceId is expected from the client request body now, not hardcoded.
    const { priceId: requestedPriceId } = await req.json(); // Renamed for clarity

    if (!requestedPriceId) {
      return new NextResponse(JSON.stringify({ error: 'Price ID (requestedPriceId) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the user's profile to get Stripe details and trial status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end, stripe_price_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 'Not a single row' (user may not have a profile yet)
      console.error('Error fetching profile for Stripe details:', profileError);
      // For other errors, it might be critical
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch user profile.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for active subscription to the *same* plan
    if (profile && profile.stripe_subscription_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing') &&
        profile.stripe_price_id === requestedPriceId) {
      console.log(`User is already subscribed to the requested plan: ${requestedPriceId}.`);
      let formattedDate = 'N/A';
      if (profile.stripe_current_period_end) {
        try {
          const date = new Date(profile.stripe_current_period_end);
          formattedDate = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (dateError) {
          console.error('Error formatting stripe_current_period_end:', dateError);
          formattedDate = typeof profile.stripe_current_period_end === 'string' ? profile.stripe_current_period_end : 'Invalid Date';
        }
      }
      return new NextResponse(JSON.stringify({
        error: "Already subscribed to this plan",
        message: `Du bist bereits für diesen Plan angemeldet. Dein aktuelles Abonnement endet am ${formattedDate}.`,
        subscriptionEndDate: formattedDate,
      }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare parameters for Stripe session creation
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_collection: 'if_required',
      mode: 'subscription',
      line_items: [
        {
          price: requestedPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id, // Store Supabase user ID in metadata
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`,
    };

    // Determine trial eligibility based on subscription history
    const isEligibleForTrial = () => {
      // A user is eligible for a trial only if they have no subscription history.
      // The presence of a `stripe_price_id` indicates a past or present subscription.
      return !(profile && profile.stripe_price_id);
    };

    if (isEligibleForTrial()) {
        console.log("Applying 14-day trial for a new user.");
        sessionParams.subscription_data = { trial_period_days: 14 };
    } else {
        console.log("Not applying a trial period. User has a subscription history.");
    }

    if (profile && profile.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
      // customer_email should not be set if customer is set
    } else {
      sessionParams.customer_email = user.email;
      // customer should not be set if customer_email is set
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}