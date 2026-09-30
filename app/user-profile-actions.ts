'use server';

import { ensureAuth } from '@/lib/auth-utils';
import { getPlanDetails } from '@/lib/stripe-server';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import {
  createSetupIntent as createSetupIntentAction,
  getBillingAddress as getBillingAddressAction,
  updateBillingAddress as updateBillingAddressAction,
  type BillingAddress,
  type BillingAddressError,
  type UpdateBillingAddressParams,
} from './user-billing-actions';

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
    limit_wohnungen: number | null;
    storageLimit?: number | null; // Storage limit in bytes, 0 = no storage included, null = unlimited
  } | null | undefined;
  hasActiveSubscription: boolean;
  currentWohnungenCount: number;
  // Pre-computed storage statistics of the organisation (Organisation.speicher_bytes / dokumente_anzahl),
  // only set when requested with `includeStorage` and loaded successfully
  storageUsedBytes?: number;
  documentCount?: number;
  // Explicitly add fields expected by SettingsModal and other parts of the system
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Supabase typically stores timestampz as ISO strings
  stripe_cancel_at_period_end?: boolean | null;
}

export async function getUserProfileForSettings(
  { includeStorage = false }: { includeStorage?: boolean } = {}
): Promise<UserProfileForSettings | { error: string; details?: any }> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { error: 'Not authenticated', details: errorMessage };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<SupabaseProfile>();

    if (profileError || !profile) {
      console.error('Profile error in getUserProfileForSettings:', profileError);
      return { error: 'Profile not found', details: profileError?.message };
    }

    const loadPlanDetails = async () => {
      if (!profile.stripe_price_id ||
        !(profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
        return null;
      }
      try {
        return await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error in getUserProfileForSettings:', stripeError);
        // Not returning error here, just means plan details couldn't be fetched
        // The client can decide how to handle missing planDetails
        return null;
      }
    };

    // The three lookups are independent of each other. The storage statistics are the
    // pre-computed Organisation.speicher_bytes / dokumente_anzahl and only loaded on request.
    const [currentWohnungenCount, storageResult, planDetails] = await Promise.all([
      getCurrentWohnungenCount(supabase, user.id),
      includeStorage ? supabase.rpc('get_organisation_storage_stats') : Promise.resolve(null),
      loadPlanDetails(),
    ]);

    // Stays undefined when the statistics were not requested or could not be loaded,
    // so the UI does not present a failed lookup as "0 B".
    let storageUsedBytes: number | undefined;
    let documentCount: number | undefined;
    if (storageResult?.error) {
      console.error('Storage stats error in getUserProfileForSettings:', storageResult.error);
    } else if (storageResult) {
      const row = storageResult.data?.[0];
      storageUsedBytes = Number(row?.speicher_bytes ?? 0);
      documentCount = Number(row?.dokumente_anzahl ?? 0);
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
      storageUsedBytes,
      documentCount,
    };

    return responseData;

  } catch (error: unknown) {
    console.error('Generic server error in getUserProfileForSettings:', error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return { error: 'Internal server error', details: message };
  }
}

export async function getBillingAddress(
  stripeCustomerId: string
): Promise<BillingAddress | BillingAddressError> {
  return getBillingAddressAction(stripeCustomerId);
}

export async function updateBillingAddress(
  stripeCustomerId: string,
  details: UpdateBillingAddressParams,
): Promise<{ success: boolean; error?: string }> {
  return updateBillingAddressAction(stripeCustomerId, details);
}

export async function createSetupIntent(
  stripeCustomerId: string
): Promise<{ clientSecret: string } | { error: string }> {
  return createSetupIntentAction(stripeCustomerId);
}
