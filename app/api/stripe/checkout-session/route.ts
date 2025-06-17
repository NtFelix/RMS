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
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: requestedPriceId, // Use the requestedPriceId from the request
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id, // Store Supabase user ID in metadata
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`,
    };

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
