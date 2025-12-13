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

    // Fetch customer details from Stripe
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id, {
      expand: ['invoice_settings.default_payment_method']
    });

    if (!customer || customer.deleted) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Extract billing address information
    const billingAddress = customer.address;
    const paymentMethod = customer.invoice_settings?.default_payment_method;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: billingAddress ? {
          line1: billingAddress.line1,
          line2: billingAddress.line2,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postal_code,
          country: billingAddress.country,
        } : null,
      },
      payment_method: paymentMethod && typeof paymentMethod === 'object' ? {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
        billing_details: paymentMethod.billing_details ? {
          address: paymentMethod.billing_details.address ? {
            line1: paymentMethod.billing_details.address.line1,
            line2: paymentMethod.billing_details.address.line2,
            city: paymentMethod.billing_details.address.city,
            state: paymentMethod.billing_details.address.state,
            postal_code: paymentMethod.billing_details.address.postal_code,
            country: paymentMethod.billing_details.address.country,
          } : null,
        } : null,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching customer data:', error);
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? error.message
      : 'Failed to fetch customer data';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
