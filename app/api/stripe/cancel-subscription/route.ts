export const runtime = 'edge';

import { NextResponse } from 'next/server';
import StripeNode from 'stripe'; // Renamed import to StripeNode
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Adjusted path if necessary

export async function POST(req: Request) {
  // Ensure STRIPE_SECRET_KEY is defined
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }
  const stripe = new StripeNode(process.env.STRIPE_SECRET_KEY!); // Use StripeNode for instantiation
  const supabase = createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized: Could not get user.' }, { status: 401 });
    }

    // Correctly get stripeSubscriptionId from the request body
    let parsedBody;
    try {
        parsedBody = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { stripeSubscriptionId } = parsedBody;

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: 'Stripe Subscription ID (stripeSubscriptionId) is required' }, { status: 400 });
    }

    // Optional: Retrieve profile to verify ownership via stripe_customer_id
    // This adds a layer of security. Assumes 'stripe_customer_id' is stored on your profiles table.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
        console.error('Error fetching profile for user:', user.id, profileError);
        return NextResponse.json({ error: 'Could not retrieve user profile to verify subscription.' }, { status: 500 });
    }

    // Fetch the subscription to check its current status and customer ID
    let currentSubscription: StripeNode.Subscription; // Explicitly type here as well
    try {
        currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
    } catch (stripeError) {
        const error = stripeError as StripeNode.errors.StripeError; // Use StripeNode here
        console.error('Stripe subscription retrieve error:', error.message);
        return NextResponse.json({ error: `Stripe API error: ${error.message}` }, { status: 500 });
    }

    if (currentSubscription.customer !== profile.stripe_customer_id) {
      return NextResponse.json({ error: 'Subscription not associated with this user.' }, { status: 403 });
    }

    // Cancel the subscription at the end of the current period
    const canceledSubscription: StripeNode.Subscription = await stripe.subscriptions.update(stripeSubscriptionId as string, { // Use StripeNode here
      cancel_at_period_end: true,
    });

    // Update Supabase profile
    // The status will remain 'active' but `cancel_at_period_end` will be true.
    // The actual 'canceled' status comes via webhook when the period ends.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_subscription_status: canceledSubscription.status, // Should still be 'active'
        stripe_cancel_at_period_end: canceledSubscription.cancel_at_period_end, // Will be true
        // stripe_current_period_end does not change here
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Supabase profile update error after cancellation:', updateError.message);
      // Even if Supabase update fails, Stripe cancellation was successful.
      // Log the error and consider alerting admin. For the client, this is still a partial success.
      // Depending on business logic, you might choose to return a different status or message.
      // For now, we proceed to inform the user about Stripe's success.
      return NextResponse.json({
        message: 'Subscription scheduled for cancellation with Stripe, but profile update failed. Please contact support.',
        subscription: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancel_at_period_end: canceledSubscription.cancel_at_period_end,
          current_period_end: ('current_period_end' in canceledSubscription && typeof canceledSubscription.current_period_end === 'number')
                                ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
                                : undefined,
        }
      }, { status: 207 }); // 207 Multi-Status might be appropriate
    }

    return NextResponse.json({
      message: 'Subscription successfully scheduled for cancellation at the end of the current period.',
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: ('current_period_end' in canceledSubscription && typeof canceledSubscription.current_period_end === 'number')
                                ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
                                : undefined, // Convert Unix timestamp
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Generic error in cancel-subscription endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    // Avoid exposing raw Stripe errors directly if they are not Stripe.errors.StripeError instances handled above
    if (error instanceof StripeNode.errors.StripeError) { // Use StripeNode here
        return NextResponse.json({ error: `Stripe error: ${errorMessage}` }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to cancel subscription: ${errorMessage}` }, { status: 500 });
  }
}
