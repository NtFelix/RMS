import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env.local
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateProfileInSupabase(userId: string, dataToUpdate: any) {
  console.log(`Updating profile for user ${userId} with data:`, dataToUpdate);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(dataToUpdate)
    .eq('id', userId);

  if (error) {
    console.error(`Supabase error updating profile for user ${userId}:`, error.message);
    throw error;
  }
  console.log(`Profile update successful for user ${userId}.`);
  return data;
}

async function updateProfileByCustomerIdInSupabase(customerId: string, dataToUpdate: any) {
  console.log(`Updating profile for customer ${customerId} with data:`, dataToUpdate);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(dataToUpdate)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error(`Supabase error updating profile for customer ${customerId}:`, error.message);
    throw error;
  }
  console.log(`Profile update successful for customer ${customerId}.`);
  return data;
}


export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    if (!webhookSecret) {
     console.error('STRIPE_WEBHOOK_SECRET is not set.');
     return new NextResponse('Webhook secret is not configured', { status: 500 });
    }
     if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase URL or Service Role Key is not set for Admin client.');
      return new NextResponse('Supabase admin client not configured', { status: 500 });
    }


    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`⚠️  Webhook signature verification failed: ${errorMessage}`);
      return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    console.log(`Received Stripe event: ${event.type}`, event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('User ID not found in session metadata for session:', session.id);
          break; // Acknowledge event but don't process further if critical info is missing
        }
        if (!customerId || !subscriptionId) {
            console.error('Customer ID or Subscription ID not found in session:', session.id);
            break;
        }

        const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Retrieved Subscription Object (checkout.session.completed):', JSON.stringify(retrievedSubscription, null, 2));
        if (!retrievedSubscription) {
            console.error('Could not retrieve subscription details for sub ID:', subscriptionId);
            break;
        }

        await updateProfileInSupabase(userId, {
          stripe_customer_id: customerId,
          stripe_subscription_id: retrievedSubscription.id, // Use ID from retrieved object
          stripe_subscription_status: retrievedSubscription.status,
          stripe_price_id: retrievedSubscription.items.data[0]?.price.id,
          stripe_current_period_end: new Date((retrievedSubscription as any).current_period_end * 1000).toISOString(),
        });
        console.log(`Profile updated for user ${userId} after checkout.`);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id);
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (!customerId || !subscriptionId) {
            console.error('Customer ID or Subscription ID not found in invoice:', invoice.id);
            break;
        }

        const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Retrieved Subscription Object (invoice.paid):', JSON.stringify(retrievedSubscription, null, 2));
        if (!retrievedSubscription) {
            console.error('Could not retrieve subscription details for sub ID (invoice.paid):', subscriptionId);
            break;
        }

        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: retrievedSubscription.status,
          stripe_price_id: retrievedSubscription.items.data[0]?.price.id,
          stripe_current_period_end: new Date((retrievedSubscription as any).current_period_end * 1000).toISOString(),
        });
        console.log(`Profile updated for customer ${customerId} after invoice payment.`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);
        const customerId = invoice.customer as string;
        if (!customerId) {
            console.error('Customer ID not found in invoice (payment_failed):', invoice.id);
            break;
        }

        const subscriptionId = invoice.subscription as string;
        let status = 'past_due'; // Default status
        if (subscriptionId) {
            try {
                const retrievedSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
                status = retrievedSubscription.status; // e.g., 'past_due', 'unpaid', 'canceled'
            } catch (subError) {
                console.error(`Could not retrieve subscription ${subscriptionId} for failed invoice ${invoice.id}:`, subError);
                // Stick with 'past_due' or decide on another default if subscription is not retrievable
            }
        }

        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: status,
        });
        console.log(`Profile updated for customer ${customerId} to status '${status}' after invoice payment failure.`);
        break;
      }
      case 'customer.subscription.updated': {
        // The 'subscription' object here is directly from the event data, not from a 'retrieve' call.
        const subscriptionFromEvent = event.data.object as Stripe.Subscription;
        console.log('Subscription Object from Event (customer.subscription.updated):', JSON.stringify(subscriptionFromEvent, null, 2));
        console.log('Subscription updated:', subscriptionFromEvent.id, 'Status:', subscriptionFromEvent.status);
        const customerId = subscriptionFromEvent.customer as string;
        if (!customerId) {
            console.error('Customer ID not found in subscription (updated):', subscriptionFromEvent.id);
            break;
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
            stripe_subscription_id: subscriptionFromEvent.id,
            stripe_subscription_status: subscriptionFromEvent.status,
            stripe_price_id: subscriptionFromEvent.items.data[0]?.price.id,
            stripe_current_period_end: new Date((subscriptionFromEvent as any).current_period_end * 1000).toISOString(),
        });
        console.log(`Profile updated for customer ${customerId} after subscription update.`);
        break;
      }
      case 'customer.subscription.deleted': {
        // The 'subscription' object here is directly from the event data.
        const subscriptionFromEvent = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscriptionFromEvent.id, 'Status:', subscriptionFromEvent.status);
        const customerId = subscriptionFromEvent.customer as string;
         if (!customerId) {
            console.error('Customer ID not found in subscription (deleted):', subscriptionFromEvent.id);
            break;
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: subscriptionFromEvent.status, // Stripe sends 'canceled', or other relevant status.
          // Consider how you want to handle other fields on deletion.
          // stripe_subscription_id: null, // Might be good to nullify if it's truly deleted and not just 'canceled' status.
        });
        console.log(`Profile updated for customer ${customerId} after subscription deletion.`);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type} for event ID ${event.id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`Internal Server Error in webhook: ${errorMessage}`, { status: 500 });
  }
}
