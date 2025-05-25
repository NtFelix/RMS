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
