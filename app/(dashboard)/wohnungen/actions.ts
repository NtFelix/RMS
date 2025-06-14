"use server";

const APARTMENT_LIMIT = 5;
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching';

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

    const userProfile = await fetchUserProfile();

    if (!userProfile || userProfile.stripe_subscription_status !== 'active') {
      return { error: 'Ein aktives Abonnement ist erforderlich, um Wohnungen hinzuzufügen.' };
    }

    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting apartments:', countError);
      return { error: 'Fehler beim Zählen der Wohnungen.' };
    }

    // const APARTMENT_LIMIT = 5; // Already defined at the top of the file
    if (count !== null && count >= APARTMENT_LIMIT) {
      return { error: 'Maximale Anzahl an Wohnungen für Ihr Abonnement erreicht.' };
    }
    
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
