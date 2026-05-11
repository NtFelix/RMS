export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Get user profile to find customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });

    // Transform the data for frontend consumption
    const transformedPaymentMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        funding: pm.card.funding,
      } : null,
      created: pm.created,
    }));

    return NextResponse.json({
      payment_methods: transformedPaymentMethods,
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : 'Failed to fetch payment methods';
    
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}