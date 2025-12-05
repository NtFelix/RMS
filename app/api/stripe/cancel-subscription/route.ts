export const runtime = 'edge';
import { NextResponse } from 'next/server';
import StripeNode from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logApiRoute } from '@/lib/logging-middleware';

export async function POST(req: Request) {
  logApiRoute('/api/stripe/cancel-subscription', 'POST', 'request', {});

  if (!process.env.STRIPE_SECRET_KEY) {
    logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
      error_message: 'Stripe secret key not configured'
    });
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }
  const stripe = new StripeNode(process.env.STRIPE_SECRET_KEY!);
  const supabase = createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: 'Unauthorized: Could not get user'
      });
      return NextResponse.json({ error: 'Unauthorized: Could not get user.' }, { status: 401 });
    }

    let parsedBody;
    try {
      parsedBody = await req.json();
    } catch (e) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: 'Invalid JSON body',
        user_id: user.id
      });
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { stripeSubscriptionId } = parsedBody;

    if (!stripeSubscriptionId) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: 'Stripe Subscription ID is required',
        user_id: user.id
      });
      return NextResponse.json({ error: 'Stripe Subscription ID (stripeSubscriptionId) is required' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: 'Could not retrieve user profile',
        user_id: user.id
      });
      return NextResponse.json({ error: 'Could not retrieve user profile to verify subscription.' }, { status: 500 });
    }

    let currentSubscription: StripeNode.Subscription;
    try {
      currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
    } catch (stripeError) {
      const error = stripeError as StripeNode.errors.StripeError;
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: error.message,
        user_id: user.id,
        subscription_id: stripeSubscriptionId
      });
      return NextResponse.json({ error: `Stripe API error: ${error.message}` }, { status: 500 });
    }

    if (currentSubscription.customer !== profile.stripe_customer_id) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
        error_message: 'Subscription not associated with this user',
        user_id: user.id,
        subscription_id: stripeSubscriptionId
      });
      return NextResponse.json({ error: 'Subscription not associated with this user.' }, { status: 403 });
    }

    // Cancel the subscription at the end of the current period
    const canceledSubscription: StripeNode.Subscription = await stripe.subscriptions.update(stripeSubscriptionId as string, {
      cancel_at_period_end: true,
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_subscription_status: canceledSubscription.status,
        stripe_cancel_at_period_end: canceledSubscription.cancel_at_period_end,
      })
      .eq('id', user.id);

    if (updateError) {
      logApiRoute('/api/stripe/cancel-subscription', 'POST', 'response', {
        user_id: user.id,
        subscription_id: stripeSubscriptionId,
        action: 'subscription_cancelled_partial',
        error_message: 'Profile update failed after cancellation'
      });
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
      }, { status: 207 });
    }

    logApiRoute('/api/stripe/cancel-subscription', 'POST', 'response', {
      user_id: user.id,
      subscription_id: stripeSubscriptionId,
      subscription_status: canceledSubscription.status,
      cancel_at_period_end: canceledSubscription.cancel_at_period_end,
      action: 'subscription_cancelled'
    });

    return NextResponse.json({
      message: 'Subscription successfully scheduled for cancellation at the end of the current period.',
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: ('current_period_end' in canceledSubscription && typeof canceledSubscription.current_period_end === 'number')
          ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
          : undefined,
      }
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    logApiRoute('/api/stripe/cancel-subscription', 'POST', 'error', {
      error_message: errorMessage
    });
    if (error instanceof StripeNode.errors.StripeError) {
      return NextResponse.json({ error: `Stripe error: ${errorMessage}` }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to cancel subscription: ${errorMessage}` }, { status: 500 });
  }
}

