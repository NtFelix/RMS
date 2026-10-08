"use server";

import { fetchUserProfile, getCurrentWohnungenCount } from "@/lib/data-fetching";
import { getPlanDetails } from "@/lib/stripe-server";
import { ensureAuth } from "@/lib/auth-utils";
import { normalizeApartmentLimit } from "@/lib/utils/subscription";

export async function getUserSubscriptionContext(): Promise<{
  stripe_price_id: string | null;
  stripe_subscription_status: string | null;
  error?: string;
}> {
  try {
    await ensureAuth();
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { stripe_price_id: null, stripe_subscription_status: null, error: errorMessage };
  }

  try {
    const userProfile = await fetchUserProfile();
    if (!userProfile) {
      return {
        stripe_price_id: null,
        stripe_subscription_status: null,
        error: "User profile not found.",
      };
    }
    return {
      stripe_price_id: userProfile.stripe_price_id ?? null,
      stripe_subscription_status: userProfile.stripe_subscription_status ?? null,
    };
  } catch (error) {
    console.error("Error in getUserSubscriptionContext:", error);
    return {
      stripe_price_id: null,
      stripe_subscription_status: null,
      error: "Failed to fetch user subscription context.",
    };
  }
}

export async function getPlanApartmentLimit(
  priceId: string
): Promise<{ limit_wohnungen: number | null | typeof Infinity; error?: string }> {
  try {
    await ensureAuth();
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { limit_wohnungen: null, error: errorMessage };
  }

  try {
    const planDetails = await getPlanDetails(priceId);
    if (!planDetails) {
      return { limit_wohnungen: null, error: "Plan details not found." };
    }

    // Use centralized normalization: null, 0, or negative = unlimited
    const limit_wohnungen = normalizeApartmentLimit(planDetails.limit_wohnungen);

    return { limit_wohnungen };
  } catch (error) {
    console.error("Error in getPlanApartmentLimit:", error);
    return {
      limit_wohnungen: null,
      error: "Failed to fetch plan apartment limit.",
    };
  }
}

export async function getUserApartmentCount(): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const { user, supabase } = await ensureAuth();
    const count = await getCurrentWohnungenCount(supabase, user.id);
    return { count };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
    return { count: 0, error: errorMessage };
  }
}
