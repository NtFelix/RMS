"use server";

import { createClient } from "@/utils/supabase/server"; // Using @/ alias which should resolve correctly
import { revalidatePath } from "next/cache";

interface WohnungPayload {
  name: string;
  groesse: string | number; // Can come as string from FormData
  miete: string | number;   // Can come as string from FormData
  haus_id?: string | null;
}

interface WohnungDbRecord {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
  created_at: string;
}

export async function wohnungServerAction(id: string | null, data: WohnungPayload): Promise<{ success: boolean; error?: any; data?: WohnungDbRecord }> {
  console.log("wohnungServerAction: start", { id, data });
  const supabase = await createClient();

  const payload = {
    name: data.name,
    groesse: Number(data.groesse), // Ensure conversion to number
    miete: Number(data.miete),     // Ensure conversion to number
    haus_id: data.haus_id || null,
  };

  // Basic validation
  if (!payload.name || payload.name.trim() === "") {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }
  if (isNaN(payload.groesse) || payload.groesse <= 0) {
    return { success: false, error: { message: "Größe muss eine positive Zahl sein." } };
  }
  if (isNaN(payload.miete) || payload.miete < 0) { // Miete can be 0
    return { success: false, error: { message: "Miete muss eine Zahl sein." } };
  }
  // haus_id is optional for a Wohnung, so we don't strictly require it here.
  // However, the form/modal might enforce it.
  // if (!payload.haus_id) { 
  //   return { success: false, error: { message: "Haus-ID ist erforderlich." } };
  // }

  console.log("wohnungServerAction: payload validated", payload);

  try {
    let dbResponse;
    console.log("wohnungServerAction: before Supabase call", { id, payload });
    if (id) {
      // Update existing record
      dbResponse = await supabase.from("Wohnungen").update(payload).eq("id", id).select().single();
    } else {
      // Create new record
      dbResponse = await supabase.from("Wohnungen").insert(payload).select().single();
    }
    
    console.log("wohnungServerAction: Supabase call successful", dbResponse);
    if (dbResponse.error) throw dbResponse.error;

    revalidatePath('/wohnungen');
    revalidatePath('/'); 
    if (payload.haus_id) {
        revalidatePath(`/haeuser/${payload.haus_id}`);
    }

    console.log("wohnungServerAction: end", { success: true });
    return { success: true, data: dbResponse.data as WohnungDbRecord };
  } catch (error: any) {
    console.error("wohnungServerAction: error caught", error);
    console.error("Error in wohnungServerAction:", error); // Existing log, kept it
    console.log("wohnungServerAction: end", { success: false });
    return { success: false, error: { message: error.message || "Ein unbekannter Fehler ist aufgetreten." } };
  }
}
