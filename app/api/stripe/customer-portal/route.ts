export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Adjusted path if necessary

export async function POST(req: Request) {
  // Ensure STRIPE_SECRET_KEY is defined
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized: Could not get user.' }, { status: 401 });
    }

    // Fetch the user's profile to get their actual stripe_customer_id for security.
    // This prevents a user from attempting to access another customer's portal
    // by providing an arbitrary stripe_customer_id in the request body.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for user:', user.id, profileError.message);
      return NextResponse.json({ error: 'Could not retrieve user profile.' }, { status: 500 });
    }
    if (!profile || !profile.stripe_customer_id) {
      console.warn('Stripe customer ID not found in profile for user:', user.id);
      return NextResponse.json({ error: 'Stripe customer ID not found for this user. Cannot open portal.' }, { status: 404 });
    }

    const stripeCustomerId = profile.stripe_customer_id;

    // Determine the base URL from the request origin
    const requestOrigin = req.headers.get('origin');
    if (!requestOrigin) {
        console.error('Request origin could not be determined.');
        return NextResponse.json({ error: 'Could not determine request origin for return URL.' }, { status: 500 });
    }

    // Define the return URL. This should be where users land after leaving the portal.
    // Example: redirect to a general dashboard page or a specific subscription management page.
    // The path `/(dashboard)/home` is a placeholder and might need adjustment based on your app's routes.
    const returnUrl = `${requestOrigin}/(dashboard)/home`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (error) {
    console.error('Error creating Stripe Customer Portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    // Handle Stripe-specific errors more gracefully if needed
    if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({ error: `Stripe error: ${errorMessage}` }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to create Customer Portal session: ${errorMessage}` }, { status: 500 });
  }
}
