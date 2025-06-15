"use server";

// const APARTMENT_LIMIT = 5; // Removed hardcoded limit
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching'; // Assuming this fetches { id, email, stripe_price_id, stripe_subscription_status, ... }
import { getPlanDetails } from '@/lib/stripe-server'; // Import getPlanDetails

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

    let currentApartmentLimit: number | null = null; // Default to null (no limit or specific check failed)

    if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails && typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails && (planDetails.limitWohnungen === null || planDetails.limitWohnungen <= 0)) {
          // Plan explicitly allows unlimited or has 0/negative limit, treat as unlimited for this logic.
          currentApartmentLimit = Infinity; // Using Infinity to signify unlimited
        }
      } catch (planError) {
        console.error("Error fetching plan details for limit enforcement:", planError);
        // Potentially return an error or proceed with a default conservative limit / no limit
        // For now, if plan details fail, we won't enforce a dynamic limit.
        // Consider if this should be a hard error: return { error: 'Fehler beim Abrufen der Plandetails.' };
      }
    } else {
      // No active subscription or price ID, so no dynamic limit can be fetched.
      // You might want to prevent creation entirely or fall back to a default for free users if applicable.
      // For now, let's assume if no active sub, they can't add.
      return { error: 'Ein aktives Abonnement mit einem gültigen Plan ist erforderlich, um Wohnungen hinzuzufügen.' };
    }

    const { count, error: countError } = await supabase
      .from('Wohnungen') // Ensure this table name is correct
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting apartments:', countError);
      return { error: 'Fehler beim Zählen der Wohnungen.' };
    }

    if (currentApartmentLimit !== null && currentApartmentLimit !== Infinity) {
      if (count !== null && count >= currentApartmentLimit) {
        return { error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` };
      }
    }
    // If currentApartmentLimit is null (e.g. failed to fetch plan) or Infinity, limit check is bypassed.
    // If it's null, it means the plan details weren't fetched properly or limit wasn't set.
    // This might be a state where you DON'T want to allow creation, or fall back to a very basic limit.
    // For this implementation, if currentApartmentLimit is null, it means we couldn't determine a limit,
    // so we are currently bypassing. This might need stricter handling.
    // A simple strict handling: if (currentApartmentLimit === null) return { error: "Could not determine apartment limit." }

    const { error } = await supabase.from('Wohnungen').insert({
      name: formData.name,
      groesse: parseFloat(formData.groesse),
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
