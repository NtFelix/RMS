"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
    
    const { error } = await supabase.from('Wohnungen').insert({
      name: formData.name,
      groesse: parseFloat(formData.groesse),
      miete: parseFloat(formData.miete),
      haus_id: formData.haus_id || null
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
