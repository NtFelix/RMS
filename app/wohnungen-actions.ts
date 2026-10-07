"use server";

import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';
import { normalizeApartmentLimit, getEffectiveApartmentLimit } from '@/lib/utils/subscription';
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';

interface WohnungPayload {
  name: string;
  groesse: string | number; // Can come as string from FormData
  miete: string | number;   // Can come as string from FormData
  haus_id?: string | null;
}

interface WohnungDbRecord {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
  created_at: string;
}

interface ApartmentEligibility {
  isEligible: boolean;
  apartmentLimit: number | typeof Infinity;
}

async function determineApartmentEligibility(userProfile: any): Promise<ApartmentEligibility> {
  const isStripeTrial = userProfile.stripe_subscription_status === 'trialing';
  const isPaidActiveSub = userProfile.stripe_subscription_status === 'active' && !!userProfile.stripe_price_id;

  // Default values for non-eligible users
  const defaultIneligible = { isEligible: false, apartmentLimit: 0 };

  // Handle trial users
  if (isStripeTrial) {
    const result: ApartmentEligibility = { isEligible: true, apartmentLimit: 5 };

    // If user has both trial and active subscription, check for higher limits
    if (isPaidActiveSub && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails) {
          // Use centralized utility for consistent limit calculation
          result.apartmentLimit = getEffectiveApartmentLimit(planDetails.limit_wohnungen, true);
        }
      } catch (error) {
        console.error('Error fetching plan details for active sub during trial:', error);
      }
    }
    return result;
  }

  // Handle paid active subscribers
  if (isPaidActiveSub && userProfile.stripe_price_id) {
    try {
      const planDetails = await getPlanDetails(userProfile.stripe_price_id);
      if (!planDetails) return defaultIneligible;

      const normalizedLimit = normalizeApartmentLimit(planDetails.limit_wohnungen);
      // All paid subscribers are eligible; 0/negative/null limits = unlimited
      return {
        isEligible: true,
        apartmentLimit: normalizedLimit === null ? 0 : normalizedLimit
      };
    } catch (error) {
      console.error('Error fetching plan details:', error);
    }
  }

  // Default case for non-eligible users
  return defaultIneligible;
}

