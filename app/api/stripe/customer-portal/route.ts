export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile to find customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get return URL from request body or use default
    const body = await request.json();
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = body.return_url || `${origin}/dashboard`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating Stripe portal session with return_url:', returnUrl);
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : 'Failed to create customer portal session';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}