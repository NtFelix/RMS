"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAction } from '@/lib/logging-middleware';

interface AufgabePayload {
  name: string;
  beschreibung?: string | null;
  ist_erledigt?: boolean;
  faelligkeitsdatum?: string | null;
}

// Interface for the data returned from the database, including all fields
interface AufgabeDbRecord {
  id: string;
  name: string;
  beschreibung?: string | null;
  ist_erledigt: boolean;
  erstellungsdatum: string;
  aenderungsdatum: string;
  faelligkeitsdatum?: string | null;
}

export async function aufgabeServerAction(id: string | null, data: AufgabePayload): Promise<{ success: boolean; error?: any; data?: AufgabeDbRecord }> {
  const actionName = id ? 'updateTask' : 'createTask';
  logAction(actionName, 'start', { task_id: id, task_name: data.name });

  const supabase = await createClient();

  const payload: Record<string, any> = {
    name: data.name,
    beschreibung: data.beschreibung || null,
    ist_erledigt: (id === null && typeof data.ist_erledigt === 'undefined') ? false : data.ist_erledigt,
  };

  // Handle due date - include if provided or explicitly set to null
  if (data.faelligkeitsdatum !== undefined) {
    payload.faelligkeitsdatum = data.faelligkeitsdatum || null;
  }

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
      const insertPayload = { ...payload, ist_erledigt: payload.ist_erledigt ?? false };
      dbResponse = await supabase.from("Aufgaben").insert(insertPayload).select().single();
    }

    if (dbResponse.error) throw dbResponse.error;

    revalidatePath('/todos');
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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

export async function getTasksForCalendarAction(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; tasks?: AufgabeDbRecord[]; error?: { message: string } }> {
  const actionName = 'getTasksForCalendar';
  logAction(actionName, 'start', { start_date: startDate, end_date: endDate });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Aufgaben")
      .select("*")
      .gte("faelligkeitsdatum", startDate)
      .lte("faelligkeitsdatum", endDate)
      .order("faelligkeitsdatum", { ascending: true });

    if (error) {
      logAction(actionName, 'error', { error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    logAction(actionName, 'success', { task_count: data?.length || 0 });
    return { success: true, tasks: data as AufgabeDbRecord[] };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function updateTaskDueDateAction(
  taskId: string,
  dueDate: string | null
): Promise<{ success: boolean; task?: AufgabeDbRecord; error?: { message: string } }> {
  const actionName = 'updateTaskDueDate';
  logAction(actionName, 'start', { task_id: taskId, due_date: dueDate });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        faelligkeitsdatum: dueDate,
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
    logAction(actionName, 'success', { task_id: taskId, due_date: dueDate });
    return { success: true, task: data as AufgabeDbRecord };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { task_id: taskId, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}
