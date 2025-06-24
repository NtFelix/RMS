"use server";

// const APARTMENT_LIMIT = 5; // Removed hardcoded limit
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching'; // Assuming this fetches { id, email, stripe_price_id, stripe_subscription_status, ... }
import { getPlanDetails } from '@/lib/stripe-server'; // Import getPlanDetails
import { isUserInActiveTrial } from '@/lib/utils';

// Typdefinition für die Wohnungsdaten
type WohnungFormData = {
  name: string;
  groesse: string;
  miete: string;
  haus_id: string;
};

/**
 * Server Action zum Speichern einer neuen Wohnung
 */
export async function speichereWohnung(formData: WohnungFormData) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return { error: 'Benutzer nicht authentifiziert.' };
    }
    const userId = user.id;

    // Fetch user profile - assuming it contains stripe_price_id and stripe_subscription_status
    // If not, this part needs to fetch from 'profiles' table directly using userId
    const userProfile = await fetchUserProfile();

    if (!userProfile) {
        return { error: 'Benutzerprofil nicht gefunden.' };
    }

    // ---- START DEBUG LOGGING ----
    console.log('[DEBUG] speichereWohnung: User Profile Data:', {
      stripe_status: userProfile.stripe_subscription_status,
      stripe_price_id: userProfile.stripe_price_id,
      trial_starts: userProfile.trial_starts_at,
      trial_ends: userProfile.trial_ends_at,
    });
    // ---- END DEBUG LOGGING ----

    let currentApartmentLimit: number | null | typeof Infinity = null;
    let limitSource: 'trial' | 'subscription' | null = null;

    // 1. Check for an active paid Stripe subscription
    if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      // ---- START DEBUG LOGGING ----
      console.log('[DEBUG] speichereWohnung: Checking for active Stripe subscription.');
      // ---- END DEBUG LOGGING ----
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails === null) {
          console.log('[DEBUG] speichereWohnung: Plan details not found.');
          return { error: 'Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bitte überprüfen Sie Ihr Abonnement oder kontaktieren Sie den Support.' };
        }
        // ---- START DEBUG LOGGING ----
        console.log('[DEBUG] speichereWohnung: Plan details:', planDetails);
        // ---- END DEBUG LOGGING ----

        if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          currentApartmentLimit = Infinity;
        } else {
          console.error('Invalid limitWohnungen configuration in plan:', planDetails.limitWohnungen);
          return { error: 'Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.' };
        }
        limitSource = 'subscription';
        // ---- START DEBUG LOGGING ----
        console.log(`[DEBUG] speichereWohnung: Limit set from subscription. Limit: ${currentApartmentLimit}`);
        // ---- END DEBUG LOGGING ----
      } catch (planError) {
        console.error("Error fetching plan details for limit enforcement:", planError);
        return { error: 'Fehler beim Abrufen der Plandetails für Ihr Abonnement. Bitte versuchen Sie es später erneut.' };
      }
    } else {
      // ---- START DEBUG LOGGING ----
      console.log('[DEBUG] speichereWohnung: No active Stripe subscription. Checking for trial.');
      // ---- END DEBUG LOGGING ----
      // 2. Else (no active paid subscription), check for active trial
      const isTrialActive = isUserInActiveTrial(userProfile.trial_starts_at, userProfile.trial_ends_at);
      // ---- START DEBUG LOGGING ----
      console.log(`[DEBUG] speichereWohnung: isUserInActiveTrial result: ${isTrialActive}`);
      console.log(`  - Trial Starts At (from profile): ${userProfile.trial_starts_at}`);
      console.log(`  - Trial Ends At (from profile): ${userProfile.trial_ends_at}`);
      // ---- END DEBUG LOGGING ----
      if (isTrialActive) {
        currentApartmentLimit = 5;
        limitSource = 'trial';
        // ---- START DEBUG LOGGING ----
        console.log(`[DEBUG] speichereWohnung: Limit set from trial. Limit: ${currentApartmentLimit}`);
        // ---- END DEBUG LOGGING ----
      }
    }

    // 3. If neither active subscription nor active trial, then error
    if (currentApartmentLimit === null) {
      // ---- START DEBUG LOGGING ----
      console.log('[DEBUG] speichereWohnung: currentApartmentLimit is null. User needs active sub or trial.');
      // ---- END DEBUG LOGGING ----
      return { error: 'Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen.' };
    }

    // Count existing apartments
    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting apartments:', countError);
      return { error: 'Fehler beim Zählen der Wohnungen.' };
    }

    // Check if the limit is reached
    if (currentApartmentLimit !== Infinity) { // Only check if the limit is not unlimited
      if (count !== null && count >= currentApartmentLimit) {
        if (limitSource === 'trial') {
          return { error: `Maximale Anzahl an Wohnungen (5) für Ihre Testphase erreicht.` };
        } else if (limitSource === 'subscription') {
          return { error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` };
        } else {
          // This case should ideally not be reached if currentApartmentLimit is set
          return { error: `Maximale Anzahl an Wohnungen erreicht. Unbekannte Limitquelle.`};
        }
      }
    }

    // Proceed to insert the apartment if limit not reached
    const { error } = await supabase.from('Wohnungen').insert({
      name: formData.name,
      groesse: parseFloat(formData.groesse), // Ensure this is a number
      miete: parseFloat(formData.miete),
      haus_id: formData.haus_id || null,
      user_id: userId
    });
    
    if (error) {
      return { error: error.message };
    }
    
    // Cache für die Wohnungen-Seite invalidieren
    revalidatePath('/wohnungen');
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Speichern der Wohnung:', error);
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}

/**
 * Server Action zum Aktualisieren einer Wohnung
 */
export async function aktualisiereWohnung(id: string, formData: WohnungFormData) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for update:', userError);
      return { error: 'Benutzer nicht authentifiziert.' };
    }
    const userId = user.id;

    const userProfile = await fetchUserProfile(); // Fetches profile for the authenticated user
    if (!userProfile) {
      return { error: 'Benutzerprofil nicht gefunden.' };
    }

    let currentApartmentLimit: number | null | typeof Infinity = null;

    if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails === null) {
          return { error: 'Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bearbeitung nicht möglich.' };
        }

        if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          currentApartmentLimit = Infinity;
        } else {
          console.error('Invalid limitWohnungen configuration for update:', planDetails.limitWohnungen);
          return { error: 'Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bearbeitung nicht möglich.' };
        }
      } catch (planError) {
        console.error("Error fetching plan details for update:", planError);
        return { error: 'Fehler beim Abrufen der Plandetails. Bearbeitung nicht möglich.' };
      }
    } else {
      return { error: 'Ein aktives Abonnement ist für die Bearbeitung erforderlich.' };
    }

    // This check is only relevant if the plan has a defined, finite limit.
    // If currentApartmentLimit is Infinity, this check is skipped.
    // If currentApartmentLimit is null here, it means the user doesn't have an active subscription,
    // which should have been caught by the 'Ein aktives Abonnement...' error above.
    if (currentApartmentLimit !== Infinity && currentApartmentLimit !== null) {
      const { count, error: countError } = await supabase
        .from('Wohnungen')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.error('Error counting apartments for update:', countError);
        return { error: 'Fehler beim Zählen der Wohnungen.' };
      }

      // Note: The problem description said "count > currentApartmentLimit".
      // However, if a user has 5/5 apartments, they should still be able to EDIT one of those 5.
      // They should only be blocked if they are trying to ADD a new one that would exceed the limit.
      // For editing, the count check might be more relevant if an admin action somehow put them over limit,
      // and we want to prevent further edits until resolved.
      // Given the prompt "Sie haben die maximale Anzahl an Wohnungen (...) überschritten", this implies
      // we should check if their *current* state is already over the limit, which is unusual for an edit action.
      // Let's assume the intention is to prevent edits IF the user is ALREADY over their limit
      // (e.g. due to a plan downgrade or admin action).
      // If the user has N apartments and limit is L, they can edit if N <= L.
      // If N > L, they cannot edit.
      // The problem states: "If currentApartmentLimit !== Infinity && count !== null && count > currentApartmentLimit"
      // This means if count is 5 and limit is 5, count > limit is false, so they can edit.
      // If count is 6 and limit is 5, count > limit is true, so they are blocked. This matches the prompt.
      if (count !== null && count > currentApartmentLimit) {
         return { error: `Bearbeitung nicht möglich. Sie haben die maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement überschritten.` };
      }
    }
    
    const { error } = await supabase.from('Wohnungen')
      .update({
        name: formData.name,
        groesse: parseFloat(formData.groesse),
        miete: parseFloat(formData.miete),
        haus_id: formData.haus_id || null
      })
      .eq('id', id);
    
    if (error) {
      return { error: error.message };
    }
    
    // Cache für die Wohnungen-Seite invalidieren
    revalidatePath('/wohnungen');
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Wohnung:', error);
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}

/**
 * Server Action zum Löschen einer Wohnung
 */
export async function loescheWohnung(id: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.from('Wohnungen')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: error.message };
    }
    
    // Cache für die Wohnungen-Seite invalidieren
    revalidatePath('/wohnungen');
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Löschen der Wohnung:', error);
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}
