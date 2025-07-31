"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Update function signature to accept id as the first parameter
// Define the expected fields and their types
interface HouseData {
  name: string;
  ort: string;
  strasse?: string | null;
  groesse: number | null;
}

export async function handleSubmit(id: string | null, formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    // Process groesse field
    const groesseValue = formData.get("groesse");
    let processedGroesse: number | null = null;

    if (typeof groesseValue === 'string' && groesseValue.trim() !== '') {
      const num = parseFloat(groesseValue);
      if (!isNaN(num)) {
        processedGroesse = num;
      }
    }

    // Validate required fields
    const name = formData.get('name')?.toString();
    const ort = formData.get('ort')?.toString();

    if (!name || !ort) {
      return { success: false, error: { message: 'Name und Ort sind Pflichtfelder.' } };
    }

    // Explicitly pick only the expected fields
    const houseData: HouseData = {
      name,
      ort,
      strasse: formData.get('strasse')?.toString() || null,
      groesse: processedGroesse,
    };

    if (id) {
      const { error } = await supabase
        .from("Haeuser")
        .update(houseData)
        .eq("id", id);
      
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      const { error: insertError } = await supabase
        .from("Haeuser")
        .insert(houseData);
      
      if (insertError) {
        return { success: false, error: { message: insertError.message } };
      }
    }
    revalidatePath("/haeuser");
    return { success: true };
  } catch (e) {
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function deleteHouseAction(houseId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Haeuser")
      .delete()
      .eq("id", houseId);

    if (error) {
      // Log the error for server-side visibility
      console.error("Error deleting house from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/haeuser'); // Revalidate the main houses page

    return { success: true };

  } catch (e: unknown) { // Using unknown for better type safety with instanceof
    console.error("Unexpected error in deleteHouseAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}

// Added imports for the new action
import { fetchWasserzaehlerModalData, Mieter, Wasserzaehler } from "@/lib/data-fetching";

export async function getWasserzaehlerModalDataAction(nebenkostenId: string): Promise<{ mieterList: Mieter[]; existingReadings: Wasserzaehler[] }> {
  try {
    const data = await fetchWasserzaehlerModalData(nebenkostenId);
    return data;
  } catch (error) {
    console.error("Error in getWasserzaehlerModalDataAction:", error);
    // Return empty data on error, consistent with fetchWasserzaehlerModalData's own error handling for some cases.
    return { mieterList: [], existingReadings: [] };
  }
}
