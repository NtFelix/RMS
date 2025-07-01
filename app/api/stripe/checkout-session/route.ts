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

    // Fetch the user's profile to get Stripe details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end, stripe_price_id') // Added stripe_price_id
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for Stripe details:', profileError);
      // Not necessarily a critical error if the user is new and doesn't have a profile yet.
      // However, if a profile exists but couldn't be fetched, it might indicate a problem.
    }

    console.log('User profile fetched:', profile);

    // Check for active subscription
    if (profile && profile.stripe_subscription_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      console.log('User has an active subscription:', profile.stripe_subscription_id, 'status:', profile.stripe_subscription_status, 'current plan price ID:', profile.stripe_price_id);

      // User has an active subscription, check if they are trying to subscribe to the SAME plan
      if (profile.stripe_price_id === requestedPriceId) {
        console.log(`User is already subscribed to the requested plan: ${requestedPriceId}.`);
        let formattedDate = 'N/A';
        if (profile.stripe_current_period_end) {
          try {
            const date = new Date(profile.stripe_current_period_end);
            // Adjust formatting as needed for user display
            formattedDate = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
          } catch (dateError) {
            console.error('Error formatting stripe_current_period_end:', dateError);
            // Fallback to raw date string if formatting fails
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
      // If requestedPriceId is DIFFERENT, it's an upgrade/downgrade. Proceed to create checkout session.
      console.log(`User has an active subscription (${profile.stripe_price_id}) but is changing to a different plan (${requestedPriceId}). Proceeding to checkout.`);
    } else {
      console.log('No active subscription found, or profile data incomplete for active check. Proceeding to create Stripe Checkout session.');
    }

    // Prepare parameters for Stripe session creation
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_collection: 'if_required', // Changed from payment_method_types
      mode: 'subscription',
      line_items: [
        {
          price: requestedPriceId, // Use the requestedPriceId from the request
          quantity: 1,
        },
      ],
      // Add trial period for new subscriptions
      // We only add trial if the user does not have an active subscription already
      // or if they are changing to a different plan (which Stripe handles as a new subscription period).
      // The condition `!profile || !profile.stripe_subscription_id || (profile.stripe_subscription_status !== 'active' && profile.stripe_subscription_status !== 'trialing')`
      // determines if it's a truly new subscription vs an update.
      // However, Stripe's `trial_period_days` on a checkout session applies to the *new* subscription being created.
      // If a user has an existing subscription and is changing plans, Stripe might prorate,
      // but the `trial_period_days` would apply to the new plan as if it's starting fresh.
      // For simplicity and to ensure new sign-ups get a trial, we'll add it here.
      // If specific plans should NOT have a trial, this logic would need to be more granular,
      // possibly checking metadata on the `requestedPriceId` product/price object from Stripe.
      subscription_data: {
        trial_period_days: 14,
      },
      metadata: {
        userId: user.id, // Store Supabase user ID in metadata
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`,
    };

    // If the user already has an active subscription and is changing to a *different* plan,
    // Stripe handles this as an update. Trials are typically for brand new customers to a service
    // or new subscriptions. If they are just changing plans, a trial might not be standard.
    // However, the `subscription_data.trial_period_days` will apply if it's a new subscription.
    // If it's an upgrade/downgrade of an *existing* subscription, Stripe's behavior for trials
    // in that context (e.g. `stripe.subscriptions.update`) is different and might not apply a new trial
    // from checkout session params.
    // For now, we are adding `trial_period_days: 14` to all new subscription checkouts.
    // If a user has `profile.stripe_subscription_id` and is changing plans,
    // the `trial_period_days` might still initiate a trial for the new plan.
    // This behavior should be tested with Stripe.

    // Let's refine: Only add trial if it's genuinely a new subscription,
    // not if they are already subscribed and changing plans.
    // A simple check: if they don't have an active or trialing subscription, it's new.
    if (!profile || !profile.stripe_subscription_id || (profile.stripe_subscription_status !== 'active' && profile.stripe_subscription_status !== 'trialing')) {
      console.log("Applying 14-day trial for new subscription.");
      sessionParams.subscription_data = { trial_period_days: 14 };
    } else if (profile && profile.stripe_subscription_id && profile.stripe_price_id !== requestedPriceId) {
      // They have an active/trialing subscription BUT are changing to a different plan.
      // Let's also offer a trial for the new plan in this scenario, as it's a "new" commitment.
      console.log("Applying 14-day trial for plan change.");
      sessionParams.subscription_data = { trial_period_days: 14 };
    } else {
      // User is already on this plan or some other scenario where trial is not applied by this logic.
      // No explicit trial_period_days, Stripe default behavior applies.
      console.log("Not applying a trial period (already subscribed or other condition).");
    }


    if (profile && profile.stripe_customer_id) {
      console.log('Using existing Stripe customer ID:', profile.stripe_customer_id);
      sessionParams.customer = profile.stripe_customer_id;
      // customer_email should not be set if customer is set
    } else {
      console.log('Using user email for new Stripe customer:', user.email);
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
