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

    const isTrialActive = isUserInActiveTrial(userProfile.trial_starts_at, userProfile.trial_ends_at);
    let currentApartmentLimit: number | null | typeof Infinity = null;
    let limitSourceIsTrial = false;

    // 1. Check for active Stripe subscription first
    if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);

        if (planDetails === null) {
          // This case implies a configuration issue or Stripe API problem for an active subscription.
          // It's critical, so perhaps a more specific error or logging is needed.
          return { error: 'Details zu Ihrem aktiven Abonnementplan konnten nicht abgerufen werden. Bitte kontaktieren Sie den Support.' };
        }

        // Determine limit from plan details
        if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          // null or 0 or negative means unlimited
          currentApartmentLimit = Infinity;
        } else {
          // Invalid configuration for limitWohnungen (e.g., not a number, not null)
          console.error('Invalid limitWohnungen configuration in Stripe plan:', planDetails.limitWohnungen);
          return { error: 'Ungültige Konfiguration für das Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.' };
        }
      } catch (planError) {
        console.error("Error fetching plan details for active subscription:", planError);
        return { error: 'Fehler beim Abrufen der Plandetails für Ihr Abonnement. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.' };
      }
    }
    // 2. Else, if no active subscription, check for active trial
    else if (isTrialActive) {
      currentApartmentLimit = 5;
      limitSourceIsTrial = true;
    }
    // 3. Else, no active subscription and no active trial
    else {
      return { error: 'Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen.' };
    }

    // At this point, currentApartmentLimit should be set (either a number, Infinity, or an error would have been returned).
    // If currentApartmentLimit is null here, it's an unexpected state.
    if (currentApartmentLimit === null) {
        console.error("Unexpected state: currentApartmentLimit is null after subscription/trial checks.");
        return { error: 'Ein interner Fehler ist aufgetreten bei der Überprüfung Ihres Limits. Bitte kontaktieren Sie den Support.' };
    }

    // Check current apartment count against the determined limit
    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting apartments:', countError);
      return { error: 'Fehler beim Zählen Ihrer aktuellen Wohnungen.' };
    }

    if (currentApartmentLimit !== Infinity) { // Only check if the limit is not Infinity
      if (count !== null && count >= currentApartmentLimit) {
        if (limitSourceIsTrial) {
          return { error: `Maximale Anzahl an Wohnungen (5) für Ihre Testphase erreicht.` };
        } else {
          return { error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr aktuelles Abonnement erreicht.` };
        }
      }
    }

    // Proceed to insert the apartment if limit is not reached
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
