"use server";

import { createSupabaseServerClient as createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

interface AufgabePayload {
  name: string;
  beschreibung?: string | null; //beschreibung is optional
  ist_erledigt?: boolean;
  // Future fields like status, prioritaet, faelligkeitsdatum can be added here
}

// Interface for the data returned from the database, including all fields
interface AufgabeDbRecord {
  id: string;
  name: string;
  beschreibung?: string | null;
  ist_erledigt: boolean;
  created_at: string; 
  // Add other DB fields if they exist
}

export async function aufgabeServerAction(id: string | null, data: AufgabePayload): Promise<{ success: boolean; error?: any; data?: AufgabeDbRecord }> {
  const supabase = await createClient();

  const payload = {
    name: data.name,
    beschreibung: data.beschreibung || null, // Ensure null if empty string or undefined
    // If creating a new task (id is null) and ist_erledigt is not provided, default to false.
    // If editing, and ist_erledigt is provided, use that value. Otherwise, it won't be updated.
    ist_erledigt: (id === null && typeof data.ist_erledigt === 'undefined') ? false : data.ist_erledigt,
  };

  // If editing and ist_erledigt is not provided in data, remove it from payload to avoid unintended updates
  if (id !== null && typeof data.ist_erledigt === 'undefined') {
    delete (payload as Partial<AufgabePayload>).ist_erledigt;
  }


  // Basic validation
  if (!payload.name || payload.name.trim() === "") {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }

  try {
    let dbResponse;
    if (id) {
      // Update existing record
      dbResponse = await supabase.from("Aufgaben").update(payload).eq("id", id).select().single();
    } else {
      // Create new record
      // Ensure ist_erledigt is explicitly set for new records if not in payload (already handled above)
      const insertPayload = { ...payload, ist_erledigt: payload.ist_erledigt ?? false };
      dbResponse = await supabase.from("Aufgaben").insert(insertPayload).select().single();
    }
    
    if (dbResponse.error) throw dbResponse.error;

    revalidatePath('/todos'); // Revalidate the main tasks page
    // Potentially revalidate other paths if tasks are displayed elsewhere (e.g., dashboard summary)
    // revalidatePath('/'); 

    return { success: true, data: dbResponse.data as AufgabeDbRecord };
  } catch (error: any) {
    console.error("Error in aufgabeServerAction:", error);
    return { success: false, error: { message: error.message || "Ein unbekannter Fehler ist aufgetreten." } };
  }
}

export async function toggleTaskStatusAction(
  taskId: string,
  newStatus: boolean
): Promise<{ success: boolean; task?: any; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        ist_erledigt: newStatus,
        aenderungsdatum: new Date().toISOString(), // Update modification timestamp
      })
      .eq("id", taskId)
      .select() // Optionally select to confirm the update
      .single(); // Ensures one row is affected or an error if not (e.g. PGRST116 for no rows)

    if (error) {
      // This will catch errors like task not found (if .single() is used and it doesn't find the row) 
      // or other database errors.
      console.error("Supabase error in toggleTaskStatusAction:", error);
      return { success: false, error: { message: error.message } };
    }

    // revalidatePath should be called on success
    revalidatePath("/todos");
    // Optionally revalidate other paths where tasks might be displayed
    // revalidatePath("/"); 

    return { success: true, task: data };

  } catch (e: unknown) { // Changed type to unknown for better type safety with instanceof
    console.error("Unexpected error in toggleTaskStatusAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}

export async function deleteTaskAction(taskId: string): Promise<{ success: boolean; taskId?: string; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Aufgaben")
      .delete()
      .eq("id", taskId);

    if (error) {
      // Log the error for server-side visibility
      console.error("Error deleting task from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/todos'); // Revalidate the main tasks page

    return { success: true, taskId };

  } catch (e: unknown) { // Using unknown for better type safety with instanceof
    console.error("Unexpected error in deleteTaskAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}
