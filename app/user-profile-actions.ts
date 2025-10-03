'use server';

import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import { countries as localCountries } from '@/lib/countries-states';
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

export async function getBillingAddress(stripeCustomerId: string): Promise<Stripe.Customer | { error: string; details?: any }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe secret key is not configured' };
  }
  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) {
      return { error: 'Customer not found or deleted' };
    }
    return customer;
  } catch (error: any) {
    console.error(`Error fetching billing address for ${stripeCustomerId}:`, error);
    return { error: 'Failed to fetch billing address', details: error.message };
  }
}

export async function updateBillingAddress(
  stripeCustomerId: string,
  details: {
    address: Stripe.AddressParam;
    name: string;
    companyName?: string;
  }
): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe secret key is not configured' };
  }
  if (!stripeCustomerId) {
    return { success: false, error: 'Stripe customer ID is required' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customerUpdateParams: Stripe.CustomerUpdateParams = {
      name: details.companyName || details.name,
      address: details.address,
    };

    await stripe.customers.update(stripeCustomerId, customerUpdateParams);
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating billing address for ${stripeCustomerId}:`, error);
    return { success: false, error: 'Failed to update billing address', details: error.message };
  }
}

export async function getCountryData(): Promise<{ name: string; code2: string; states: any[] }[] | { error: string; details?: any }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe secret key is not configured' };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const countrySpecs = await stripe.countrySpecs.list({ limit: 100 });
    const supportedCountryCodes = countrySpecs.data.map(spec => spec.id);

    const filteredCountries = localCountries.filter(country => supportedCountryCodes.includes(country.code2));

    return filteredCountries.map(country => ({
      name: country.name,
      code2: country.code2,
      states: country.states,
    }));
  } catch (error: any) {
    console.error('Error fetching country data:', error);
    return { error: 'Failed to fetch country data', details: error.message };
  }
}