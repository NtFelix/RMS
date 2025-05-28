"use server";

import { createClient } from "@/utils/supabase/server"; // Adjusted based on common project structure
import { revalidatePath } from "next/cache";
import { Nebenkosten } from "../lib/data-fetching"; // Adjusted path

// Define an input type for Nebenkosten data
export type NebenkostenFormData = {
  jahr: string;
  nebenkostenart: string[];
  betrag: number[];
  berechnungsart: string[];
  wasserkosten?: number | null;
  haeuser_id: string;
  user_id?: string; // Assuming user_id is set by the client/form
};

// Implement createNebenkosten function
export async function createNebenkosten(formData: NebenkostenFormData) {
  const supabase = await createClient();

  // Ensure array fields are correctly formatted if Supabase expects them as such
  // Supabase client typically handles JS arrays correctly for postgres array types (text[], numeric[])
  const preparedData = {
    ...formData,
    // user_id will be taken from formData; ensure it's populated correctly by the caller
  };

  const { data, error } = await supabase
    .from("Nebenkosten")
    .insert([preparedData])
    .select()
    .single(); // Assuming we want the single created record back

  if (error) {
    console.error("Error creating Nebenkosten:", error);
    return { success: false, message: error.message, data: null };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true, data };
}

// Implement updateNebenkosten function
export async function updateNebenkosten(id: string, formData: Partial<NebenkostenFormData>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("Nebenkosten")
    .update(formData)
    .eq("id", id)
    .select()
    .single(); // Assuming we want the single updated record back

  if (error) {
    console.error("Error updating Nebenkosten:", error);
    return { success: false, message: error.message, data: null };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true, data };
}

// Implement deleteNebenkosten function
export async function deleteNebenkosten(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Nebenkosten")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting Nebenkosten:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true };
}
