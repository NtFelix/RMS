"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Update function signature to accept id as the first parameter
export async function handleSubmit(id: string | null, formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    if (id) {
      // Use the id parameter directly
      const updatePayload: { [key: string]: any } = {};
      formData.forEach((value, key) => {
        // No need to check for 'id' in formData anymore
        updatePayload[key] = value;
      });
      const { error } = await supabase.from("Haeuser").update(updatePayload).eq("id", id);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      // For insert, use formData directly
      // Note: Supabase client insert typically takes an object or array of objects, not FormData directly.
      // Assuming there's a utility or the client handles FormData, or this needs adjustment.
      // For now, proceeding with the assumption that direct FormData insert is intended/handled.
      // If it expects an object, conversion from FormData will be needed.
      const insertData: { [key: string]: any } = {};
      formData.forEach((value, key) => {
        insertData[key] = value;
      });
      const { error } = await supabase.from("Haeuser").insert(insertData); // Adjusted to pass an object
      if (error) {
        return { success: false, error: { message: error.message } };
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