export async function wohnungServerAction(id: string | null, data: WohnungPayload): Promise<{ success: boolean; error?: { message: string }; data?: WohnungDbRecord }> {
  const actionName = id ? 'updateApartment' : 'createApartment';
  logAction(actionName, 'start', { apartment_id: id, apartment_name: data.name });

  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }

  // Permission & scope checks
  const { hasPermission } = await import("@/lib/permissions");
  const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
  
  if (id) {
    if (!(await hasPermission('wohnungen', 'bearbeiten'))) {
      logAction(actionName, 'error', { apartment_id: id, apartment_name: data.name, error_message: "Keine Berechtigung" });
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    const haeuserIds = await getAccessibleHaeuserIds();
    if (haeuserIds !== null) {
      const targetHausId = data.haus_id;
      if (!targetHausId || !haeuserIds.includes(targetHausId)) {
        return { success: false, error: { message: "Zugriff auf das angegebene Haus verweigert." } };
      }
      
      const { data: existingWohnung, error: fetchError } = await supabase
        .from("Wohnungen")
        .select("haus_id")
        .eq("id", id)
        .single();
      if (fetchError || !existingWohnung || !existingWohnung.haus_id || !haeuserIds.includes(existingWohnung.haus_id)) {
        return { success: false, error: { message: "Zugriff auf diese Wohnung verweigert." } };
      }
    }
  } else {
    if (!(await hasPermission('wohnungen', 'erstellen'))) {
      logAction(actionName, 'error', { apartment_id: id, apartment_name: data.name, error_message: "Keine Berechtigung" });
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    const haeuserIds = await getAccessibleHaeuserIds();
    if (haeuserIds !== null) {
      const targetHausId = data.haus_id;
      if (!targetHausId || !haeuserIds.includes(targetHausId)) {
        return { success: false, error: { message: "Zugriff auf das angegebene Haus verweigert." } };
      }
    }
  }

  const payload = {

    name: data.name,
    groesse: Number(data.groesse), // Ensure conversion to number
    miete: Number(data.miete),     // Ensure conversion to number
    haus_id: data.haus_id || null,
  };

  // Basic validation
  if (!payload.name || payload.name.trim() === "") {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }
  if (isNaN(payload.groesse) || payload.groesse <= 0) {
    return { success: false, error: { message: "Größe muss eine positive Zahl sein." } };
  }
  if (isNaN(payload.miete) || payload.miete < 0) { // Miete can be 0
    return { success: false, error: { message: "Miete muss eine Zahl sein." } };
  }
  // haus_id is optional for a Wohnung, so we don't strictly require it here.
  // However, the form/modal might enforce it.
  // if (!payload.haus_id) { 
  //   return { success: false, error: { message: "Haus-ID ist erforderlich." } };
  // }

  try {

    // Only check limits when creating a new apartment
    if (!id) {
      // Get user profile for subscription details
      const userProfile = await fetchUserProfile();
      if (!userProfile) {
        return {
          success: false,
          error: { message: "Benutzerprofil nicht gefunden." }
        };
      }

      // Determine user's eligibility and apartment limit based on their subscription status
      const { isEligible, apartmentLimit } = await determineApartmentEligibility(userProfile);
      const userIsEligibleToAdd = isEligible;
      const effectiveApartmentLimit = apartmentLimit;

      if (!userIsEligibleToAdd) {
        return {
          success: false,
          error: { message: "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen." }
        };
      }

      // Get current apartment count for the user
      const { count, error: countError } = await supabase
        .from('Wohnungen')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Check if user has reached their limit
      if (effectiveApartmentLimit !== Infinity && count !== null && count >= effectiveApartmentLimit) {
        if (userProfile.stripe_subscription_status === 'trialing' && effectiveApartmentLimit === 5) {
          return {
            success: false,
            error: { message: `Maximale Anzahl an Wohnungen (${effectiveApartmentLimit}) für Ihre Testphase erreicht.` }
          };
        } else {
          return {
            success: false,
            error: { message: `Sie haben die maximale Anzahl an Wohnungen (${effectiveApartmentLimit}) für Ihr aktuelles Abonnement erreicht.` }
          };
        }
      }
    }

    let dbResponse;
    if (id) {
      // Update existing record
      dbResponse = await supabase
        .from("Wohnungen")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Create new record
      dbResponse = await supabase
        .from("Wohnungen")
        .insert(payload)
        .select()
        .single();
    }

    if (dbResponse.error) throw dbResponse.error;

    revalidatePath('/wohnungen');
    revalidatePath('/');
    if (payload.haus_id) {
      revalidatePath(`/haeuser/${payload.haus_id}`);
    }

    logAction(actionName, 'success', {
      apartment_id: dbResponse.data.id,
      apartment_name: data.name,
      operation: id ? 'update' : 'create'
    });

    try {
      const posthog = getPostHogServer();
      const eventName = id ? 'property_updated' : 'property_created';

      await posthog.capture({
        distinctId: user.id || 'unknown',
        event: eventName,
        properties: {
          property_id: dbResponse.data.id,
          name: data.name,
          size: payload.groesse,
          rent: payload.miete,
          has_house: !!data.haus_id,
          source: 'server_action'
        }
      });
      await Promise.all([
        posthog.flush(),
        posthogLogger.flush()
      ]);
      logger.info(`[PostHog] Capturing event: ${eventName} for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true, data: dbResponse.data as WohnungDbRecord };
  } catch (error: any) {
    const errorMessage = error?.message || "Ein unbekannter Fehler ist aufgetreten.";
    logAction(actionName, 'error', {
      apartment_id: id,
      error_message: errorMessage
    });
    console.error("Error in wohnungServerAction:", error);
    return { success: false, error: { message: errorMessage } };
  }
}
