import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Moved inside POST

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: NO_CACHE_HEADERS,
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);
  try {
    const body = await req.json().catch(() => null);
    const sessionId = body && typeof body === 'object' ? (body as { sessionId?: unknown }).sessionId : undefined;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid Session ID format' }, {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'], // Expand if you need more details, e.g., customer details
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const sessionUserId = session.metadata?.userId;
    const expandedCustomerEmail =
      typeof session.customer === 'object' && session.customer && !session.customer.deleted
        ? session.customer.email
        : null;
    const sessionEmail = session.customer_details?.email || session.customer_email || expandedCustomerEmail;
    const isOwner =
      sessionUserId === user.id ||
      (!sessionUserId && Boolean(sessionEmail && user.email && sessionEmail.toLowerCase() === user.email.toLowerCase()));
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    // Successfully retrieved the session
    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      // You can add more details here if needed, for example:
      // line_items: session.line_items,
      // subscription: session.subscription (if it's a subscription session)
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    if (error instanceof Stripe.errors.StripeError) {
      if (error.statusCode === 404 || error.code === 'resource_missing') {
        return NextResponse.json({ error: 'Session not found' }, {
          status: 404,
          headers: NO_CACHE_HEADERS,
        });
      }
      const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
      return NextResponse.json({ error: 'Failed to verify Stripe session' }, {
        status,
        headers: NO_CACHE_HEADERS,
      });
    }
    return NextResponse.json({ error: 'Failed to verify Stripe session' }, {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
