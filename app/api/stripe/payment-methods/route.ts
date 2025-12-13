export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { STRIPE_CONFIG } from '@/lib/constants/stripe';

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

  try {
    const supabase = await createSupabaseServerClient();
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
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : 'Failed to fetch payment methods';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}