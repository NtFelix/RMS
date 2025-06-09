import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Import Supabase client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
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
    const { priceId } = await req.json();

    if (!priceId) {
      return new NextResponse(JSON.stringify({ error: 'Price ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the user's profile to get stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for Stripe customer ID:', profileError);
      // Decide if this is a critical error. For now, proceed without existing customer ID.
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId, // Use the priceId from the request
          quantity: 1,
        },
      ],
      customer_email: user.email, // Use authenticated user's email
      customer: profile?.stripe_customer_id || undefined, // Use existing Stripe customer if available
      metadata: {
        userId: user.id, // Store Supabase user ID in metadata
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`, // Redirect to new success page
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`, // Redirect to new cancel page
    });

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
