// supabase/functions/stripe-webhook/index.ts

// Import Stripe and Supabase client libraries
// It's good practice to use specific versions for stability
import Stripe from 'https://esm.sh/stripe@14.20.0?target=denonext';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// --- Environment Variables ---
// These MUST be set in your Supabase Edge Function's "Secrets" settings in the dashboard
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSigningSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- Validate Environment Variables ---
if (!stripeSecretKey) {
  console.error('Missing STRIPE_SECRET_KEY environment variable.');
}
if (!webhookSigningSecret) {
  console.error('Missing STRIPE_WEBHOOK_SIGNING_SECRET environment variable.');
}
if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL environment variable.');
}
if (!supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
}

// --- Initialize Stripe Client ---
const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
  typescript: true,
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

console.log('Stripe Webhook Handler (Supabase Edge Function) loaded. Version: 1.0.0'); // Added version for clarity

// --- Initialize Supabase Admin Client ---
let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
  console.error("Supabase client could not be initialized in Edge Function: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

// --- Database Helper Functions ---
async function updateProfileInSupabase(userId: string, dataToUpdate: any) {
  if (!supabaseAdmin) {
    console.error("Supabase admin client not initialized. Cannot update profile for user:", userId);
    throw new Error("Supabase admin client not initialized.");
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(dataToUpdate)
    .eq('id', userId);

  if (error) {
    console.error(`Supabase error updating profile for user ${userId}:`, error.message, error.details);
    throw error;
  }
  return data;
}

async function updateProfileByCustomerIdInSupabase(customerId: string, dataToUpdate: any) {
  if (!supabaseAdmin) {
    console.error("Supabase admin client not initialized. Cannot update profile for customer:", customerId);
    throw new Error("Supabase admin client not initialized.");
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(dataToUpdate)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error(`Supabase error updating profile for customer ${customerId}:`, error.message, error.details);
    throw error;
  }
  return data;
}

// --- Main Deno Serve Function ---
Deno.serve(async (request: Request) => {
  console.log(`Stripe webhook request received at: ${new Date().toISOString()}`);
  if (!webhookSigningSecret) {
    console.error('STRIPE_WEBHOOK_SIGNING_SECRET is not available at runtime.');
    return new Response('Webhook secret not configured in Edge Function environment', { status: 500 });
  }
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available at runtime.');
    return new Response('Supabase client not configured in Edge Function environment', { status: 500 });
  }

  const signature = request.headers.get('Stripe-Signature');
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSigningSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  console.log(`✅ Event received: ${event.type}, ID: ${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed for session ID:', session.id);
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('User ID not found in session metadata for session:', session.id);
          return new Response('User ID missing in metadata', { status: 200 });
        }
        if (!customerId || !subscriptionId) {
          console.error('Customer ID or Subscription ID not found in session:', session.id);
          return new Response('Customer or Subscription ID missing', { status: 200 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!subscription) {
          console.error('Could not retrieve subscription details from Stripe for sub ID:', subscriptionId);
          return new Response('Subscription not retrievable', { status: 200 });
        }

        const profileUpdateData: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: subscription.status,
          stripe_price_id: subscription.items.data[0]?.price.id,
          stripe_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : (subscription.items?.data?.[0] as any)?.current_period_end
              ? new Date((subscription.items.data[0] as any).current_period_end * 1000).toISOString()
              : null,
        };

        // Trial period is now handled by Stripe subscription status only
        console.log(`Subscription ${subscription.id} trial status handled by Stripe subscription status.`);

        await updateProfileInSupabase(userId, profileUpdateData);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing invoice.paid for invoice ID:', invoice.id);
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (!customerId || !subscriptionId) {
          console.error('Customer ID or Subscription ID not found in invoice.paid event:', invoice.id);
          return new Response('Customer or Subscription ID missing', { status: 200 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!subscription) {
          console.error('Could not retrieve subscription (invoice.paid) for sub ID:', subscriptionId);
          return new Response('Subscription not retrievable', { status: 200 });
        }

        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: subscription.status,
          stripe_price_id: subscription.items.data[0]?.price.id,
          stripe_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : (subscription.items?.data?.[0] as any)?.current_period_end
              ? new Date((subscription.items.data[0] as any).current_period_end * 1000).toISOString()
              : null,
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing invoice.payment_failed for invoice ID:', invoice.id);
        const customerId = invoice.customer as string;
        if (!customerId) {
          console.error('Customer ID not found in invoice.payment_failed event:', invoice.id);
          return new Response('Customer ID missing', { status: 200 });
        }

        const subscriptionId = invoice.subscription as string;
        let status = 'past_due';
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            status = subscription.status;
          } catch (subError) {
            console.error(`Could not retrieve subscription ${subscriptionId} for failed invoice ${invoice.id}:`, subError.message);
          }
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: status,
        });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing customer.subscription.updated for subscription ID:', subscription.id);
        const customerId = subscription.customer as string;
        if (!customerId) {
          console.error('Customer ID not found in customer.subscription.updated event:', subscription.id);
          return new Response('Customer ID missing', { status: 200 });
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: subscription.status,
          stripe_price_id: subscription.items.data[0]?.price.id,
          stripe_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : (subscription.items?.data?.[0] as any)?.current_period_end
              ? new Date((subscription.items.data[0] as any).current_period_end * 1000).toISOString()
              : null,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing customer.subscription.deleted for subscription ID:', subscription.id);
        const customerId = subscription.customer as string;
        if (!customerId) {
          console.error('Customer ID not found in customer.subscription.deleted event:', subscription.id);
          return new Response('Customer ID missing', { status: 200 });
        }
        await updateProfileByCustomerIdInSupabase(customerId, {
          stripe_subscription_status: subscription.status, // should be 'canceled' or similar
        });
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing event:', event.id, error.message, error.stack);
    return new Response(`Internal Server Error processing event: ${error.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});