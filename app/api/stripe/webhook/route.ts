export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { logApiRoute } from '@/lib/logging-middleware';

// Module-level constants that are safe to initialize here
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
// Note: supabaseAdmin and stripe client initializations are moved into the POST handler.

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Define helper functions within POST to access supabaseAdmin
  async function updateProfileInSupabase(userId: string, dataToUpdate: Partial<Profile>) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(dataToUpdate)
      .eq('id', userId);

    if (error) {
      console.error(`Supabase error updating profile for user ${userId}:`, error.message);
      throw error;
    }
    return data;
  }

  async function updateProfileByCustomerIdInSupabase(customerId: string, dataToUpdate: Partial<Profile>) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(dataToUpdate)
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error(`Supabase error updating profile for customer ${customerId}:`, error.message);
      throw error;
    }
    return data;
  }

  try {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    if (!webhookSecret) {
      logApiRoute('/api/stripe/webhook', 'POST', 'error', {
        error_message: 'STRIPE_WEBHOOK_SECRET is not set'
      });
      return new NextResponse('Webhook secret is not configured', { status: 500 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logApiRoute('/api/stripe/webhook', 'POST', 'error', {
        error_message: 'Supabase admin client not configured'
      });
      return new NextResponse('Supabase admin client not configured', { status: 500 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logApiRoute('/api/stripe/webhook', 'POST', 'error', {
        error_message: errorMessage,
        error_type: 'signature_verification_failed'
      });
      return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    logApiRoute('/api/stripe/webhook', 'POST', 'request', {
      event_type: event.type,
      event_id: event.id
    });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'checkout.session.completed',
            session_id: session.id,
            error_message: 'User ID not found in session metadata'
          });
          break;
        }
        if (!customerId || !subscriptionId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'checkout.session.completed',
            session_id: session.id,
            error_message: 'Customer ID or Subscription ID not found'
          });
          break;
        }

        const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!retrievedSubscription) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'checkout.session.completed',
            subscription_id: subscriptionId,
            error_message: 'Could not retrieve subscription details'
          });
          break;
        }

        const profileUpdateData: Partial<Profile> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: retrievedSubscription.id,
          stripe_subscription_status: retrievedSubscription.status,
          stripe_price_id: retrievedSubscription.items.data[0]?.price.id,
          stripe_current_period_end: new Date((retrievedSubscription as any).current_period_end * 1000).toISOString(),
        };

        await updateProfileInSupabase(userId, profileUpdateData);

        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: 'checkout.session.completed',
          user_id: userId,
          customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_status: retrievedSubscription.status,
          price_id: retrievedSubscription.items.data[0]?.price.id,
          action: 'subscription_created'
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string;

        if (!customerId || !subscriptionId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'invoice.paid',
            invoice_id: invoice.id,
            error_message: 'Customer ID or Subscription ID not found'
          });
          break;
        }

        const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!retrievedSubscription) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'invoice.paid',
            subscription_id: subscriptionId,
            error_message: 'Could not retrieve subscription details'
          });
          break;
        }

        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: retrievedSubscription.status,
          stripe_price_id: retrievedSubscription.items.data[0]?.price.id,
          stripe_current_period_end: new Date((retrievedSubscription as any).current_period_end * 1000).toISOString(),
        });

        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: 'invoice.paid',
          customer_id: customerId,
          invoice_id: invoice.id,
          amount_paid: invoice.amount_paid,
          action: 'invoice_paid'
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'invoice.payment_failed',
            invoice_id: invoice.id,
            error_message: 'Customer ID not found'
          });
          break;
        }

        const subscriptionId = (invoice as any).subscription as string;
        let status = 'past_due';
        if (subscriptionId) {
          try {
            const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
            status = retrievedSubscription.status;
          } catch (subError) {
            console.error(`Could not retrieve subscription ${subscriptionId} for failed invoice ${invoice.id}:`, subError);
          }
        }

        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: status,
        });

        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: 'invoice.payment_failed',
          customer_id: customerId,
          invoice_id: invoice.id,
          subscription_status: status,
          action: 'payment_failed'
        });
        break;
      }
      case 'customer.subscription.updated': {
        const subscriptionFromEvent = event.data.object as Stripe.Subscription;
        const customerId = subscriptionFromEvent.customer as string;
        if (!customerId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'customer.subscription.updated',
            subscription_id: subscriptionFromEvent.id,
            error_message: 'Customer ID not found'
          });
          break;
        }

        const profileUpdateData: Partial<Profile> = {
          stripe_subscription_id: subscriptionFromEvent.id,
          stripe_subscription_status: subscriptionFromEvent.status,
          stripe_price_id: subscriptionFromEvent.items.data[0]?.price.id,
          stripe_current_period_end: new Date((subscriptionFromEvent as any).current_period_end * 1000).toISOString(),
        };

        await updateProfileByCustomerIdInSupabase(customerId, profileUpdateData);

        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: 'customer.subscription.updated',
          customer_id: customerId,
          subscription_id: subscriptionFromEvent.id,
          subscription_status: subscriptionFromEvent.status,
          price_id: subscriptionFromEvent.items.data[0]?.price.id,
          action: 'subscription_updated'
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscriptionFromEvent = event.data.object as Stripe.Subscription;
        const customerId = subscriptionFromEvent.customer as string;
        if (!customerId) {
          logApiRoute('/api/stripe/webhook', 'POST', 'error', {
            event_type: 'customer.subscription.deleted',
            subscription_id: subscriptionFromEvent.id,
            error_message: 'Customer ID not found'
          });
          break;
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: subscriptionFromEvent.status,
        });

        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: 'customer.subscription.deleted',
          customer_id: customerId,
          subscription_id: subscriptionFromEvent.id,
          subscription_status: subscriptionFromEvent.status,
          action: 'subscription_cancelled'
        });
        break;
      }
      default:
        logApiRoute('/api/stripe/webhook', 'POST', 'response', {
          event_type: event.type,
          event_id: event.id,
          action: 'unhandled_event'
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApiRoute('/api/stripe/webhook', 'POST', 'error', {
      error_message: errorMessage,
      error_type: 'webhook_handler_error'
    });
    return new NextResponse(`Internal Server Error in webhook: ${errorMessage}`, { status: 500 });
  }
}