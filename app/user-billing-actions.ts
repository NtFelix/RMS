'use server';
import { createClient } from "@/utils/supabase/server";
import { ensureAuth } from "@/lib/auth-utils";

import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { isTestEnv, isStripeMocked } from '@/lib/test-utils';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeClient = new Stripe(key, STRIPE_CONFIG);
  }
  return stripeClient;
}

type BillingAddressError = {
  error: string;
  details?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export interface BillingAddress {
  name?: string;
  companyName?: string;
  address: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string | null;
    postal_code?: string;
    country?: string;
  };
  email?: string;
  phone?: string | null;
}

interface UpdateBillingAddressParams {
  name: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country: string;
  };
  companyName?: string;
}

export async function getBillingAddress(
  stripeCustomerId: string,
): Promise<BillingAddress | BillingAddressError> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { error: errorMessage };
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.stripe_customer_id !== stripeCustomerId) {
    return { error: "Nicht autorisiert" };
  }

  if (isStripeMocked()) {
    if (isTestEnv()) {
      return {
        name: 'Max Mustermann',
        companyName: 'Muster GmbH',
        address: {
          line1: 'Musterstraße 1',
          line2: null,
          city: 'Musterstadt',
          state: null,
          postal_code: '12345',
          country: 'DE',
        },
        email: 'test@example.com',
        phone: '+49 123 456789',
      };
    }
    return { error: 'Stripe secret key is not configured' };
  }

  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if ('deleted' in customer) {
      return { error: 'Customer not found' };
    }

    // Now customer is narrowed to Stripe.Customer
    const activeCustomer = customer as Stripe.Customer;
    const legacyCustomer = activeCustomer as Stripe.Customer & { business_name?: string };
    const companyName = activeCustomer.metadata?.company_name || legacyCustomer.business_name || '';

    if (!activeCustomer.address) {
      return {
        name: activeCustomer.name || '',
        companyName,
        address: {
          line1: '',
          line2: null,
          city: '',
          state: null,
          postal_code: '',
          country: 'DE',
        },
        email: activeCustomer.email || '',
        phone: activeCustomer.phone || null,
      };
    }

    return {
      name: activeCustomer.name || '',
      companyName,
      address: {
        line1: activeCustomer.address.line1 || '',
        line2: activeCustomer.address.line2 || null,
        city: activeCustomer.address.city || '',
        state: activeCustomer.address.state || null,
        postal_code: activeCustomer.address.postal_code || '',
        country: activeCustomer.address.country || 'DE',
      },
      email: activeCustomer.email || '',
      phone: activeCustomer.phone || null,
    };
  } catch (error: unknown) {
    console.error('Error in getBillingAddress:', error);
    return {
      error: 'Failed to fetch billing address',
      details: getErrorMessage(error, 'Unknown error'),
    };
  }
}

export async function updateBillingAddress(
  stripeCustomerId: string,
  details: UpdateBillingAddressParams,
): Promise<{ success: boolean; error?: string }> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, error: errorMessage };
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.stripe_customer_id !== stripeCustomerId) {
    return { success: false, error: "Nicht autorisiert" };
  }

  if (isStripeMocked()) {
    if (isTestEnv()) {
      return { success: true };
    }
    return { success: false, error: 'Stripe secret key is not configured' };
  }

  if (!stripeCustomerId) {
    return { success: false, error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = getStripe();

    const updateData: Stripe.CustomerUpdateParams = {
      name: details.name,
      ...(details.companyName !== undefined
        ? {
            metadata: {
              company_name: details.companyName !== '' ? details.companyName : null,
            },
          }
        : {}),
      address: {
        line1: details.address.line1,
        ...(details.address.line2 && { line2: details.address.line2 }),
        city: details.address.city,
        ...(details.address.state && { state: details.address.state }),
        postal_code: details.address.postal_code,
        country: details.address.country,
      },
    };

    await stripe.customers.update(stripeCustomerId, updateData);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating billing address:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to update billing address'),
    };
  }
}

export async function createSetupIntent(
  stripeCustomerId: string,
): Promise<{ clientSecret: string } | { error: string }> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { error: errorMessage };
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.stripe_customer_id !== stripeCustomerId) {
    return { error: "Nicht autorisiert" };
  }

  if (isStripeMocked()) {
    if (isTestEnv()) {
      return { clientSecret: 'seti_mock_secret_123' };
    }
    return { error: 'Stripe secret key is not configured' };
  }

  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'on_session' as const,
    });

    if (!setupIntent.client_secret) {
      throw new Error('Failed to create SetupIntent: client_secret is null');
    }

    return { clientSecret: setupIntent.client_secret };
  } catch (error: unknown) {
    console.error('Error creating SetupIntent for %s:', stripeCustomerId, error);
    return {
      error: getErrorMessage(error, 'Failed to create SetupIntent'),
    };
  }
}
