import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import { BASE_URL } from '@/lib/constants';

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

  try {
    const supabase = await createSupabaseServerClient();
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

    // Get return URL from request body or use default
    const body = await request.json().catch(() => ({}));
    const trustedBase =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : BASE_URL);
    const trustedOrigin = new URL(trustedBase).origin;
    let returnUrl = `${trustedOrigin}/dashboard`;
    if (typeof body?.return_url === 'string') {
      try {
        const parsed = new URL(body.return_url, trustedOrigin);
        if (
          (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          parsed.origin === trustedOrigin &&
          !parsed.username &&
          !parsed.password
        ) {
          returnUrl = parsed.toString();
        }
      } catch {
        // keep default returnUrl
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating Stripe portal session for user %s', user.id);
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({
      url: portalSession.url,
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}