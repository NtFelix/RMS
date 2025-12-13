"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { logAction } from '@/lib/logging-middleware';

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
  const actionName = id ? 'updateTask' : 'createTask';
  logAction(actionName, 'start', { task_id: id, task_name: data.name });

  const supabase = await createSupabaseServerClient();

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
    logAction(actionName, 'failed', { task_id: id, error_message: 'Name ist erforderlich.' });
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
    logAction(actionName, 'success', { task_id: dbResponse.data?.id, task_name: data.name });
    return { success: true, data: dbResponse.data as AufgabeDbRecord };
  } catch (error: any) {
    logAction(actionName, 'error', { task_id: id, task_name: data.name, error_message: error.message });
    return { success: false, error: { message: error.message || "Ein unbekannter Fehler ist aufgetreten." } };
  }
}

export async function toggleTaskStatusAction(
  taskId: string,
  newStatus: boolean
): Promise<{ success: boolean; task?: any; error?: { message: string } }> {
  const actionName = 'toggleTaskStatus';
  logAction(actionName, 'start', { task_id: taskId, new_status: newStatus });

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        ist_erledigt: newStatus,
        aenderungsdatum: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      logAction(actionName, 'error', { task_id: taskId, error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    revalidatePath("/todos");
    logAction(actionName, 'success', { task_id: taskId, new_status: newStatus });
    return { success: true, task: data };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { task_id: taskId, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function bulkUpdateTaskStatusesAction(
  taskIds: string[],
  newStatus: boolean
): Promise<{ success: boolean; updatedCount?: number; error?: { message: string } }> {
  const actionName = 'bulkUpdateTaskStatuses';
  logAction(actionName, 'start', { task_count: taskIds.length, new_status: newStatus });

  if (!taskIds || taskIds.length === 0) {
    logAction(actionName, 'failed', { error_message: 'Keine Aufgaben zum Aktualisieren ausgewählt.' });
    return { success: false, error: { message: "Keine Aufgaben zum Aktualisieren ausgewählt." } };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        ist_erledigt: newStatus,
        aenderungsdatum: new Date().toISOString(),
      })
      .in("id", taskIds)
      .select("id");

    if (error) {
      logAction(actionName, 'error', { task_count: taskIds.length, error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    const updatedCount = data?.length || 0;
    revalidatePath("/todos");
    logAction(actionName, 'success', { task_count: taskIds.length, updated_count: updatedCount });
    return { success: true, updatedCount };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.";
    logAction(actionName, 'error', { task_count: taskIds.length, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function bulkDeleteTasksAction(
  taskIds: string[]
): Promise<{ success: boolean; deletedCount?: number; error?: { message: string } }> {
  const actionName = 'bulkDeleteTasks';
  logAction(actionName, 'start', { task_count: taskIds.length });

  if (!taskIds || taskIds.length === 0) {
    logAction(actionName, 'failed', { error_message: 'Keine Aufgaben zum Löschen ausgewählt.' });
    return { success: false, error: { message: "Keine Aufgaben zum Löschen ausgewählt." } };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("Aufgaben")
      .delete()
      .in("id", taskIds);

    if (error) {
      logAction(actionName, 'error', { task_count: taskIds.length, error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    revalidatePath("/todos");
    logAction(actionName, 'success', { task_count: taskIds.length, deleted_count: count || 0 });
    return { success: true, deletedCount: count || 0 };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.";
    logAction(actionName, 'error', { task_count: taskIds.length, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function deleteTaskAction(taskId: string): Promise<{ success: boolean; taskId?: string; error?: { message: string } }> {
  const actionName = 'deleteTask';
  logAction(actionName, 'start', { task_id: taskId });

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("Aufgaben")
      .delete()
      .eq("id", taskId);

    if (error) {
      logAction(actionName, 'error', { task_id: taskId, error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/todos');
    logAction(actionName, 'success', { task_id: taskId });
    return { success: true, taskId };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { task_id: taskId, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

