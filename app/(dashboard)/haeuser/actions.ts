"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function handleSubmit(formData: FormData) {
  const supabase = await createClient();
  const values = Object.fromEntries(formData.entries());
  const id = formData.get("id");
  if (id) await supabase.from("Haeuser").update(values).eq("id", id);
  else await supabase.from("Haeuser").insert(values);
  revalidatePath("/haeuser");
}
