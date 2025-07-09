export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe'; // Import Stripe directly
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();

  // Ensure STRIPE_SECRET_KEY is defined, as it was in the original file
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Create Stripe instance

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized: Could not get user.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for user:', user.id, profileError?.message);
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
        console.error('Request origin could not be determined for return URL.');
        return NextResponse.json({ error: 'Could not determine request origin.' }, { status: 500 });
    }
    const returnUrl = `${requestOrigin}/landing#pricing`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (error) {
    console.error('Error creating Stripe Customer Portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    if (error instanceof Stripe.errors.StripeError) { // Use direct StripeError type
        return NextResponse.json({ error: `Stripe error: ${errorMessage}` }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to create Customer Portal session: ${errorMessage}` }, { status: 500 });
  }
}
