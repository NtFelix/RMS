"use server";

// const APARTMENT_LIMIT = 5; // Removed hardcoded limit
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching'; // Assuming this fetches { id, email, stripe_price_id, stripe_subscription_status, ... }
import { getPlanDetails } from '@/lib/stripe-server'; // Import getPlanDetails
import { logAction } from '@/lib/logging-middleware';


type WohnungFormData = {
  name: string;
  groesse: string;
  miete: string;
  haus_id: string;
};

// Interface for the Wohnung data that will be inserted into the database
interface WohnungData {
  name: string | null;
  miete: number;
  haus_id: string | null;
  user_id: string;
  groesse?: number;
}

/**
 * Server Action zum Speichern einer neuen Wohnung
 */
export async function speichereWohnung(formData: WohnungFormData) {
  const actionName = 'createApartment';
  logAction(actionName, 'start', { apartment_name: formData.name });

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
      console.error('speichereWohnung: User profile not found');
      return { error: 'Benutzerprofil nicht gefunden.' };
    }

    const isEffectivelyInTrial = userProfile.stripe_subscription_status === 'trialing';
    const isPaidActiveStripeSub = userProfile.stripe_subscription_status === 'active' && !!userProfile.stripe_price_id;

    let currentApartmentLimit: number | null | typeof Infinity = null;
    let limitReasonIsTrial = false;

    if (isEffectivelyInTrial) {
      currentApartmentLimit = 5;
      limitReasonIsTrial = true;

      if (isPaidActiveStripeSub && userProfile.stripe_price_id) { // Ensure stripe_price_id is non-null
        try {
          const planDetails = await getPlanDetails(userProfile.stripe_price_id);
          if (planDetails) {
            if (planDetails.limitWohnungen === null) {
              currentApartmentLimit = Infinity;
              limitReasonIsTrial = false;
            } else if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
              if (planDetails.limitWohnungen > currentApartmentLimit) {
                currentApartmentLimit = planDetails.limitWohnungen;
                limitReasonIsTrial = false;
              }
            }
          } else {
            console.warn(`Konnte Plandetails für aktive Subscription (${userProfile.stripe_price_id}) während Testphase nicht laden. Testphasenlimit (${currentApartmentLimit}) wird verwendet.`);
          }
        } catch (planError) {
          console.error("Error fetching plan details for active sub during trial:", planError);
          console.warn(`Fehler beim Laden der Plandetails für aktive Subscription (${userProfile.stripe_price_id}) während Testphase. Testphasenlimit (${currentApartmentLimit}) wird verwendet.`);
        }
      }
    } else if (isPaidActiveStripeSub && userProfile.stripe_price_id) { // Ensure stripe_price_id is non-null
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails === null) {
          return { error: 'Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bitte überprüfen Sie Ihr Abonnement oder kontaktieren Sie den Support.' };
        }

        // Updated logic to treat 0 or negative as Infinity (unlimited)
        if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          currentApartmentLimit = Infinity;
        } else if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else {
          console.error('Invalid limitWohnungen configuration:', planDetails.limitWohnungen);
          return { error: 'Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.' };
        }
        limitReasonIsTrial = false; // If it's a paid active sub, limit reason is not trial
      } catch (planError) {
        console.error("Error fetching plan details for limit enforcement:", planError);
        return { error: 'Fehler beim Abrufen der Plandetails für Ihr Abonnement. Bitte versuchen Sie es später erneut.' };
      }
    } else {
      return { error: 'Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen.' };
    }

    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting apartments:', countError);
      return { error: 'Fehler beim Zählen der Wohnungen.' };
    }

    if (currentApartmentLimit === null) {
      console.error("Apartment limit logic resulted in null limit unexpectedly.");
      return { error: 'Fehler bei der Bestimmung Ihres Wohnungslimits. Bitte kontaktieren Sie den Support.' };
    }

    if (currentApartmentLimit !== Infinity) {
      if (count !== null && count >= currentApartmentLimit) {
        if (limitReasonIsTrial) {
          // If the effective limit is 5 and the reason is trial.
          // This also correctly handles the case where a paid plan might have a limit <=5,
          // but the trial limit of 5 was the operative one.
          return { error: `Maximale Anzahl an Wohnungen (5) für Ihre Testphase erreicht.` };
        } else {
          return { error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` };
        }
      }
    }

    const wohnungData: WohnungData = {
      name: formData.name || null,
      miete: parseFloat(formData.miete),
      haus_id: formData.haus_id || null,
      user_id: userId
    };

    // Only add groesse if it's provided and a valid number
    const groesse = parseFloat(formData.groesse);
    if (!isNaN(groesse) && groesse > 0) {
      wohnungData.groesse = groesse;
    }

    const { error } = await supabase.from('Wohnungen').insert(wohnungData);

    if (error) {
      return { error: error.message };
    }

    // Cache für die Wohnungen-Seite invalidieren
    revalidatePath('/wohnungen');
    logAction(actionName, 'success', { apartment_name: formData.name });
    return { success: true };
  } catch (error) {
    logAction(actionName, 'error', { apartment_name: formData.name, error_message: (error as Error).message });
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}

/**
 * Server Action zum Aktualisieren einer Wohnung
 */
export async function aktualisiereWohnung(id: string, formData: WohnungFormData) {
  const actionName = 'updateApartment';
  logAction(actionName, 'start', { apartment_id: id, apartment_name: formData.name });

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
    logAction(actionName, 'success', { apartment_id: id, apartment_name: formData.name });
    return { success: true };
  } catch (error) {
    logAction(actionName, 'error', { apartment_id: id, error_message: (error as Error).message });
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}

/**
 * Server Action zum Löschen einer Wohnung
 */
export async function loescheWohnung(id: string) {
  const actionName = 'deleteApartment';
  logAction(actionName, 'start', { apartment_id: id });

  try {
    const supabase = await createClient();

    const { error } = await supabase.from('Wohnungen')
      .delete()
      .eq('id', id);

    if (error) {
      logAction(actionName, 'error', { apartment_id: id, error_message: error.message });
      return { error: error.message };
    }

    // Cache für die Wohnungen-Seite invalidieren
    revalidatePath('/wohnungen');
    logAction(actionName, 'success', { apartment_id: id });
    return { success: true };
  } catch (error) {
    logAction(actionName, 'error', { apartment_id: id, error_message: (error as Error).message });
    return { error: 'Ein Fehler ist aufgetreten' };
  }
}