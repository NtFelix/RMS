"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Update function signature to accept id as the first parameter
export async function handleSubmit(id: string | null, formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    const groesseValue = formData.get("groesse");
    let processedGroesse: number | null = null;

    if (typeof groesseValue === 'string' && groesseValue.trim() !== '') {
      const num = parseFloat(groesseValue);
      if (!isNaN(num)) {
        processedGroesse = num;
      }
    } else if (typeof groesseValue === 'number') { // Should not happen with FormData but good for robustness
      processedGroesse = groesseValue;
    }

    if (id) {
      const updatePayload: { [key: string]: any } = {};
      formData.forEach((value, key) => {
        if (key !== 'groesse') {
          updatePayload[key] = value;
        }
      });
      updatePayload['groesse'] = processedGroesse;

      const { error } = await supabase.from("Haeuser").update(updatePayload).eq("id", id);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      const insertData: { [key: string]: any } = {};
      formData.forEach((value, key) => {
        if (key !== 'groesse') {
          insertData[key] = value;
        }
      });
      insertData['groesse'] = processedGroesse;
      // Ensure user_id is set for new houses if not coming from form
      // For example, if auth.uid() should be the default:
      // if (!insertData.user_id) {
      //   const { data: { user } } = await supabase.auth.getUser();
      //   if (user) insertData.user_id = user.id;
      //   else throw new Error("User not authenticated for insert.");
      // }


      const { error } = await supabase.from("Haeuser").insert(insertData);
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
