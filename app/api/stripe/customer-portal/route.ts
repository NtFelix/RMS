export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Using existing project's Supabase server client

// Initialize Stripe with the secret key and specific API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export async function POST(request: Request) { // Changed req to request to match usage below for nextUrl
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Stripe secret key not configured. Cannot create customer portal session.' }, { status: 500 });
  }

  const supabase = createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error during customer portal session creation:', authError);
      return NextResponse.json({ error: 'Unauthorized: Could not authenticate user.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`Error fetching profile for user ${user.id} during portal session creation:`, profileError.message);
      return NextResponse.json({ error: 'Could not retrieve user profile to find Stripe customer ID.' }, { status: 500 });
    }
    if (!profile || !profile.stripe_customer_id) {
      console.warn(`Stripe customer ID not found in profile for user ${user.id}. Cannot open portal.`);
      return NextResponse.json({ error: 'Stripe customer ID not found for this user.' }, { status: 404 });
    }

    const stripeCustomerId = profile.stripe_customer_id;

    // Construct the return URL using NEXT_PUBLIC_APP_URL or fallback to request's origin, then append /landing
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const returnUrl = `${appBaseUrl}/landing`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!portalSession || !portalSession.url) {
        console.error('Failed to create Stripe billing portal session or URL missing. Session:', portalSession);
        return NextResponse.json({ error: 'Could not create customer portal session due to Stripe error or missing URL.' }, { status: 500 });
    }

    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (error) {
    console.error('Generic error in Stripe Customer Portal API:', error);
    let errorMessage = 'An internal server error occurred.';
    let statusCode = 500;

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe error: ${error.message}`;
      statusCode = error.statusCode || 500;
      console.error(`Stripe error details: Type=${error.type}, Code=${error.code}, Message=${error.message}`);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: `Failed to create Customer Portal session: ${errorMessage}` }, { status: statusCode });
  }
}
