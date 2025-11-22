export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Moved inside POST

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid Session ID format' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'], // Expand if you need more details, e.g., customer details
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Successfully retrieved the session
    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      // You can add more details here if needed, for example:
      // line_items: session.line_items,
      // subscription: session.subscription (if it's a subscription session)
    });

  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    if (error instanceof Stripe.errors.StripeError) {
      // Handle Stripe-specific errors
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    } else if (error instanceof Error) {
      // Handle generic errors
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
