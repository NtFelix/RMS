"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Define a more specific type for the payload, excluding id and related entities
interface FinanzInput {
  wohnung_id?: string | null;
  name: string;
  datum?: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string | null;
}

export async function financeServerAction(id: string | null, data: FinanzInput): Promise<{ success: boolean; error?: any; data?: any }> {
  const supabase = await createClient();

  // Ensure betrag is a number and handle potential string input from forms
  const payload = {
    ...data,
    betrag: Number(data.betrag),
    wohnung_id: data.wohnung_id || null,
    datum: data.datum || null,
    notiz: data.notiz || null,
  };

  if (typeof payload.name !== 'string' || payload.name.trim() === '') {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }
  // Ensure betrag is a positive number. Allow 0 for cases like offsetting transactions.
  if (isNaN(payload.betrag)) {
      return { success: false, error: { message: "Betrag muss eine Zahl sein." } };
  }
  if (typeof payload.ist_einnahmen !== 'boolean') {
    return { success: false, error: { message: "Typ (Einnahmen/Ausgaben) ist erforderlich." } };
  }

  try {
    let dbResponse;
    if (id) {
      // Update existing record
      dbResponse = await supabase.from("Finanzen").update(payload).eq("id", id).select().single();
    } else {
      // Create new record
      dbResponse = await supabase.from("Finanzen").insert(payload).select().single();
    }
    
    if (dbResponse.error) throw dbResponse.error;

    revalidatePath("/finanzen");
    return { success: true, data: dbResponse.data };
  } catch (error: any) {
    console.error("Error in financeServerAction:", error);
    return { success: false, error: { message: error.message || "Ein unbekannter Fehler ist aufgetreten." } };
  }
}

export async function deleteFinanceAction(financeId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Finanzen")
      .delete()
      .eq("id", financeId);

    if (error) {
      // Log the error for server-side visibility
      console.error("Error deleting finance entry from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/finanzen'); // Revalidate the main finance page

    return { success: true };

  } catch (e: unknown) { // Using unknown for better type safety with instanceof
    console.error("Unexpected error in deleteFinanceAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}
