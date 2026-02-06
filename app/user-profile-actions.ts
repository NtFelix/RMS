'use server';

import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import Stripe from 'stripe';

// Define the expected return type for clarity, similar to UserProfileWithSubscription
// This helps ensure consistency with what the client-side components expect.
export interface UserProfileForSettings extends SupabaseProfile {
  email?: string; // Email from auth.user
  profileEmail?: string; // Email from profiles table
  activePlan?: {
    priceId: string; // Added
    name: string; // Kept, ensure it's string not string? if always present
    productName?: string;
    description?: string | null;
    price: number | null;
    currency: string;
    interval?: string | null;
    interval_count?: number | null;
    features: string[];
    limitWohnungen: number | null;
  } | null | undefined;
  hasActiveSubscription: boolean;
  currentWohnungenCount: number;
  // Explicitly add fields expected by SettingsModal and other parts of the system
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Supabase typically stores timestampz as ISO strings
  stripe_cancel_at_period_end?: boolean | null;
}

export async function getUserProfileForSettings(): Promise<UserProfileForSettings | { error: string; details?: any }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in getUserProfileForSettings:', authError);
      return { error: 'Not authenticated', details: authError?.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<SupabaseProfile>();

    if (profileError || !profile) {
      console.error('Profile error in getUserProfileForSettings:', profileError);
      return { error: 'Profile not found', details: profileError?.message };
    }

    // Use the new utility function to get the count of Wohnungen
    const currentWohnungenCount = await getCurrentWohnungenCount(supabase, user.id);

    let planDetails = null;
    if (profile.stripe_price_id &&
      (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      try {
        planDetails = await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error in getUserProfileForSettings:', stripeError);
        // Not returning error here, just means plan details couldn't be fetched
        // The client can decide how to handle missing planDetails
      }
    }

    const hasActiveSubscription = !!planDetails &&
      (profile.stripe_subscription_status === 'active' ||
        profile.stripe_subscription_status === 'trialing');

    // Construct the response, ensuring it matches UserProfileForSettings
    const responseData: UserProfileForSettings = {
      ...profile,
      email: user.email,
      stripe_customer_id: profile.stripe_customer_id,
      activePlan: planDetails,
      hasActiveSubscription,
      currentWohnungenCount,
    };

    return responseData;

  } catch (error: any) {
    console.error('Generic server error in getUserProfileForSettings:', error);
    return { error: 'Internal server error', details: error.message };
  }
}

interface BillingAddress {
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

import { isTestEnv, isStripeMocked } from '@/lib/test-utils';

export async function getBillingAddress(stripeCustomerId: string): Promise<BillingAddress | { error: string; details?: any }> {
  if (isStripeMocked()) {
    if (isTestEnv() || isStripeMocked()) {
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
        phone: '+49 123 456789'
      };
    }
    return { error: 'Stripe secret key is not configured' };
  }
  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);

    // First get the customer without expanding metadata
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if ('deleted' in customer && customer.deleted) {
      return { error: 'Customer not found' };
    }

    // Get the business name from the customer object
    const customerWithBusinessName = customer as Stripe.Customer & { business_name?: string };
    const companyName = customerWithBusinessName.business_name || '';

    // If customer has no address, return empty values
    if (!customer.address) {
      return {
        name: customer.name || '',
        companyName,
        address: {
          line1: '',
          line2: null,
          city: '',
          state: null,
          postal_code: '',
          country: 'DE',
        },
        email: customer.email || '',
        phone: customer.phone || null
      };
    }

    return {
      name: customer.name || '',
      companyName,
      address: {
        line1: customer.address.line1 || '',
        line2: customer.address.line2 || null,
        city: customer.address.city || '',
        state: customer.address.state || null,
        postal_code: customer.address.postal_code || '',
        country: customer.address.country || 'DE',
      },
      email: customer.email || '',
      phone: customer.phone || null
    };
  } catch (error: any) {
    console.error('Error in getBillingAddress:', error);
    return {
      error: 'Failed to fetch billing address',
      details: error.message
    };
  }
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

export async function updateBillingAddress(
  stripeCustomerId: string,
  details: UpdateBillingAddressParams
): Promise<{ success: boolean; error?: string }> {
  if (isStripeMocked()) {
    if (isTestEnv() || isStripeMocked()) {
      return { success: true };
    }
    return { success: false, error: 'Stripe secret key is not configured' };
  }
  if (!stripeCustomerId) {
    return { success: false, error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);

    const updateData: Stripe.CustomerUpdateParams = {
      name: details.name,
      // Set the business_name field if companyName is provided
      ...(details.companyName && { business_name: details.companyName }),
      address: {
        line1: details.address.line1,
        ...(details.address.line2 && { line2: details.address.line2 }),
        city: details.address.city,
        ...(details.address.state && { state: details.address.state }),
        postal_code: details.address.postal_code,
        country: details.address.country
      }
    };

    // Update the customer with the new billing details
    await stripe.customers.update(stripeCustomerId, updateData);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating billing address:', error);
    return {
      success: false,
      error: error.message || 'Failed to update billing address'
    };
  }
}

export async function createSetupIntent(stripeCustomerId: string): Promise<{ clientSecret: string } | { error: string }> {
  if (isStripeMocked()) {
    if (isTestEnv() || isStripeMocked()) {
      return { clientSecret: 'seti_mock_secret_123' };
    }
    return { error: 'Stripe secret key is not configured' };
  }
  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'on_session' as const,
    });

    if (!setupIntent.client_secret) {
      throw new Error('Failed to create SetupIntent: client_secret is null');
    }

    return { clientSecret: setupIntent.client_secret };
  } catch (error: any) {
    console.error(`Error creating SetupIntent for ${stripeCustomerId}:`, error);
    return {
      error: error.message || 'Failed to create SetupIntent'
    };
  }
}