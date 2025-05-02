"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Update function signature to accept id as the first parameter
export async function handleSubmit(id: string | null, formData: FormData) {
  const supabase = await createClient();

  if (id) {
    // Use the id parameter directly
    const updatePayload: { [key: string]: any } = {};
    formData.forEach((value, key) => {
      // No need to check for 'id' in formData anymore
      updatePayload[key] = value;
    });
    await supabase.from("Haeuser").update(updatePayload).eq("id", id);
  } else {
    // For insert, use formData directly
    await supabase.from("Haeuser").insert(formData);
  }
  revalidatePath("/haeuser");
}
