export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';

// Define interfaces for expanded Stripe objects
interface ExpandedStripeInvoice extends Stripe.Invoice {
  subscription: Stripe.Subscription | string | null;
  payment_intent: Stripe.PaymentIntent | string | null;
}

interface ExpandedStripeLineItem extends Stripe.InvoiceLineItem {
  price: Stripe.Price | null;
}

export async function GET(request: Request) {
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

    // Get URL parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const startingAfter = url.searchParams.get('starting_after');

    // Fetch invoices from Stripe
    const invoicesParams: Stripe.InvoiceListParams = {
      customer: profile.stripe_customer_id,
      limit: Math.min(limit, 100), // Cap at 100
      expand: ['data.payment_intent', 'data.subscription', 'data.lines.data.price'],
    };

    if (startingAfter) {
      invoicesParams.starting_after = startingAfter;
    }

    const invoices = await stripe.invoices.list(invoicesParams);

    // Transform the data for frontend consumption
    const transformedInvoices = invoices.data.map(invoice => {
      // Handle expanded properties safely with proper typing
      const invoiceWithExpanded = invoice as ExpandedStripeInvoice;
      const subscription = invoiceWithExpanded.subscription;
      const paymentIntent = invoiceWithExpanded.payment_intent;
      
      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        due_date: invoice.due_date,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        description: invoice.description,
        subscription_id: typeof subscription === 'object' && subscription ? subscription.id : subscription,
        payment_intent_id: typeof paymentIntent === 'object' && paymentIntent ? paymentIntent.id : paymentIntent,
        lines: invoice.lines.data.map(line => {
          const lineWithExpanded = line as ExpandedStripeLineItem;
          const price = lineWithExpanded.price;
          
          return {
            id: line.id,
            description: line.description,
            amount: line.amount,
            quantity: line.quantity,
            price: price ? {
              id: price.id,
              nickname: price.nickname,
              unit_amount: price.unit_amount,
              recurring: price.recurring,
            } : null,
          };
        }),
      };
    });

    return NextResponse.json({
      invoices: transformedInvoices,
      has_more: invoices.has_more,
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : 'Failed to fetch invoices';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}