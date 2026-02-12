export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { logApiRoute } from '@/lib/logging-middleware';

import { isTestEnv, isStripeMocked } from '@/lib/test-utils';

export async function POST(req: Request) {
  if (isStripeMocked()) {
    if (isTestEnv()) {
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      return NextResponse.json({
        sessionId: 'cs_mock_123',
        url: `${origin}/checkout/success?session_id=cs_mock_123`
      });
    }
    return new NextResponse(JSON.stringify({ error: 'Stripe secret key not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);

  logApiRoute('/api/stripe/checkout-session', 'POST', 'request', {});

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      logApiRoute('/api/stripe/checkout-session', 'POST', 'error', {
        error_message: 'Unauthorized or email missing'
      });
      return new NextResponse(JSON.stringify({ error: 'Unauthorized or email missing' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { priceId: requestedPriceId } = await req.json();

    if (!requestedPriceId) {
      logApiRoute('/api/stripe/checkout-session', 'POST', 'error', {
        error_message: 'Price ID is required',
        user_id: user.id
      });
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

    if (profileError && profileError.code !== 'PGRST116') {
      logApiRoute('/api/stripe/checkout-session', 'POST', 'error', {
        error_message: 'Failed to fetch user profile',
        user_id: user.id
      });
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch user profile.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for active subscription to the *same* plan
    if (profile && profile.stripe_subscription_id &&
      (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing') &&
      profile.stripe_price_id === requestedPriceId) {

      logApiRoute('/api/stripe/checkout-session', 'POST', 'response', {
        user_id: user.id,
        price_id: requestedPriceId,
        action: 'already_subscribed'
      });

      let formattedDate = 'N/A';
      if (profile.stripe_current_period_end) {
        try {
          const date = new Date(profile.stripe_current_period_end);
          formattedDate = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (dateError) {
          formattedDate = typeof profile.stripe_current_period_end === 'string' ? profile.stripe_current_period_end : 'Invalid Date';
        }
      }
      return new NextResponse(JSON.stringify({
        error: "Already subscribed to this plan",
        message: `Du bist bereits für diesen Plan angemeldet. Dein aktuelles Abonnement endet am ${formattedDate}.`,
        subscriptionEndDate: formattedDate,
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve the price details to check if it's a free plan
    const price = await stripe.prices.retrieve(requestedPriceId);
    const isFreePlan = price.unit_amount === 0;

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
        userId: user.id,
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`,
    };

    // Determine trial eligibility based on subscription history
    const isEligibleForTrial = () => {
      // Free plans do not need a trial
      if (isFreePlan) return false;

      // A user is eligible for a trial only if they have no subscription history.
      // The presence of a `stripe_price_id` indicates a past or present subscription.
      return !(profile && profile.stripe_price_id);
    };

    if (isEligibleForTrial()) {
      sessionParams.subscription_data = { trial_period_days: 14 };
    } else {
      console.log("Not applying a trial period. User has a subscription history or plan is free.");
    }

    if (profile && profile.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logApiRoute('/api/stripe/checkout-session', 'POST', 'response', {
      user_id: user.id,
      price_id: requestedPriceId,
      session_id: session.id,
      has_trial: isEligibleForTrial(),
      action: 'checkout_session_created'
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    logApiRoute('/api/stripe/checkout-session', 'POST', 'error', {
      error_message: errorMessage
    });
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}